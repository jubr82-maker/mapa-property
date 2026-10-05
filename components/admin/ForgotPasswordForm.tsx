"use client";

// Mot de passe oublie (oct. 2026) : Turnstile + action serveur. Le lien
// n'est envoye qu'aux adresses de la liste admin ; reponse identique dans
// tous les cas (n'indique pas si un compte existe).
import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Turnstile, type TurnstileHandle } from "@/components/ui/Turnstile";
import { forgotPasswordAction } from "@/app/admin/auth-actions";
import { authButtonCls, authErrorCls, authInputCls, authLabelCls, authLinkCls, authOkCls } from "@/components/admin/auth-ui";

export function ForgotPasswordForm() {
  const t = useTranslations("admin_security");
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await forgotPasswordAction({ email, captchaToken });
    setBusy(false);
    if (!res.ok) {
      setError(t("captcha_error"));
      turnstileRef.current?.reset();
      setCaptchaToken("");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <p className={authOkCls}>{t("forgot_sent")}</p>
        <Link href="/admin/login" className={authLinkCls}>{t("back_to_login")}</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className={authLabelCls}>{t("email")}</label>
        <input id="email" type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} className={authInputCls} />
      </div>
      <Turnstile ref={turnstileRef} onToken={setCaptchaToken} />
      {error && <p role="alert" className={authErrorCls}>{error}</p>}
      <button type="submit" disabled={busy} className={authButtonCls}>
        {busy ? t("submitting") : t("forgot_submit")}
      </button>
      <p className="text-center">
        <Link href="/admin/login" className={authLinkCls}>{t("back_to_login")}</Link>
      </p>
    </form>
  );
}
