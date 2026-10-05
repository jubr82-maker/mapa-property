"use client";

// Second facteur TOTP (oct. 2026), trois usages :
//  - "verify" : code a la connexion (session aal1 -> aal2) ;
//  - "enroll" : premiere inscription (QR code fourni par Supabase, jamais
//               envoye a un service tiers) ou ajout d'un appareil de secours.
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  enrollConfirmAction,
  enrollStartAction,
  mfaVerifyAction,
  type FactorSummary,
} from "@/app/admin/auth-actions";
import { authButtonCls, authErrorCls, authInputCls, authLabelCls, authOkCls } from "@/components/admin/auth-ui";

function CodeInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <input
      id={id}
      name="one-time-code"
      type="text"
      inputMode="numeric"
      // Remplissage automatique des codes de verification de l'iPhone.
      autoComplete="one-time-code"
      pattern="[0-9 ]{6,7}"
      maxLength={7}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${authInputCls} text-center font-mono text-lg tracking-[0.4em]`}
    />
  );
}

export function MfaVerify({ factors, onSuccess }: { factors: FactorSummary[]; onSuccess: () => void }) {
  const t = useTranslations("admin_security");
  const verified = factors.filter((f) => f.status === "verified");
  const [factorId, setFactorId] = useState(verified[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await mfaVerifyAction(factorId, code);
    setBusy(false);
    if (!res.ok) {
      setError(t("mfa_error"));
      setCode("");
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-[#3D4F63]/80">{t("mfa_hint")}</p>
      {verified.length > 1 && (
        <div>
          <label htmlFor="mfa-factor" className={authLabelCls}>{t("mfa_factor_label")}</label>
          <select id="mfa-factor" value={factorId} onChange={(e) => setFactorId(e.target.value)} className={authInputCls}>
            {verified.map((f) => (
              <option key={f.id} value={f.id}>{f.name ?? f.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="mfa-code" className={authLabelCls}>{t("mfa_code")}</label>
        <CodeInput id="mfa-code" value={code} onChange={setCode} />
      </div>
      {error && <p role="alert" className={authErrorCls}>{error}</p>}
      <button type="submit" disabled={busy || !factorId} className={authButtonCls}>
        {busy ? t("submitting") : t("mfa_submit")}
      </button>
    </form>
  );
}

export function MfaEnroll({ defaultName, onSuccess }: { defaultName: string; onSuccess: () => void }) {
  const t = useTranslations("admin_security");
  const [name, setName] = useState(defaultName);
  const [enrolment, setEnrolment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const start = async () => {
    setBusy(true);
    setError(null);
    const res = await enrollStartAction(name);
    setBusy(false);
    if (!res.ok) {
      setError(t("update_error", { message: res.error }));
      return;
    }
    setEnrolment({ factorId: res.factorId, qrCode: res.qrCode, secret: res.secret });
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrolment) return;
    setBusy(true);
    setError(null);
    const res = await enrollConfirmAction(enrolment.factorId, code);
    setBusy(false);
    if (!res.ok) {
      setError(t("mfa_error"));
      setCode("");
      return;
    }
    setDone(true);
    onSuccess();
  };

  if (done) return <p className={authOkCls}>{t("factor_added")}</p>;

  if (!enrolment) {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="factor-name" className={authLabelCls}>{t("factor_name_label")}</label>
          <input id="factor-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={authInputCls} />
        </div>
        {error && <p role="alert" className={authErrorCls}>{error}</p>}
        <button type="button" onClick={start} disabled={busy} className={authButtonCls}>
          {busy ? t("submitting") : t("add_factor")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4">
      <p className="text-sm text-[#3D4F63]/80">{t("scan_qr")}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL SVG fournie par Supabase */}
      <img src={enrolment.qrCode} alt="" width={180} height={180} className="mx-auto rounded-md border border-[#3D4F63]/20 bg-white p-2" />
      <div>
        <p className={authLabelCls}>{t("secret_label")}</p>
        <p className="mt-1 break-all rounded-md bg-[#3D4F63]/5 px-3 py-2 font-mono text-xs text-[#1A1F2A]">{enrolment.secret}</p>
      </div>
      <div>
        <label htmlFor="enroll-code" className={authLabelCls}>{t("mfa_code")}</label>
        <CodeInput id="enroll-code" value={code} onChange={setCode} />
      </div>
      {error && <p role="alert" className={authErrorCls}>{error}</p>}
      <button type="submit" disabled={busy} className={authButtonCls}>
        {busy ? t("submitting") : t("confirm_factor")}
      </button>
    </form>
  );
}
