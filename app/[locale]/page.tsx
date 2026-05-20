import { setRequestLocale } from "next-intl/server";
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

  const [featured, reviews, blogPosts] = await Promise.all([
    fetchHomeFeatured(6, locale),
    fetchPublishedReviews(8),
    fetchLatestBlogPosts(3),
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
      <CoverageGrid />
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
      <FadeInOnScroll>
        <FadeInOutSection>
          <ProcessTable />
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
