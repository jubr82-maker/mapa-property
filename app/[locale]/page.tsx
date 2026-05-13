import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { SearchBar } from "@/components/home/SearchBar";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { CoverageGrid } from "@/components/home/CoverageGrid";
import { ServicesTable } from "@/components/home/ServicesTable";
import { OffMarketBand } from "@/components/home/OffMarketBand";
import { MandatesPremium } from "@/components/home/MandatesPremium";
import { MandatesGrid } from "@/components/home/MandatesGrid";
import { MarketsSection } from "@/components/home/MarketsSection";
import { StatsBand } from "@/components/home/StatsBand";
import { ProcessTable } from "@/components/home/ProcessTable";
import { QuoteBand } from "@/components/home/QuoteBand";
import { ReviewsCarousel } from "@/components/home/ReviewsCarousel";
import { BlogTeaser } from "@/components/home/BlogTeaser";
import { ContactCTA } from "@/components/home/ContactCTA";
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
    fetchHomeFeatured(6),
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
      <MandatesPremium />
      <OffMarketBand />
      <MandatesGrid />
      <MarketsSection />
      <StatsBand locale={locale} />
      <ProcessTable />
      <QuoteBand />
      <ReviewsCarousel reviews={reviews} />
      <BlogTeaser posts={blogPosts} locale={locale as Locale} />
      <ContactCTA locale={locale} />
    </>
  );
}
