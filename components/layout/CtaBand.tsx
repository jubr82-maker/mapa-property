import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";

export function CtaBand() {
  const t = useTranslations("footer");

  return (
    <section className="mx-auto mb-14 mt-24 max-w-[1400px] px-6 lg:px-10">
      <FadeInOnScroll y={30}>
        <div className="grid gap-6 overflow-hidden rounded-2xl border border-gold/30 bg-bg-contrast p-8 text-text-contrast shadow-md md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
              {t("cta_eyebrow")}
            </p>
            <h3 className="mt-2 font-display text-2xl font-black leading-tight text-text-contrast md:text-4xl">
              {t("cta_title")}
            </h3>
            <p className="mt-2 max-w-xl text-sm text-text-contrast/80 md:text-base">
              {t("cta_subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:flex-col md:items-stretch">
            <Link
              href="/mandats/exclusif"
              className="cta-lime-glow inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink shadow-md transition-colors hover:bg-gold-bright"
            >
              {t("cta_exclusive")}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/mandats/recherche"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/60 px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-gold transition-colors hover:border-gold hover:bg-gold/10"
            >
              {t("cta_search")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </FadeInOnScroll>
    </section>
  );
}
