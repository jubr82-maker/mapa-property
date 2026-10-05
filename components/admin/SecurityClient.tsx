"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction, unenrollAction, type FactorSummary } from "@/app/admin/auth-actions";
import { MfaEnroll } from "@/components/admin/MfaPanel";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/admin/security-config";
import { authButtonCls, authErrorCls, authInputCls, authLabelCls, authOkCls } from "@/components/admin/auth-ui";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-xl rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="font-display text-xl font-bold text-[#3D4F63]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ChangePasswordCard() {
  const t = useTranslations("admin_security");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < ADMIN_PASSWORD_MIN_LENGTH) return setMsg({ ok: false, text: t("too_short", { min: ADMIN_PASSWORD_MIN_LENGTH }) });
    if (next !== confirm) return setMsg({ ok: false, text: t("mismatch") });
    setBusy(true);
    const res = await changePasswordAction({ current, next, confirm });
    setBusy(false);
    if (!res.ok) {
      const text =
        res.error === "wrong_current" ? t("wrong_current")
        : res.error === "too_short" ? t("too_short", { min: ADMIN_PASSWORD_MIN_LENGTH })
        : res.error === "mismatch" ? t("mismatch")
        : t("update_error", { message: res.error });
      return setMsg({ ok: false, text });
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg({ ok: true, text: t("change_done") });
  };

  return (
    <Card title={t("password_section")}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="current" className={authLabelCls}>{t("current_password")}</label>
          <input id="current" type="password" required autoComplete="current-password" value={current}
            onChange={(e) => setCurrent(e.target.value)} className={authInputCls} />
        </div>
        <div>
          <label htmlFor="next" className={authLabelCls}>{t("new_password")}</label>
          <input id="next" type="password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} autoComplete="new-password" value={next}
            onChange={(e) => setNext(e.target.value)} className={authInputCls} />
          <p className="mt-1 text-xs text-[#3D4F63]/70">{t("too_short", { min: ADMIN_PASSWORD_MIN_LENGTH })}</p>
        </div>
        <div>
          <label htmlFor="confirm" className={authLabelCls}>{t("confirm_password")}</label>
          <input id="confirm" type="password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} className={authInputCls} />
        </div>
        {msg && <p role="status" className={msg.ok ? authOkCls : authErrorCls}>{msg.text}</p>}
        <button type="submit" disabled={busy} className={authButtonCls}>
          {busy ? t("submitting") : t("change_submit")}
        </button>
      </form>
    </Card>
  );
}

export function FactorsCard({ factors, backupName }: { factors: FactorSummary[]; backupName: string }) {
  const t = useTranslations("admin_security");
  const router = useRouter();
  const verified = factors.filter((f) => f.status === "verified");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (verified.length <= 1) return setMsg({ ok: false, text: t("remove_last_forbidden") });
    if (!window.confirm(t("remove_confirm"))) return;
    setBusyId(id);
    const res = await unenrollAction(id);
    setBusyId(null);
    if (!res.ok) {
      return setMsg({ ok: false, text: res.error === "last_factor" ? t("remove_last_forbidden") : t("update_error", { message: res.error }) });
    }
    setMsg({ ok: true, text: t("factor_removed") });
    router.refresh();
  };

  return (
    <Card title={t("factors_section")}>
      <p className="text-sm text-[#3D4F63]/80">{t("factors_intro")}</p>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
        {t("factors_count", { count: verified.length })}
      </p>
      <ul className="divide-y divide-[#3D4F63]/10 rounded-md border border-[#3D4F63]/15">
        {verified.map((f) => (
          <li key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{f.name ?? f.id.slice(0, 8)}</span>
            <button type="button" onClick={() => remove(f.id)} disabled={busyId === f.id || verified.length <= 1}
              className="rounded border border-red-300 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
              {t("remove_factor")}
            </button>
          </li>
        ))}
      </ul>
      {msg && <p role="status" className={msg.ok ? authOkCls : authErrorCls}>{msg.text}</p>}
      {adding ? (
        <MfaEnroll defaultName={backupName} onSuccess={() => { setAdding(false); router.refresh(); }} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={authButtonCls}>{t("add_factor")}</button>
      )}
    </Card>
  );
}
