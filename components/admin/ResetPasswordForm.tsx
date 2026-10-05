"use client";

// Nouveau mot de passe apres le lien e-mail (oct. 2026). Si le compte a un
// second facteur, son code est demande d'abord (session aal2), puis le
// mot de passe (14 caracteres minimum), puis reconnexion complete.
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { resetPasswordAction, type FactorSummary } from "@/app/admin/auth-actions";
import { MfaVerify } from "@/components/admin/MfaPanel";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/admin/security-config";
import { authButtonCls, authErrorCls, authInputCls, authLabelCls, authLinkCls, authOkCls } from "@/components/admin/auth-ui";

export function ResetPasswordForm({ needsMfa, factors }: { needsMfa: boolean; factors: FactorSummary[] }) {
  const t = useTranslations("admin_security");
  const [mfaDone, setMfaDone] = useState(!needsMfa);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!mfaDone) return <MfaVerify factors={factors} onSuccess={() => setMfaDone(true)} />;
  if (done) {
    return (
      <div className="space-y-4">
        <p className={authOkCls}>{t("reset_done")}</p>
        <Link href="/admin/login" className={authLinkCls}>{t("back_to_login")}</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < ADMIN_PASSWORD_MIN_LENGTH) return setError(t("too_short", { min: ADMIN_PASSWORD_MIN_LENGTH }));
    if (password !== confirm) return setError(t("mismatch"));
    setBusy(true);
    const res = await resetPasswordAction({ next: password, confirm });
    setBusy(false);
    if (!res.ok) {
      setError(
        res.error === "too_short"
          ? t("too_short", { min: ADMIN_PASSWORD_MIN_LENGTH })
          : res.error === "mismatch"
            ? t("mismatch")
            : res.error === "invalid_link"
              ? t("reset_invalid_link")
              : t("update_error", { message: res.error }),
      );
      return;
    }
    setDone(true);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="password" className={authLabelCls}>{t("new_password")}</label>
        <input id="password" type="password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} className={authInputCls} />
      </div>
      <div>
        <label htmlFor="confirm" className={authLabelCls}>{t("confirm_password")}</label>
        <input id="confirm" type="password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} className={authInputCls} />
      </div>
      {error && <p role="alert" className={authErrorCls}>{error}</p>}
      <button type="submit" disabled={busy} className={authButtonCls}>
        {busy ? t("submitting") : t("reset_submit")}
      </button>
    </form>
  );
}
