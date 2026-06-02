import { setRequestLocale, getTranslations } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { SearchBar } from "@/components/home/SearchBar";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { CoverageGrid } from "@/components/home/CoverageGrid";
import { ServicesTable } from "@/components/home/ServicesTable";
import { OffMarketBand } from "@/components/home/OffMarketBand";
import { MandatesGrid } from "@/components/home/MandatesGrid";
import { CoverageStats } from "@/components/home/CoverageStats";
import { ProcessTable } from "@/components/home/ProcessTable";
import { ReviewsCarousel } from "@/components/home/ReviewsCarousel";
import { BlogTeaser } from "@/components/home/BlogTeaser";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";
import { FadeInOutSection } from "@/components/effects/FadeInOutSection";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { Link } from "@/i18n/navigation";
import {
  fetchHomeFeatured,
  fetchLatestBlogPosts,
  fetchPublishedReviews,
} from "@/lib/data";
import type { Locale } from "@/lib/types";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [featured, reviews, blogPosts, tMC, tWL] = await Promise.all([
    fetchHomeFeatured(6, locale),
    fetchPublishedReviews(8),
    fetchLatestBlogPosts(3),
    getTranslations({ locale, namespace: "method_coverage" }),
    getTranslations({ locale, namespace: "home_waitlist" }),
  ]);

  return (
    <>
      {/* POL6 : ordre home — Hero, Coups de cœur, Familles d'actifs,
          CTA Mandat (remonté), Couverture+Chiffres fusionnés, Méthode
          (remontée avant), Six métiers, puis off-market/avis/journal.
          SearchBar conservé (ancre #search du Hero) ; OffMarketBand /
          Reviews / Blog conservés (non listés au brief mais existants —
          pas de suppression non demandée). */}
      {/* POL3-7 : Hero NON animé (au-dessus du fold). Blocs sans
          stagger interne enveloppés dans FadeInOnScroll ; carrousel
          révélé en bloc unique (Embla intact, validé Julien). Les
          blocs à stagger (CoverageGrid, ServicesTable, OffMarketBand,
          BlogTeaser) animent leurs items en interne — pas de double
          wrap. prefers-reduced-motion respecté par le composant. */}
      <Hero locale={locale} />
      <FadeInOnScroll>
        <SearchBar />
      </FadeInOnScroll>
      {/* Sprint PIN-FIXED : pas de wrapper FadeInOnScroll autour du
          carrousel — son IntersectionObserver (threshold 0.15) ne se
          déclenche jamais sur l'outer pin de 9*100vh (ratio max ~11%),
          ce qui figeait l'opacité à 0. Le carrousel n'a pas besoin de
          fondu d'entrée (le pin gère l'apparition). */}
      <FeaturedCarousel items={featured} />
      {/* Sprint waitlist : accroche avant-premiere 24h, inseree entre
          le carrousel et le bloc Methode & Couverture. CTA -> /liste-attente. */}
      <FadeInOnScroll>
        <section className="px-6 py-12 md:py-20 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <div className="rounded-2xl border border-gold/30 bg-bg-soft px-8 py-10 md:px-12 md:py-14">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-deep">
                {tWL("eyebrow")}
              </p>
              <h2 className="mt-3 t-h2">{tWL("title")}</h2>
              <SignatureLine />
              <p className="mt-3 max-w-2xl text-sm text-ink-mid md:text-base">
                {tWL("subtitle")}
              </p>
              <Link
                href="/liste-attente"
                className="gold-shine-bg mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02]"
              >
                {tWL("cta_label")}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </FadeInOnScroll>
      {/* Sprint UI-MAI / LOT B : fusion des anciennes sections "Notre
          couverture" (CoverageGrid) et "Notre methode" (ProcessTable) sous
          un titre commun "Methode & Couverture". Les 2 composants gardent
          leurs grilles internes mais leurs headers individuels sont masques
          via la prop hideHeader. Le bloc affiche dans l'ordre vertical :
          titre + sous-titre -> 4 familles d'actifs -> 3 etapes. */}
      <FadeInOnScroll>
        <FadeInOutSection>
          <section className="px-6 pt-5 md:pt-20 lg:px-10 lg:pt-20">
            <div className="mx-auto max-w-[1400px]">
              <header className="mb-4 max-w-2xl md:mb-12">
                <h2 className="t-h2">{tMC("title")}</h2>
                <SignatureLine />
                <p className="mt-3 text-sm text-ink-mid md:text-base">
                  {tMC("subtitle")}
                </p>
              </header>
            </div>
            <CoverageGrid hideHeader />
            <ProcessTable hideHeader />
          </section>
        </FadeInOutSection>
      </FadeInOnScroll>
      <FadeInOnScroll>
        <MandatesGrid />
      </FadeInOnScroll>
      {/* Sprint UI-MAI / LOT D : OffMarketBand remonte juste apres
          MandatesGrid (avant CoverageStats). Logique editoriale : la
          card "Mandat de Recherche" de MandatesGrid mene naturellement
          vers la presentation off-market. */}
      <OffMarketBand />
      {/* POL3-7a (ANTOINE) : FadeInOutSection en double-wrap autour
          du FadeInOnScroll existant — fade-in one-shot puis modulation
          opacity continue selon intersectionRatio (sections respirantes). */}
      <FadeInOnScroll>
        <FadeInOutSection>
          <CoverageStats locale={locale} />
        </FadeInOutSection>
      </FadeInOnScroll>
      <ServicesTable />
      {/* NAV7 : « mot fondateur » (QuoteBand) retiré (cf.
          docs/qa/COPY_REWRITES_TODO.md). */}
      <FadeInOnScroll>
        <FadeInOutSection>
          <ReviewsCarousel reviews={reviews} />
        </FadeInOutSection>
      </FadeInOnScroll>
      <BlogTeaser posts={blogPosts} locale={locale as Locale} />
      {/* NAV8 : ContactCTA « Une conversation peut tout changer »
          retiré (doublon du CTA footer « Passer à l'action »). */}
    </>
  );
}
