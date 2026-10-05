"use client";

// Passkeys de l'admin (oct. 2026) : connexion par empreinte ou Face ID et
// gestion des Passkeys enregistrees. Ceremonie WebAuthn par la
// bibliotheque Supabase dans le navigateur, encadree par les actions
// serveur de app/admin/passkey-actions.ts (Turnstile, liste admin, aal2,
// journal).
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase-ssr";
import {
  passkeyDeleteAction,
  passkeyLoginCompleteAction,
  passkeyLoginStartAction,
  passkeyRegisteredAction,
  passkeyRenameAction,
} from "@/app/admin/passkey-actions";
import { ADMIN_MFA_PATH, PASSKEY_NAME_MAX_LENGTH } from "@/lib/admin/security-config";
import { formatDateTimeShort } from "@/lib/datetime";
import { authButtonCls, authErrorCls, authInputCls, authLabelCls, authOkCls } from "@/components/admin/auth-ui";

export type PasskeySummary = { id: string; name: string | null; createdAt: string; lastUsedAt: string | null };

function useWebAuthnSupported(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined");
  }, []);
  return supported;
}

const secondaryBtnCls =
  "w-full rounded-md border border-[#3D4F63] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] transition-colors hover:bg-[#3D4F63]/5 disabled:opacity-50";
const smallBtnCls =
  "rounded border border-[#3D4F63]/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:bg-[#3D4F63]/5 disabled:opacity-40";
const dangerBtnCls =
  "rounded border border-red-300 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:opacity-40";

// ---------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------

/**
 * Bouton de connexion par Passkey. Utilise le jeton Turnstile du formulaire
 * de connexion (onCaptchaUsed le reinitialise : un jeton ne sert qu'une fois).
 */
export function PasskeyLoginButton({
  captchaToken,
  onCaptchaUsed,
  redirectTo,
}: {
  captchaToken: string;
  onCaptchaUsed: () => void;
  redirectTo: string;
}) {
  const t = useTranslations("admin_security");
  const router = useRouter();
  const supported = useWebAuthnSupported();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supported) return null;

  const start = async () => {
    setError(null);
    if (!captchaToken) return setError(t("captcha_error"));
    setBusy(true);
    const pre = await passkeyLoginStartAction(captchaToken);
    onCaptchaUsed();
    if (!pre.ok) {
      setBusy(false);
      return setError(t("captcha_error"));
    }
    const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPasskey();
    if (signInError) {
      setBusy(false);
      return setError(t("passkey_login_error"));
    }
    const done = await passkeyLoginCompleteAction();
    setBusy(false);
    if (!done.ok) return setError(t("login_error"));
    // Indication pour l'interface seulement : le proxy renvoie de toute facon
    // vers le code a 6 chiffres si la session n'est pas aal2.
    router.replace(done.aal2 ? redirectTo : `${ADMIN_MFA_PATH}?from=${encodeURIComponent(redirectTo)}`);
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#3D4F63]/60">{t("passkey_or")}</p>
      <button type="button" onClick={start} disabled={busy} className={secondaryBtnCls}>
        {busy ? t("submitting") : t("passkey_login")}
      </button>
      {error && <p role="alert" className={authErrorCls}>{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gestion (page Securite, session aal2)
// ---------------------------------------------------------------------------

export function PasskeysCard({ passkeys, available }: { passkeys: PasskeySummary[]; available: boolean }) {
  const t = useTranslations("admin_security");
  const router = useRouter();
  const supported = useWebAuthnSupported();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy("register");
    const { data, error } = await createSupabaseBrowserClient().auth.registerPasskey();
    if (error || !data) {
      setBusy(null);
      return setMsg({ ok: false, text: t("passkey_add_error") });
    }
    const res = await passkeyRegisteredAction(data.id, name);
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: t("passkey_add_error") });
    setName("");
    setMsg({ ok: true, text: t("passkey_added") });
    router.refresh();
  };

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setMsg(null);
    setBusy(editing.id);
    const res = await passkeyRenameAction(editing.id, editing.name);
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: t("update_error", { message: res.error }) });
    setEditing(null);
    setMsg({ ok: true, text: t("passkey_renamed") });
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("passkey_remove_confirm"))) return;
    setMsg(null);
    setBusy(id);
    const res = await passkeyDeleteAction(id);
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: t("update_error", { message: res.error }) });
    setMsg({ ok: true, text: t("passkey_removed") });
    router.refresh();
  };

  return (
    <section className="max-w-xl rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="font-display text-xl font-bold text-[#3D4F63]">{t("passkeys_section")}</h2>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-[#3D4F63]/80">{t("passkeys_intro")}</p>
        {!available ? (
          <p className="text-sm text-[#3D4F63]/70">{t("passkey_unavailable")}</p>
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
              {t("passkeys_count", { count: passkeys.length })}
            </p>
            {passkeys.length > 0 && (
              <ul className="divide-y divide-[#3D4F63]/10 rounded-md border border-[#3D4F63]/15">
                {passkeys.map((p) => (
                  <li key={p.id} className="space-y-2 px-3 py-2 text-sm">
                    {editing?.id === p.id ? (
                      <form onSubmit={rename} className="flex flex-wrap items-center gap-2">
                        <label htmlFor={`pk-${p.id}`} className="sr-only">{t("passkey_name_label")}</label>
                        <input id={`pk-${p.id}`} value={editing.name} maxLength={PASSKEY_NAME_MAX_LENGTH} required
                          onChange={(e) => setEditing({ id: p.id, name: e.target.value })}
                          className="min-w-0 flex-1 rounded-md border border-[#3D4F63]/30 px-2 py-1 text-sm" />
                        <button type="submit" disabled={busy === p.id} className={smallBtnCls}>{t("passkey_rename_save")}</button>
                        <button type="button" onClick={() => setEditing(null)} className={smallBtnCls}>{t("passkey_rename_cancel")}</button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p>{p.name ?? t("passkey_unnamed")}</p>
                          <p className="text-xs text-[#3D4F63]/60">
                            {t("passkey_created", { date: formatDateTimeShort(p.createdAt) })}
                            {p.lastUsedAt ? ` · ${t("passkey_last_used", { date: formatDateTimeShort(p.lastUsedAt) })}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditing({ id: p.id, name: p.name ?? "" })} disabled={busy !== null} className={smallBtnCls}>
                            {t("passkey_rename")}
                          </button>
                          <button type="button" onClick={() => remove(p.id)} disabled={busy !== null} className={dangerBtnCls}>
                            {t("passkey_remove")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {supported ? (
              <form onSubmit={register} className="space-y-3">
                <div>
                  <label htmlFor="passkey-name" className={authLabelCls}>{t("passkey_name_label")}</label>
                  <input id="passkey-name" value={name} maxLength={PASSKEY_NAME_MAX_LENGTH} required
                    placeholder={t("passkey_name_placeholder")}
                    onChange={(e) => setName(e.target.value)} className={authInputCls} />
                </div>
                <button type="submit" disabled={busy !== null} className={authButtonCls}>
                  {busy === "register" ? t("submitting") : t("passkey_add")}
                </button>
              </form>
            ) : (
              <p className="text-sm text-[#3D4F63]/70">{t("passkey_browser_unsupported")}</p>
            )}
          </>
        )}
        {msg && <p role="status" className={msg.ok ? authOkCls : authErrorCls}>{msg.text}</p>}
      </div>
    </section>
  );
}
