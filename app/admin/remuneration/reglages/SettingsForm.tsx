"use client";

// Formulaire des reglages de la remuneration (nov. 2026) : listes fermees
// partout ou c'est possible (classe d'impot, niveau du salaire social
// minimum, mutualite, facteur accident). Enregistrement :
// PUT /api/admin/remuneration/reglages (controle serveur identique).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseDecimalInput } from "@/lib/admin/sale-commission";
import { ACCIDENT_FACTORS, MUTUALITE_RATES, SSM_LEVELS, type EmployerSettings, type SalesAgent } from "@/lib/admin/remuneration-reglages";

type AgentState = {
  key: string;
  displayName: string;
  active: boolean;
  sharePct: string;
  paysEmployerCharges: boolean;
  taxClass: string;
  travelDeduction: string;
  ssmLevel: string;
  currentNet: string;
  reserveStart: string;
};

const decimalText = (n: number) => String(n).replace(".", ",");
const fr = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

const inputCls = "w-full rounded border border-[#3D4F63]/30 bg-white px-3 py-1.5 text-sm focus:border-[#9E7B2A] focus:outline-none";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[#3D4F63]/60">{hint}</span> : null}
    </label>
  );
}

const ERRORS: Record<string, string> = {
  agent_invalid: "errors.agent",
  name_invalid: "errors.name",
  share_invalid: "errors.share",
  tax_class_invalid: "errors.taxClass",
  travel_invalid: "errors.travel",
  ssm_invalid: "errors.ssm",
  net_invalid: "errors.net",
  reserve_start_invalid: "errors.reserveStart",
  mutualite_invalid: "errors.mutualite",
  accident_invalid: "errors.accident",
  settings_unavailable: "errors.unavailable",
};

export function SettingsForm({ agents, employer }: { agents: (SalesAgent & { displayName: string })[]; employer: EmployerSettings }) {
  const t = useTranslations("admin_remuneration");
  const tn = useTranslations("admin_notices");
  const router = useRouter();
  const [rows, setRows] = useState<AgentState[]>(
    agents.map((a) => ({
      key: a.key,
      displayName: a.displayName,
      active: a.active,
      sharePct: decimalText(a.sharePct),
      paysEmployerCharges: a.paysEmployerCharges,
      taxClass: String(a.taxClass),
      travelDeduction: decimalText(a.travelDeduction),
      ssmLevel: a.ssmLevel,
      currentNet: a.currentNet === null ? "" : decimalText(a.currentNet),
      reserveStart: a.reserveStart ?? "",
    })),
  );
  const [mutualite, setMutualite] = useState(String(employer.mutualiteRate));
  const [factor, setFactor] = useState(String(employer.accidentFactor));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (i: number, patch: Partial<AgentState>) => {
    setSaved(false);
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    // Montants : virgule ou point, 2 decimales ; controle final cote serveur.
    const payload = {
      agents: rows.map((r) => ({
        key: r.key,
        displayName: r.displayName,
        active: r.active,
        sharePct: parseDecimalInput(r.sharePct),
        paysEmployerCharges: r.paysEmployerCharges,
        taxClass: Number(r.taxClass),
        travelDeduction: parseDecimalInput(r.travelDeduction) ?? 0,
        ssmLevel: r.ssmLevel,
        currentNet: parseDecimalInput(r.currentNet),
        reserveStart: r.reserveStart || null,
      })),
      employer: { mutualiteRate: Number(mutualite), accidentFactor: Number(factor) },
    };
    const bad = payload.agents.find((a) => a.sharePct === null || Number.isNaN(a.sharePct) || Number.isNaN(a.travelDeduction) || (a.currentNet !== null && Number.isNaN(a.currentNet)));
    if (bad) {
      setError(t(bad.sharePct === null || Number.isNaN(bad.sharePct) ? "errors.share" : Number.isNaN(bad.travelDeduction) ? "errors.travel" : "errors.net"));
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/admin/remuneration/reglages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(json.error && ERRORS[json.error] ? t(ERRORS[json.error]) : json.message || tn("err_http", { status: res.status }));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(tn("err_network"));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {rows.map((r, i) => (
        <section key={r.key} className="rounded-lg border border-[#3D4F63]/20 bg-white p-6">
          <h2 className="font-display text-xl font-bold uppercase tracking-[0.05em]">{t("settings.agentTitle", { name: r.displayName })}</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("settings.displayName")}>
              <input type="text" value={r.displayName} maxLength={80} required onChange={(e) => set(i, { displayName: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("settings.share")} hint={t("settings.shareHint")}>
              <input type="text" inputMode="decimal" value={r.sharePct} required onChange={(e) => set(i, { sharePct: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("settings.taxClass")}>
              <select value={r.taxClass} onChange={(e) => set(i, { taxClass: e.target.value })} className={inputCls}>
                <option value="1">{t("settings.taxClass1")}</option>
                <option value="2">{t("settings.taxClass2")}</option>
                <option value="1a" disabled>
                  {t("settings.taxClass1a")}
                </option>
              </select>
            </Field>
            <Field label={t("settings.travel")} hint={t("settings.travelHint")}>
              <input type="text" inputMode="decimal" value={r.travelDeduction} onChange={(e) => set(i, { travelDeduction: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("settings.ssm")}>
              <select value={r.ssmLevel} onChange={(e) => set(i, { ssmLevel: e.target.value })} className={inputCls}>
                {SSM_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {t(`settings.ssm_${l}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("settings.currentNet")} hint={t("settings.currentNetHint")}>
              <input type="text" inputMode="decimal" value={r.currentNet} onChange={(e) => set(i, { currentNet: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("settings.reserveStart")}>
              <input type="date" value={r.reserveStart} onChange={(e) => set(i, { reserveStart: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={r.paysEmployerCharges} onChange={(e) => set(i, { paysEmployerCharges: e.target.checked })} />
              {t("settings.paysCharges")}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={r.active} onChange={(e) => set(i, { active: e.target.checked })} />
              {t("settings.active")}
            </label>
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-[#3D4F63]/20 bg-white p-6">
        <h2 className="font-display text-xl font-bold uppercase tracking-[0.05em]">{t("settings.employerTitle")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("settings.mutualite")}>
            <select value={mutualite} onChange={(e) => { setSaved(false); setMutualite(e.target.value); }} className={inputCls}>
              {MUTUALITE_RATES.map((m, k) => (
                <option key={m} value={String(m)}>
                  {t("settings.mutualiteOption", { classe: k + 1, rate: fr(m) })}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("settings.accident")}>
            <select value={factor} onChange={(e) => { setSaved(false); setFactor(e.target.value); }} className={inputCls}>
              {ACCIDENT_FACTORS.map((f) => (
                <option key={f} value={String(f)}>
                  {fr(f)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{t("settings.saved")}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded bg-[#9E7B2A] px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white disabled:opacity-50">
          {pending ? t("settings.saving") : t("settings.save")}
        </button>
      </div>
    </form>
  );
}
