import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchLatestInterestRates } from "@/lib/data";
import { SimulatorTabs } from "@/components/simulators/SimulatorTabs";
import { DisclaimerLegal } from "@/components/ui/DisclaimerLegal";

export default async function SimulatorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rates = await fetchLatestInterestRates();
  const t = await getTranslations({ locale, namespace: "simulators_page" });

  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">
            {t("title")}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-ink-mid">
            {t("intro")}
          </p>
        </header>

        <SimulatorTabs rates={rates} />

        {/* Sprint juridique : disclaimer unifie sous les chiffres calcules
            (remplace l'ancienne mention custom simulators_page.disclaimer_*). */}
        <DisclaimerLegal className="mt-12" />
      </div>
    </div>
  );
}
