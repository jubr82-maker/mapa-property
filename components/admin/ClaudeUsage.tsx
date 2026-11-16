"use client";

// Consommation de l'API Claude (nov. 2026) : ligne discrete a cote du
// bouton de traduction, et encart du tableau de bord avec la saisie du
// credit charge. Montants en euros au taux BCE du jour, sinon en dollars.
// Libelles : admin_claude.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { formatCost, usdToEur } from "@/lib/claude/pricing";
import type { ClaudeUsageSummary } from "@/lib/claude/usage";
import { saveClaudeCredit } from "@/app/admin/properties/claude-actions";

/** Console Claude (solde officiel : Settings, Billing). Racine seulement : adresse sure. */
export const CLAUDE_CONSOLE_BILLING_URL = "https://platform.claude.com/";

export function useMoney(usdPerEur: number | null) {
  return (usd: number) => {
    const eur = usdToEur(usd, usdPerEur);
    return eur == null ? formatCost(usd, "USD") : formatCost(eur, "EUR");
  };
}

/** Ligne discrete : derniere traduction, jour, mois, nombre, credit restant. */
export function ClaudeUsageLine({ usage }: { usage: ClaudeUsageSummary }) {
  const t = useTranslations("admin_claude");
  const money = useMoney(usage.usdPerEur);
  if (!usage.ready) return <p className="text-[11px] text-ink-soft">{t("not_ready")}</p>;
  const items = [
    usage.last ? t("line_last", { amount: money(usage.last.usd) }) : null,
    t("line_today", { amount: money(usage.todayUsd) }),
    t("line_month", { amount: money(usage.monthUsd) }),
    t("line_count", { count: usage.monthCount }),
    usage.remainingUsd != null ? t("line_remaining", { amount: money(usage.remainingUsd) }) : null,
  ].filter(Boolean) as string[];
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-soft" data-claude-usage-line>
      {items.map((x) => (
        <span key={x}>{x}</span>
      ))}
      <a href={CLAUDE_CONSOLE_BILLING_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {t("console_link")}
      </a>
    </p>
  );
}

/** Encart "Consommation Claude" du tableau de bord. */
export function ClaudeUsagePanel({ usage }: { usage: ClaudeUsageSummary }) {
  const t = useTranslations("admin_claude");
  const money = useMoney(usage.usdPerEur);
  const [amount, setAmount] = useState(usage.credit ? String(usage.credit.amountUsd) : "");
  const [date, setDate] = useState(usage.credit?.loadedOn ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  if (!usage.ready) {
    return <p className="rounded-xl border border-dashed border-ink/20 p-4 text-sm text-ink-mid">{t("not_ready_long")}</p>;
  }
  const stats: [string, string][] = [
    [t("stat_last"), usage.last ? money(usage.last.usd) : t("none")],
    [t("stat_today"), money(usage.todayUsd)],
    [t("stat_month"), money(usage.monthUsd)],
    [t("stat_count"), String(usage.monthCount)],
    [t("stat_remaining"), usage.remainingUsd != null ? money(usage.remainingUsd) : t("credit_unknown")],
  ];
  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const value = Number(amount.replace(",", "."));
    start(async () => {
      const r = await saveClaudeCredit(value, date);
      setMsg(r.ok ? { ok: true, text: t("credit_saved") } : { ok: false, text: r.error });
    });
  }
  return (
    <div className="rounded-2xl border border-ink/15 bg-bg-soft p-4 md:p-5" data-claude-usage-panel>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{label}</dt>
            <dd className="mt-1 break-words font-display text-2xl font-bold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-soft">
        {usage.usdPerEur ? t("rate_note", { rate: usage.usdPerEur.toFixed(4) }) : t("rate_missing")} {t("remaining_note")}{" "}
        <a href={CLAUDE_CONSOLE_BILLING_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          {t("console_link")}
        </a>
      </p>
      <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink/10 pt-4">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("credit_amount")}</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} className="mt-1 w-32 rounded-md border border-ink/20 bg-bg px-3 py-2 text-sm text-ink" required />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("credit_date")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-md border border-ink/20 bg-bg px-3 py-2 text-sm text-ink" required />
        </label>
        <button type="submit" disabled={busy} className="rounded-full border border-ink/30 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink hover:border-gold disabled:opacity-50">
          {t("credit_save")}
        </button>
        {msg && (
          <span role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-700"}`}>
            {msg.text}
          </span>
        )}
      </form>
    </div>
  );
}
