// Bandeaux des echeances Claude (nov. 2026) : cle API et credits. Composant
// serveur, partage par le tableau de bord et Sante du site. Un bandeau =
// une ligne avec un filet de couleur a gauche (pas de cadres empiles) :
// discret (J-60), urgent (J-15 a J0), rouge (echeance passee).
// Libelles : admin_claude_reminders.
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";
import type { ClaudeAlert } from "@/lib/claude/deadlines";
import { formatCost, usdToEur } from "@/lib/claude/pricing";

const STYLE: Record<ClaudeAlert["level"], string> = {
  notice: "border-ink/25 text-ink-mid",
  urgent: "border-amber-500 text-ink",
  expired: "border-red-600 bg-red-600/5 text-red-800",
};

export async function ClaudeAlerts({ alerts, usdPerEur, className = "" }: { alerts: ClaudeAlert[]; usdPerEur: number | null; className?: string }) {
  if (alerts.length === 0) return null;
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_claude_reminders" });
  const money = (usd: number) => {
    const eur = usdToEur(usd, usdPerEur);
    return eur == null ? formatCost(usd, "USD") : formatCost(eur, "EUR");
  };
  const lines = alerts.map((a) => {
    if (a.kind === "credit_low") return { a, text: t("credit_low", { amount: money(a.remainingUsd) }), todo: t("credit_todo") };
    const date = formatDateOnly(a.date);
    const purchased = a.kind === "credit" ? formatDateOnly(a.purchasedOn) : "";
    const state = a.level === "expired" ? "expired" : a.days === 0 ? "today" : "notice";
    return { a, text: t(`${a.kind}_${state}`, { date, days: a.days, purchased }), todo: t(`${a.kind}_todo`) };
  });
  return (
    <ul className={`space-y-2 ${className}`} data-claude-alerts>
      {lines.map(({ a, text, todo }) => (
        <li key={a.kind} role={a.level === "notice" ? undefined : "alert"} data-claude-alert={`${a.kind}:${a.level}`} className={`border-l-4 py-1.5 pl-3 ${STYLE[a.level]}`}>
          <p className={`text-sm ${a.level === "notice" ? "" : "font-semibold"}`}>{text}</p>
          <p className="text-xs text-ink-soft">{todo}</p>
        </li>
      ))}
    </ul>
  );
}
