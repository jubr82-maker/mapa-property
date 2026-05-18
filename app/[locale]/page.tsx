import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { SearchBar } from "@/components/home/SearchBar";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { CoverageGrid } from "@/components/home/CoverageGrid";
import { ServicesTable } from "@/components/home/ServicesTable";
import { OffMarketBand } from "@/components/home/OffMarketBand";
import { MandatesGrid } from "@/components/home/MandatesGrid";
import { MarketsSection } from "@/components/home/MarketsSection";
import { StatsBand } from "@/components/home/StatsBand";
import { ProcessTable } from "@/components/home/ProcessTable";
import { ReviewsCarousel } from "@/components/home/ReviewsCarousel";
import { BlogTeaser } from "@/components/home/BlogTeaser";
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
      <Hero locale={locale} />
      <SearchBar />
      <FeaturedCarousel items={featured} />
      <CoverageGrid />
      <ServicesTable />
      <OffMarketBand />
      <MandatesGrid />
      <MarketsSection />
      <StatsBand locale={locale} />
      <ProcessTable />
      {/* NAV7 : « mot fondateur » (QuoteBand) retiré — à réécrire avec
          Julien (cf. docs/qa/COPY_REWRITES_TODO.md). */}
      <ReviewsCarousel reviews={reviews} />
      <BlogTeaser posts={blogPosts} locale={locale as Locale} />
      {/* NAV8 : ContactCTA « Une conversation peut tout changer »
          retiré (doublon du CTA footer « Passer à l'action »). */}
    </>
  );
}
