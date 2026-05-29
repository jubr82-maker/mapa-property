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

  const [featured, reviews, blogPosts, tMC] = await Promise.all([
    fetchHomeFeatured(6, locale),
    fetchPublishedReviews(8),
    fetchLatestBlogPosts(3),
    getTranslations({ locale, namespace: "method_coverage" }),
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
      <FadeInOnScroll>
        <FeaturedCarousel items={featured} />
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
      <OffMarketBand />
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
