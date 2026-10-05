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
  passkeyLoginReportAction,
  passkeyLoginStartAction,
  passkeyRegisteredAction,
  passkeyRenameAction,
} from "@/app/admin/passkey-actions";
import {
  ADMIN_MFA_PATH,
  PASSKEY_CEREMONY_TIMEOUT_MS,
  PASSKEY_NAME_MAX_LENGTH,
  PASSKEY_REPORT_TIMEOUT_MS,
  PASSKEY_SERVER_STEP_TIMEOUT_MS,
  type PasskeyClientStep,
} from "@/lib/admin/security-config";
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

class StepTimeoutError extends Error {
  constructor(readonly step: string) {
    super(`timeout:${step}`);
  }
}

/** Rejette si `promise` ne se resout pas dans le delai (aucune attente infinie). */
function withTimeout<T>(promise: Promise<T>, ms: number, step: string, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      onTimeout?.();
      reject(new StepTimeoutError(step));
    }, ms);
    promise.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function errorDetail(e: unknown): string {
  if (e instanceof StepTimeoutError) return e.step;
  const err = e as { name?: string; code?: string; message?: string } | null;
  return [err?.name, err?.code].filter(Boolean).join(":") || "unknown";
}

/** Journal d'une etape du navigateur : jamais bloquant, jamais silencieux. */
async function report(step: PasskeyClientStep, detail?: string): Promise<void> {
  try {
    const res = await withTimeout(passkeyLoginReportAction(step, detail), PASSKEY_REPORT_TIMEOUT_MS, "report");
    if (!res.ok) console.warn("[passkey] journal refuse", step, res.error);
  } catch (e) {
    console.warn("[passkey] journal indisponible", step, errorDetail(e));
  }
}

type Phase = "idle" | "turnstile" | "ceremony" | "complete" | "redirect";

/**
 * Bouton de connexion par Passkey. Utilise le jeton Turnstile du formulaire
 * de connexion (onCaptchaUsed le reinitialise : un jeton ne sert qu'une fois).
 *
 * Oct. 2026 : parcours incapable de rester bloque. Chaque etape a un delai
 * maximal, toute erreur est affichee (avec proposition de connexion par mot
 * de passe et code), ecrite dans la console et journalisee cote serveur.
 * La securite ne change pas : le niveau aal2 est lu par le serveur dans le
 * jeton valide par Supabase, et le proxy exige le code a 6 chiffres sinon.
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
  const supported = useWebAuthnSupported();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!supported) return null;
  const busy = phase !== "idle";

  const fail = (message: string, e?: unknown) => {
    if (e !== undefined) console.error("[passkey] connexion interrompue", errorDetail(e), e);
    setPhase("idle");
    setError(message);
  };

  const start = async () => {
    setError(null);
    if (!captchaToken) return setError(t("captcha_error"));

    // 1. Turnstile (serveur).
    setPhase("turnstile");
    let pre;
    try {
      pre = await withTimeout(passkeyLoginStartAction(captchaToken), PASSKEY_SERVER_STEP_TIMEOUT_MS, "turnstile");
    } catch (e) {
      await report(e instanceof StepTimeoutError ? "turnstile_timeout" : "turnstile_error", errorDetail(e));
      return fail(t("passkey_step_failed", { step: t("passkey_phase_turnstile") }), e);
    } finally {
      onCaptchaUsed();
    }
    if (!pre.ok) return fail(t("captcha_error"));

    // 2. Ceremonie WebAuthn et ouverture de la session (navigateur).
    setPhase("ceremony");
    await report("ceremony:start");
    const abort = new AbortController();
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPasskey({ options: { signal: abort.signal } }),
        PASSKEY_CEREMONY_TIMEOUT_MS,
        "ceremony",
        () => abort.abort(),
      );
      if (signInError) {
        await report("ceremony_error", [signInError.name, signInError.code].filter(Boolean).join(":"));
        return fail(t("passkey_login_error"), signInError);
      }
    } catch (e) {
      await report(e instanceof StepTimeoutError ? "ceremony_timeout" : "ceremony_error", errorDetail(e));
      return fail(t("passkey_step_failed", { step: t("passkey_phase_ceremony") }), e);
    }
    await report("ceremony:ok");

    // 3. Controle serveur : session lue dans les cookies, liste admin, aal.
    setPhase("complete");
    let done;
    try {
      done = await withTimeout(passkeyLoginCompleteAction(), PASSKEY_SERVER_STEP_TIMEOUT_MS, "complete");
    } catch (e) {
      await report(e instanceof StepTimeoutError ? "complete_timeout" : "complete_error", errorDetail(e));
      await supabase.auth.signOut({ scope: "local" }).catch((err) => console.warn("[passkey] deconnexion locale", err));
      return fail(t("passkey_step_failed", { step: t("passkey_phase_complete") }), e);
    }
    if (!done.ok) {
      await supabase.auth.signOut({ scope: "local" }).catch((err) => console.warn("[passkey] deconnexion locale", err));
      return fail(done.error === "no_session" ? t("passkey_no_session") : t("login_error"));
    }

    // 4. Chargement complet de la page suivante : le proxy relit la session
    //    dans les cookies et impose le code a 6 chiffres si elle est en aal1.
    setPhase("redirect");
    window.location.assign(done.aal2 ? redirectTo : `${ADMIN_MFA_PATH}?from=${encodeURIComponent(redirectTo)}`);
  };

  const label =
    phase === "turnstile"
      ? t("passkey_phase_turnstile")
      : phase === "ceremony"
        ? t("passkey_phase_ceremony")
        : phase === "complete" || phase === "redirect"
          ? t("passkey_phase_complete")
          : t("passkey_login");

  return (
    <div className="space-y-2">
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#3D4F63]/60">{t("passkey_or")}</p>
      <button type="button" onClick={start} disabled={busy} className={secondaryBtnCls} aria-busy={busy}>
        {label}
      </button>
      {error && (
        <div role="alert" className={authErrorCls}>
          <p>{error}</p>
          <p className="mt-1">{t("passkey_use_password")}</p>
        </div>
      )}
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
    let res;
    try {
      const { data, error } = await withTimeout(
        createSupabaseBrowserClient().auth.registerPasskey(),
        PASSKEY_CEREMONY_TIMEOUT_MS,
        "register",
      );
      if (error || !data) {
        if (error) console.error("[passkey] enregistrement refuse", errorDetail(error));
        setBusy(null);
        return setMsg({ ok: false, text: t("passkey_add_error") });
      }
      res = await withTimeout(passkeyRegisteredAction(data.id, name), PASSKEY_SERVER_STEP_TIMEOUT_MS, "register_save");
    } catch (e) {
      console.error("[passkey] enregistrement interrompu", errorDetail(e), e);
      setBusy(null);
      return setMsg({ ok: false, text: t("passkey_add_error") });
    }
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
