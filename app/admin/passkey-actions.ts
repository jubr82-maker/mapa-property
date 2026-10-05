"use server";

// Passkeys de l'admin (oct. 2026). La ceremonie WebAuthn se deroule dans le
// navigateur (supabase.auth.signInWithPasskey / registerPasskey) ; ces
// actions l'encadrent cote serveur :
//  - avant la connexion : Turnstile ;
//  - apres la connexion : compte de la liste admin, sinon deconnexion,
//    puis journal. Le niveau d'assurance n'est JAMAIS decide ici : il est
//    lu dans le jeton emis par Supabase, valide par getUser(). Si Supabase
//    attribue aal1 a la session, le proxy exige ensuite le code a 6
//    chiffres (lib/admin/admin-access.ts) ;
//  - gestion (nom, journal d'ajout, suppression) : session admin aal2.

import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { isAdminEmail } from "@/lib/admin/admin-emails";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { logAdminAuthEvent } from "@/lib/admin/auth-log";
import { PASSKEY_ID_PATTERN, PASSKEY_NAME_MAX_LENGTH } from "@/lib/admin/security-config";
import { verifyCaptchaIfConfigured } from "@/lib/security/captcha";
import { maybeAlertLoginBurst, sendAdminAlert } from "@/lib/pilotage/alerts";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { rateLimit } from "@/lib/rate-limit";
import {
  PASSKEY_ATTEMPT_COOKIE,
  PASSKEY_ATTEMPT_MAX_AGE_SECONDS,
  PASSKEY_CLIENT_STEPS,
  type PasskeyClientStep,
} from "@/lib/admin/security-config";

export type PasskeyResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function requestIp(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
}

function cleanName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const v = name.trim().slice(0, PASSKEY_NAME_MAX_LENGTH);
  return v.length > 0 ? v : null;
}

function validId(id: unknown): id is string {
  return typeof id === "string" && PASSKEY_ID_PATTERN.test(id);
}

// ---------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------

// Parcours journalise pas a pas (oct. 2026) dans admin_auth_log :
//   passkey_step : debut et reussite de chaque etape (n'entre pas dans les
//                  compteurs de connexions) ;
//   passkey_login : resultat final, reussi ou echoue avec sa raison.
// Les etapes qui se deroulent dans le navigateur (ceremonie WebAuthn,
// delai depasse, erreur inattendue) sont rapportees par
// passkeyLoginReportAction, acceptee seulement pendant une tentative
// ouverte par l'etape 1 (cookie httpOnly de 5 minutes) et a debit limite.

async function openAttempt(): Promise<void> {
  const jar = await cookies();
  jar.set(PASSKEY_ATTEMPT_COOKIE, `${randomUUID()}.${Date.now()}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: PASSKEY_ATTEMPT_MAX_AGE_SECONDS,
  });
}

async function attemptIsOpen(): Promise<boolean> {
  const value = (await cookies()).get(PASSKEY_ATTEMPT_COOKIE)?.value ?? "";
  const ts = Number(value.split(".")[1] ?? 0);
  return ts > 0 && Date.now() - ts < PASSKEY_ATTEMPT_MAX_AGE_SECONDS * 1000;
}

async function closeAttempt(): Promise<void> {
  (await cookies()).delete({ name: PASSKEY_ATTEMPT_COOKIE, path: "/admin" });
}

/** Etape 1 : Turnstile verifie avant de lancer la ceremonie dans le navigateur. */
export async function passkeyLoginStartAction(captchaToken: string): Promise<PasskeyResult> {
  await logAdminAuthEvent({ event: "passkey_step", success: true, reason: "turnstile:start" });
  const captcha = await verifyCaptchaIfConfigured(captchaToken, await requestIp());
  if (!captcha.ok) {
    await logAdminAuthEvent({ event: "passkey_login", success: false, reason: `turnstile:${captcha.reason ?? "refused"}` });
    return { ok: false, error: "captcha" };
  }
  await openAttempt();
  await logAdminAuthEvent({ event: "passkey_step", success: true, reason: `turnstile:ok${captcha.reason ? `:${captcha.reason}` : ""}` });
  return { ok: true };
}

/**
 * Etape rapportee par le navigateur (ceremonie WebAuthn et incidents).
 * N'ouvre et ne valide rien : simple ecriture au journal.
 */
export async function passkeyLoginReportAction(step: PasskeyClientStep, detail?: string): Promise<PasskeyResult> {
  if (!PASSKEY_CLIENT_STEPS.includes(step)) return { ok: false, error: "invalid" };
  if (!(await attemptIsOpen())) return { ok: false, error: "no_attempt" };
  const ip = (await requestIp()) ?? "unknown";
  const limited = rateLimit(new Request("http://internal/passkey-report", { headers: { "x-forwarded-for": ip } }), {
    windowMs: 10 * 60_000,
    max: 30,
    namespace: "passkey-report",
  });
  if (!limited.ok) return { ok: false, error: "rate_limited" };
  const clean = typeof detail === "string" ? detail.replace(/[^\w .:/-]/g, "").slice(0, 120) : "";
  const reason = clean ? `${step}:${clean}` : step;
  const failure = step.endsWith("_error") || step.endsWith("_timeout");
  // Un echec du navigateur termine la tentative : il compte comme une
  // connexion par Passkey echouee (alertes et resume).
  await logAdminAuthEvent({ event: failure ? "passkey_login" : "passkey_step", success: !failure, reason });
  if (failure) {
    await closeAttempt();
    await maybeAlertLoginBurst();
  }
  return { ok: true };
}

/**
 * Etape 3 : session ouverte par la Passkey. Refus et deconnexion hors liste
 * admin. aal2 indique seulement la page suivante a l'interface ; l'acces
 * reel est decide par le proxy et les gardes serveur.
 */
export async function passkeyLoginCompleteAction(): Promise<PasskeyResult<{ aal2: boolean }>> {
  await logAdminAuthEvent({ event: "passkey_step", success: true, reason: "complete:start" });
  await closeAttempt();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user) {
    // Session absente des cookies lus par le serveur.
    await logAdminAuthEvent({ event: "passkey_login", success: false, reason: `complete:no_session${userError?.code ? `:${userError.code}` : ""}` });
    return { ok: false, error: "no_session" };
  }
  if (!isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    await logAdminAuthEvent({ event: "passkey_login", success: false, email: user.email, reason: "complete:not_allowlisted" });
    await maybeAlertLoginBurst();
    return { ok: false, error: "credentials" };
  }
  // Niveau lu dans le jeton valide par Supabase, jamais fabrique.
  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    await logAdminAuthEvent({ event: "passkey_login", success: false, email: user.email, reason: `complete:aal_error:${aalError.code ?? "unknown"}` });
    return { ok: false, error: "aal" };
  }
  const level = aal?.currentLevel ?? "none";
  await logAdminAuthEvent({ event: "passkey_login", success: true, email: user.email, reason: `complete:${level}` });
  return { ok: true, aal2: level === "aal2" };
}

// ---------------------------------------------------------------------------
// Gestion (session admin aal2)
// ---------------------------------------------------------------------------

/**
 * Apres registerPasskey() dans le navigateur : la Passkey doit exister sur
 * le compte (verifie ici, jamais sur la seule parole du client), puis elle
 * est nommee et l'ajout est journalise.
 */
export async function passkeyRegisteredAction(passkeyId: string, name: string): Promise<PasskeyResult> {
  const { supabase, user } = await assertAdminAction();
  if (!validId(passkeyId)) return { ok: false, error: "invalid" };
  const { data: list, error: listErr } = await supabase.auth.passkey.list();
  if (listErr || !list?.some((p) => p.id === passkeyId)) {
    await logAdminAuthEvent({ event: "passkey_add", success: false, email: user.email, reason: listErr?.code ?? "not_found" });
    return { ok: false, error: "not_found" };
  }
  const friendlyName = cleanName(name);
  if (friendlyName) await supabase.auth.passkey.update({ passkeyId, friendlyName });
  await logAdminAuthEvent({ event: "passkey_add", success: true, email: user.email, reason: friendlyName });
  await sendAdminAlert("passkey_added", { account: user.email, device: friendlyName });
  return { ok: true };
}

export async function passkeyRenameAction(passkeyId: string, name: string): Promise<PasskeyResult> {
  const { supabase, user } = await assertAdminAction();
  const friendlyName = cleanName(name);
  if (!validId(passkeyId) || !friendlyName) return { ok: false, error: "invalid" };
  const { error } = await supabase.auth.passkey.update({ passkeyId, friendlyName });
  await logAdminAuthEvent({ event: "passkey_rename", success: !error, email: user.email, reason: error?.code ?? friendlyName });
  return error ? { ok: false, error: error.code ?? "update" } : { ok: true };
}

export async function passkeyDeleteAction(passkeyId: string): Promise<PasskeyResult> {
  const { supabase, user } = await assertAdminAction();
  if (!validId(passkeyId)) return { ok: false, error: "invalid" };
  const { error } = await supabase.auth.passkey.delete({ passkeyId });
  await logAdminAuthEvent({ event: "passkey_remove", success: !error, email: user.email, reason: error?.code });
  return error ? { ok: false, error: error.code ?? "delete" } : { ok: true };
}
