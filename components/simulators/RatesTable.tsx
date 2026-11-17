// Tableau "Taux moyens au Luxembourg" (nov. 2026) : les 8 valeurs officielles
// BCE affichees sans modification (memes chiffres, deux decimales comme la
// publication), avec le mois publie et la source. Composant serveur.
import { getTranslations } from "next-intl/server";
import type { InterestRates } from "@/lib/types";
import { OFFICIAL_RATE_KEYS, effectiveRates, formatOfficialRate, formatRateMonth } from "@/lib/rates";

export async function RatesTable({ row, locale, className = "" }: { row: InterestRates | null; locale: string; className?: string }) {
  const t = await getTranslations({ locale, namespace: "simulators_page" });
  const { rates, month } = effectiveRates(row);
  return (
    <section aria-labelledby="taux-moyens" className={className}>
      <h2 id="taux-moyens" className="font-display text-2xl font-bold text-ink">
        {t("rates_title")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{t("rates_source", { month: formatRateMonth(month, locale) })}</p>
      <table className="mt-5 w-full max-w-2xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="py-2 pr-4 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-soft">
              {t("rates_col_type")}
            </th>
            <th scope="col" className="py-2 text-right font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-soft">
              {t("rates_col_rate")}
            </th>
          </tr>
        </thead>
        <tbody>
          {OFFICIAL_RATE_KEYS.map((k) => {
            const v = rates[k];
            return (
              <tr key={k} className="border-b border-line/60" data-rate-key={k}>
                <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-mid">
                  {t(`rates_row_${k}`)}
                </th>
                <td className="py-2.5 text-right font-display font-bold whitespace-nowrap text-ink">
                  {typeof v === "number" ? `${formatOfficialRate(v, locale)} %` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-soft">{t("rates_note")}</p>
    </section>
  );
}
