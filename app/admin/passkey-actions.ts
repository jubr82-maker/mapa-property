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
import { headers } from "next/headers";

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

/** Etape 1 : Turnstile verifie avant de lancer la ceremonie dans le navigateur. */
export async function passkeyLoginStartAction(captchaToken: string): Promise<PasskeyResult> {
  const captcha = await verifyCaptchaIfConfigured(captchaToken, await requestIp());
  if (!captcha.ok) {
    await logAdminAuthEvent({ event: "passkey_login", success: false, reason: captcha.reason });
    return { ok: false, error: "captcha" };
  }
  return { ok: true };
}

/**
 * Etape 3 : session ouverte par la Passkey. Refus et deconnexion hors liste
 * admin. aal2 indique seulement la page suivante a l'interface ; l'acces
 * reel est decide par le proxy et les gardes serveur.
 */
export async function passkeyLoginCompleteAction(): Promise<PasskeyResult<{ aal2: boolean }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await logAdminAuthEvent({ event: "passkey_login", success: false, reason: "no_session" });
    return { ok: false, error: "credentials" };
  }
  if (!isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    await logAdminAuthEvent({ event: "passkey_login", success: false, email: user.email, reason: "not_allowlisted" });
    return { ok: false, error: "credentials" };
  }
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const level = aal?.currentLevel ?? "none";
  await logAdminAuthEvent({ event: "passkey_login", success: true, email: user.email, reason: level });
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
