import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatEuro, monthlyPayment } from "@/lib/finance";

interface Props {
  price: number;
  rate: number; // taux annuel %
  years?: number;
  notaryRate?: number; // ex 0.07 pour 7%
  downRate?: number; // ex 0.20 pour 20%
}

export function PropertyFinancing({
  price,
  rate,
  years = 25,
  notaryRate = 0.07,
  downRate = 0.2,
}: Props) {
  const t = useTranslations("property_financing");
  const down = price * downRate;
  const notary = price * notaryRate;
  const principal = price - down;
  const monthly = monthlyPayment(principal, rate, years);

  return (
    <aside className="rounded-xl border border-gold bg-gradient-to-br from-bg-soft via-bg to-bg-soft p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
        {t("eyebrow")}
      </p>
      <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-ink">
        {t("title")}
      </h3>

      <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Stat label={t("monthly")} value={formatEuro(Math.round(monthly))} highlight />
        <Stat
          label={t("rate", { years, rate: rate.toFixed(2) })}
          value={`${rate.toFixed(2).replace(".", ",")} %`}
        />
        <Stat label={t("down")} value={formatEuro(Math.round(down))} />
        <Stat label={t("notary")} value={`~ ${formatEuro(Math.round(notary))}`} />
      </dl>

      <p className="mt-6 text-xs leading-relaxed text-ink-soft">{t("disclaimer")}</p>

      <Link
        href="/services/simulateurs"
        className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep hover:text-gold"
      >
        {t("cta")} →
      </Link>
    </aside>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </dt>
      <dd
        className={`mt-1 font-display ${
          highlight ? "text-3xl gold-text" : "text-xl text-ink"
        } font-black tracking-tight`}
      >
        {value}
      </dd>
    </div>
  );
}
