import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { withPageMessages } from "@/components/i18n/withPageMessages";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import type { PropertyWithCover } from "@/lib/data";
import { bannerOf, isBannerColor, isBannerPosition, isStatusBanner } from "@/lib/property-banner";
import type { Locale } from "@/lib/types";

// Banc d'essai des bandeaux (nov. 2026, captures scripts/proof-bandeaux.mjs).
// Bien de test FICTIF, en memoire : jamais lu ni ecrit en base, jamais un
// vrai bien. Route de developpement seulement : 404 en production.
export const metadata: Metadata = { title: "Test bandeaux", robots: { index: false, follow: false } };

async function TestBandeauxPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const kind = isStatusBanner(sp.kind) ? sp.kind : null;
  const fake = {
    id: "00000000-0000-4000-8000-000000000000",
    slug: "bien-de-test-fictif",
    transaction: kind === "rented" ? "rent" : "sale",
    country: "Luxembourg",
    city: "Bien fictif",
    title_fr: "Bien de test fictif",
    title_en: "Fictitious test property",
    title_de: "Fiktive Testimmobilie",
    price: kind === "rented" ? 2500 : 850000,
    surface: 120,
    bedrooms: 3,
    bathrooms: 2,
    energy: "B",
    badge: "Exclusivité",
    badge_size: "M",
    badge_position: "top-left",
    status_banner: kind,
    banner_position: isBannerPosition(sp.pos) ? sp.pos : "straight",
    banner_color: isBannerColor(sp.color) ? sp.color : "sapin",
    cover_url: "/images/hero/mapa-showcase-poster-1280.jpg",
  } as unknown as PropertyWithCover;
  return (
    <main className="mx-auto max-w-[1400px] px-6 pt-32 pb-20" data-test-bandeaux>
      <div data-proof-card className="w-full max-w-[420px]">
        <PropertyCard property={fake} locale={locale as Locale} />
      </div>
      <div data-proof-gallery className="mt-10">
        <PropertyGallery items={[{ type: "image", url: "/images/hero/mapa-showcase-poster-1280.jpg", alt: "" }]} title="Bien de test fictif" banner={bannerOf(fake)} />
      </div>
    </main>
  );
}

export default withPageMessages(TestBandeauxPage, ["ai_transparency", "property", "status_banner"]);
