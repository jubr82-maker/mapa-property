"use client";

// Connexion admin, etape 1 (oct. 2026) : e-mail + mot de passe + Turnstile,
// verifies cote serveur (loginAction, journalise). L'etape 2, second facteur
// obligatoire, se fait sur /admin/mfa (inscription ou verification).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Turnstile, type TurnstileHandle } from "@/components/ui/Turnstile";
import { loginAction } from "@/app/admin/auth-actions";
import { ADMIN_IDLE_TIMEOUT_MINUTES, ADMIN_MFA_PATH, safeAdminRedirect } from "@/lib/admin/security-config";
import { authButtonCls, authErrorCls, authInputCls, authLabelCls, authLinkCls, authOkCls } from "@/components/admin/auth-ui";

export function AdminLoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ from?: string; error?: string; reason?: string }>;
}) {
  const searchParams = use(searchParamsPromise);
  const t = useTranslations("admin_security");
  const router = useRouter();
  const from = safeAdminRedirect(searchParams.from);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await loginAction({ email, password, captchaToken });
    setBusy(false);
    if (!res.ok) {
      setError(res.error === "captcha" ? t("captcha_error") : t("login_error"));
      setPassword("");
      turnstileRef.current?.reset();
      setCaptchaToken("");
      return;
    }
    router.replace(`${ADMIN_MFA_PATH}?from=${encodeURIComponent(from)}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {searchParams.reason === "idle" && (
        <p className={authOkCls}>{t("idle_notice", { minutes: ADMIN_IDLE_TIMEOUT_MINUTES })}</p>
      )}
      <div>
        <label htmlFor="email" className={authLabelCls}>{t("email")}</label>
        <input id="email" type="email" required autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)} className={authInputCls} />
      </div>
      <div>
        <label htmlFor="password" className={authLabelCls}>{t("password")}</label>
        <input id="password" type="password" required autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} className={authInputCls} />
      </div>
      <Turnstile ref={turnstileRef} onToken={setCaptchaToken} />
      {error && <p role="alert" className={authErrorCls}>{error}</p>}
      <button type="submit" disabled={busy} className={authButtonCls}>
        {busy ? t("submitting") : t("login_submit")}
      </button>
      <p className="text-center">
        <Link href="/admin/forgot-password" className={authLinkCls}>{t("forgot_link")}</Link>
      </p>
    </form>
  );
}
