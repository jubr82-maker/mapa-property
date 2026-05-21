import { useTranslations } from "next-intl";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";

// NAV2 : ordre voulu — Vente et acquisition, Mandat de recherche,
// Broker International, Négociation, Estimation, Mise en location.
const services = [
  "transaction",
  "search",
  "international",
  "negotiation",
  "valuation",
  "rental",
] as const;

export function ServicesTable() {
  const t = useTranslations("services_home");

  return (
    <section className="px-6 py-5 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-4 max-w-2xl md:mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">
            {t("title")}
          </h2>
          <SignatureLine />
          <p className="mt-3 text-sm text-ink-mid md:text-base">{t("subtitle")}</p>
        </header>

        {/* NAV5 : liste mono-colonne + liseré doré copper (50% viewport,
            1px, centré, marges légères) entre chaque service. */}
        <div className="flex flex-col border-y border-line">
          {services.map((s, idx) => (
            <FadeInOnScroll key={s} delay={idx * 80}>
              {idx > 0 && (
                <div
                  aria-hidden
                  className="mx-auto my-0.5 h-px w-1/2 md:my-1"
                  style={{ backgroundColor: "#D4A574" }}
                />
              )}
              <article className="group flex items-start gap-3 py-2.5 md:gap-6 md:py-7 lg:px-8">
                <span className="font-mono text-[10px] text-ink-soft shrink-0 w-8 pt-1 md:w-10 md:text-xs">
                  0{idx + 1}.
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-base font-bold leading-tight text-ink group-hover:text-gold-deep md:text-2xl">
                    {t(`${s}_title`)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-snug text-ink-mid md:mt-2 md:text-sm">
                    {t(`${s}_text`)}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="font-display text-base text-gold-deep opacity-0 transition-opacity group-hover:opacity-100 md:text-xl"
                >
                  →
                </span>
              </article>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
