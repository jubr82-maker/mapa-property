"use server";

// Actions d'authentification de l'admin (oct. 2026). Tout passe par le
// serveur : verification Turnstile, journal des connexions (sans jamais de
// mot de passe ni de code), messages d'erreur generiques (n'indiquent pas si
// un compte existe), et controle du niveau d'assurance (aal) de la session.

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { isAdminEmail } from "@/lib/admin/admin-emails";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { logAdminAuthEvent } from "@/lib/admin/auth-log";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/admin/security-config";
import { verifyTurnstile } from "@/lib/turnstile";

export type AuthResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type FactorSummary = { id: string; name: string | null; status: string };

async function requestIp(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";
}

/**
 * Turnstile exige seulement si les DEUX cles sont configurees : sans cela,
 * verifyTurnstile refuse tout en production et l'admin serait inaccessible.
 */
async function captchaOk(token: string): Promise<{ ok: boolean; reason?: string }> {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() && process.env.TURNSTILE_SECRET_KEY?.trim(),
  );
  if (!configured) return { ok: true, reason: "captcha_not_configured" };
  return { ok: await verifyTurnstile(token, await requestIp()), reason: "captcha" };
}

async function verifiedTotpFactors(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.totp ?? []).filter((f) => f.status === "verified");
}

// ---------------------------------------------------------------------------
// Connexion (etape 1 : mot de passe). L'etape 2 (second facteur) se fait sur
// /admin/mfa : sans elle, aucune page ni route admin n'est accessible.
// ---------------------------------------------------------------------------
export async function loginAction(input: {
  email: string;
  password: string;
  captchaToken: string;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const captcha = await captchaOk(input.captchaToken);
  if (!captcha.ok) {
    await logAdminAuthEvent({ event: "login", success: false, email, reason: captcha.reason });
    return { ok: false, error: "captcha" };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error || !data.user) {
    await logAdminAuthEvent({ event: "login", success: false, email, reason: error?.code ?? "unknown" });
    return { ok: false, error: "credentials" };
  }
  if (!isAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    await logAdminAuthEvent({ event: "login", success: false, email, reason: "not_allowlisted" });
    return { ok: false, error: "credentials" };
  }
  await logAdminAuthEvent({ event: "login", success: true, email, reason: captcha.reason === "captcha_not_configured" ? captcha.reason : null });
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  await logAdminAuthEvent({ event: "logout", success: true, email: user?.email });
}

// ---------------------------------------------------------------------------
// Second facteur : etat, verification a la connexion, inscription.
// ---------------------------------------------------------------------------
export async function mfaStatusAction(): Promise<AuthResult<{ aal2: boolean; factors: FactorSummary[] }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, error: "forbidden" };
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data } = await supabase.auth.mfa.listFactors();
  const factors = (data?.totp ?? []).map((f) => ({
    id: f.id,
    name: f.friendly_name ?? null,
    status: f.status,
  }));
  return { ok: true, aal2: aal?.currentLevel === "aal2", factors };
}

async function challengeAndVerify(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  factorId: string,
  code: string,
) {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return { error: "code" as const };
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) return { error: "challenge" as const };
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: clean,
  });
  if (verify.error) return { error: "code" as const };
  return { error: null };
}

/** Verification a la connexion : session aal1 -> aal2. */
export async function mfaVerifyAction(factorId: string, code: string): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, error: "forbidden" };
  const { error } = await challengeAndVerify(supabase, factorId, code);
  await logAdminAuthEvent({ event: "mfa", success: !error, email: user.email, reason: error });
  return error ? { ok: false, error } : { ok: true };
}

/**
 * Debut d'inscription d'un appareil. Autorise :
 *  - en aal1 UNIQUEMENT si le compte n'a encore aucun facteur verifie
 *    (premiere inscription, sinon Julien serait bloque dehors) ;
 *  - en aal2 pour ajouter un appareil de secours.
 * Le QR code est fourni par Supabase (image SVG en data URL) : le secret ne
 * transite par aucun service tiers.
 */
export async function enrollStartAction(
  friendlyName: string,
): Promise<AuthResult<{ factorId: string; qrCode: string; secret: string }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, error: "forbidden" };
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const verified = await verifiedTotpFactors(supabase);
  if (verified.length > 0 && aal?.currentLevel !== "aal2") return { ok: false, error: "mfa_required" };

  // Nettoyage des inscriptions commencees et jamais confirmees.
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.all ?? []) {
    if (f.factor_type === "totp" && f.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
  const name = friendlyName.trim().slice(0, 60) || `${user.email} ${new Date().toISOString().slice(0, 10)}`;
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: name,
    issuer: "MAPA Property Admin",
  });
  if (error || !data) return { ok: false, error: error?.message ?? "enroll" };
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function enrollConfirmAction(factorId: string, code: string): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, error: "forbidden" };
  const { error } = await challengeAndVerify(supabase, factorId, code);
  await logAdminAuthEvent({ event: "factor_add", success: !error, email: user.email, reason: error });
  return error ? { ok: false, error } : { ok: true };
}

/** Retrait d'un appareil : session aal2 et jamais le dernier appareil. */
export async function unenrollAction(factorId: string): Promise<AuthResult> {
  const { supabase, user } = await assertAdminAction();
  const verified = await verifiedTotpFactors(supabase);
  if (verified.length <= 1 && verified.some((f) => f.id === factorId)) {
    return { ok: false, error: "last_factor" };
  }
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  await logAdminAuthEvent({ event: "factor_remove", success: !error, email: user.email, reason: error?.code });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Mots de passe
// ---------------------------------------------------------------------------
function checkNewPassword(next: string, confirm: string): string | null {
  if (next.length < ADMIN_PASSWORD_MIN_LENGTH) return "too_short";
  if (next !== confirm) return "mismatch";
  return null;
}

/**
 * Changement de mot de passe depuis l'admin : session aal2 ET ancien mot de
 * passe verifie ici, par une connexion de controle sur un client sans
 * persistance (independant du reglage Supabase "mot de passe actuel").
 */
export async function changePasswordAction(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<AuthResult> {
  const { supabase, user } = await assertAdminAction();
  const invalid = checkNewPassword(input.next, input.confirm);
  if (invalid) return { ok: false, error: invalid };
  const checker = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: currentErr } = await checker.auth.signInWithPassword({
    email: user.email ?? "",
    password: input.current,
  });
  if (currentErr) {
    await logAdminAuthEvent({ event: "password_change", success: false, email: user.email, reason: "wrong_current" });
    return { ok: false, error: "wrong_current" };
  }
  await checker.auth.signOut({ scope: "local" });
  // current_password : exige par Supabase si son reglage "mot de passe
  // actuel requis" est active ; sans effet sinon.
  const { error } = await supabase.auth.updateUser({ password: input.next, current_password: input.current });
  await logAdminAuthEvent({ event: "password_change", success: !error, email: user.email, reason: error?.code });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Mot de passe oublie : Turnstile, puis envoi du lien UNIQUEMENT pour une
 * adresse de la liste admin. Reponse identique dans tous les cas.
 */
export async function forgotPasswordAction(input: { email: string; captchaToken: string }): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const captcha = await captchaOk(input.captchaToken);
  if (!captcha.ok) {
    await logAdminAuthEvent({ event: "reset_request", success: false, email, reason: captcha.reason });
    return { ok: false, error: "captcha" };
  }
  if (isAdminEmail(email)) {
    const supabase = await createSupabaseServerClient();
    const origin = await requestOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/admin/auth/callback?next=/admin/reset-password`,
    });
    await logAdminAuthEvent({ event: "reset_request", success: !error, email, reason: error?.code });
  } else {
    await logAdminAuthEvent({ event: "reset_request", success: false, email, reason: "not_allowlisted" });
  }
  return { ok: true };
}

/**
 * Nouveau mot de passe apres le lien de reinitialisation. Si le compte a un
 * second facteur, il doit etre verifie d'abord (session aal2), sinon un vol
 * de boite mail suffirait a prendre le compte.
 */
export async function resetPasswordAction(input: { next: string; confirm: string }): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, error: "invalid_link" };
  const invalid = checkNewPassword(input.next, input.confirm);
  if (invalid) return { ok: false, error: invalid };
  const verified = await verifiedTotpFactors(supabase);
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (verified.length > 0 && aal?.currentLevel !== "aal2") return { ok: false, error: "mfa_required" };
  const { error } = await supabase.auth.updateUser({ password: input.next });
  await logAdminAuthEvent({ event: "password_reset", success: !error, email: user.email, reason: error?.code });
  if (error) return { ok: false, error: error.message };
  // Reconnexion complete (mot de passe + second facteur) exigee ensuite.
  await supabase.auth.signOut();
  return { ok: true };
}
