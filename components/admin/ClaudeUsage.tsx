"use client";

// Consommation de l'API Claude (nov. 2026) : ligne discrete a cote du
// bouton de traduction, et encart du tableau de bord avec la saisie du
// credit charge. Montants en euros au taux BCE du jour, sinon en dollars.
// Libelles : admin_claude.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { formatCost, usdToEur } from "@/lib/claude/pricing";
import type { ClaudeUsageSummary } from "@/lib/claude/usage";
import { saveClaudeBudget, saveClaudeCredit, saveClaudeKeyExpiry } from "@/app/admin/properties/claude-actions";
import { budgetLevel, budgetPercent, formatUsd } from "@/lib/claude/budget";
import { addOneYear, isIsoDay, type ClaudeDeadlines } from "@/lib/claude/deadlines";
import { formatDateOnly } from "@/lib/datetime";

/** Console Claude (solde officiel : Settings, Billing). Racine seulement : adresse sure. */
export const CLAUDE_CONSOLE_BILLING_URL = "https://platform.claude.com/";

export function useMoney(usdPerEur: number | null) {
  return (usd: number) => {
    const eur = usdToEur(usd, usdPerEur);
    return eur == null ? formatCost(usd, "USD") : formatCost(eur, "EUR");
  };
}

/** « 12,34 $ sur 200 $ (11,40 € sur 184,80 €) » : dollars, puis euros si le taux est connu. */
export function useBudgetText(usage: ClaudeUsageSummary) {
  const t = useTranslations("admin_claude");
  const eurSpent = usdToEur(usage.monthUsd, usage.usdPerEur);
  const eurBudget = usdToEur(usage.budget.usd, usage.usdPerEur);
  const eur = eurSpent != null && eurBudget != null ? t("budget_eur", { spent: formatCost(eurSpent, "EUR"), budget: formatCost(eurBudget, "EUR") }) : "";
  return t("budget_month", { spent: formatUsd(usage.monthUsd), budget: formatUsd(usage.budget.usd), eur });
}

/** Bandeau du budget : discret a 80 %, rouge a 100 %. */
export function ClaudeBudgetBanner({ usage, className = "" }: { usage: ClaudeUsageSummary; className?: string }) {
  const t = useTranslations("admin_claude");
  const level = usage.ready ? budgetLevel(usage.monthUsd, usage.budget.usd) : null;
  if (!level) return null;
  const values = { percent: budgetPercent(usage.monthUsd, usage.budget.usd), spent: formatUsd(usage.monthUsd), budget: formatUsd(usage.budget.usd) };
  return (
    <p
      role={level === "over" ? "alert" : undefined}
      data-claude-budget={level}
      className={`border-l-4 py-1.5 pl-3 text-sm ${level === "over" ? "border-red-600 bg-red-600/5 font-semibold text-red-800" : "border-ink/25 text-ink-mid"} ${className}`}
    >
      {t(level === "over" ? "budget_over" : "budget_near", values)}
    </p>
  );
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
export function ClaudeUsagePanel({ usage, deadlines }: { usage: ClaudeUsageSummary; deadlines: ClaudeDeadlines }) {
  const t = useTranslations("admin_claude");
  const money = useMoney(usage.usdPerEur);
  const [amount, setAmount] = useState(usage.credit ? String(usage.credit.amountUsd) : "");
  const [date, setDate] = useState(usage.credit?.loadedOn ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const budgetText = useBudgetText(usage);

  if (!usage.ready) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-dashed border-ink/20 p-4 text-sm text-ink-mid">{t("not_ready_long")}</p>
        <p className="text-sm text-ink-mid">{t("credit_not_set")}</p>
        <KeyExpiryForm deadlines={deadlines} />
      </div>
    );
  }
  const stats: [string, string][] = [
    [t("stat_last"), usage.last ? money(usage.last.usd) : t("none")],
    [t("stat_today"), money(usage.todayUsd)],
    [t("stat_month"), money(usage.monthUsd)],
    [t("stat_count"), String(usage.monthCount)],
    [t("stat_remaining"), usage.remainingUsd != null ? money(usage.remainingUsd) : t("credit_unknown")],
    [t("stat_average"), usage.avgTranslationUsd != null ? money(usage.avgTranslationUsd) : t("none")],
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
      <ClaudeBudgetBanner usage={usage} className="mb-4" />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{label}</dt>
            <dd className="mt-1 break-words font-display text-2xl font-bold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink" data-claude-budget-line>
        {budgetText}
      </p>
      {usage.avgTranslationUsd != null && <p className="mt-1 text-xs text-ink-soft">{t("average_note", { count: usage.translationCount })}</p>}
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
      {/* Expiration calculee (date d'achat + 1 an), suit la saisie en cours. */}
      <p className="mt-2 text-xs text-ink-soft" data-credit-expiry>
        {isIsoDay(date) ? t("credit_expires", { date: formatDateOnly(addOneYear(date)) }) : t("credit_not_set")}
      </p>
      <BudgetForm usage={usage} className="mt-4 border-t border-ink/10 pt-4" />
      <KeyExpiryForm deadlines={deadlines} className="mt-4 border-t border-ink/10 pt-4" />
    </div>
  );
}

/** Budget mensuel en dollars (200 $ par defaut), modifiable. */
function BudgetForm({ usage, className = "" }: { usage: ClaudeUsageSummary; className?: string }) {
  const t = useTranslations("admin_claude");
  const [value, setValue] = useState(String(usage.budget.usd));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await saveClaudeBudget(Number(value.replace(",", ".")));
      setMsg(r.ok ? { ok: true, text: t("budget_saved") } : { ok: false, text: r.error });
    });
  }
  return (
    <form onSubmit={save} className={className} data-claude-budget-form>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("budget_label")}</span>
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ""))} className="mt-1 w-32 rounded-md border border-ink/20 bg-bg px-3 py-2 text-sm text-ink" required />
        </label>
        <button type="submit" disabled={busy || !usage.budget.ready} className="rounded-full border border-ink/30 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink hover:border-gold disabled:opacity-50">
          {t("budget_save")}
        </button>
        {msg && (
          <span role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-700"}`}>
            {msg.text}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-soft">{usage.budget.ready ? t("budget_hint") : t("budget_not_ready")}</p>
    </form>
  );
}

/** Date d'expiration de la cle API (31/12/2027 par defaut), modifiable. */
function KeyExpiryForm({ deadlines, className = "" }: { deadlines: ClaudeDeadlines; className?: string }) {
  const t = useTranslations("admin_claude");
  const [day, setDay] = useState(deadlines.apiKeyExpiresOn);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await saveClaudeKeyExpiry(day);
      setMsg(r.ok ? { ok: true, text: t("key_saved") } : { ok: false, text: r.error });
    });
  }
  return (
    <form onSubmit={save} className={className} data-claude-key-expiry>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">{t("key_date")}</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 rounded-md border border-ink/20 bg-bg px-3 py-2 text-sm text-ink" required />
        </label>
        <button type="submit" disabled={busy || !deadlines.remindersReady} className="rounded-full border border-ink/30 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink hover:border-gold disabled:opacity-50">
          {t("key_save")}
        </button>
        {msg && (
          <span role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-700"}`}>
            {msg.text}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {deadlines.remindersReady ? t("key_hint") : t("key_not_ready", { date: formatDateOnly(deadlines.apiKeyExpiresOn) })}
      </p>
    </form>
  );
}
