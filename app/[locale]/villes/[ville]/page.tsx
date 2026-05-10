import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { cities, getCityBySlug, getCitySlugs, getNearbyCities, type City } from "@/lib/cities";
import { routing } from "@/i18n/routing";

type Locale = "fr" | "en" | "de";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

export function generateStaticParams() {
  const slugs = getCitySlugs();
  const params: { locale: string; ville: string }[] = [];
  for (const locale of routing.locales) {
    for (const ville of slugs) {
      params.push({ locale, ville });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; ville: string }>;
}): Promise<Metadata> {
  const { locale, ville } = await params;
  const city = getCityBySlug(ville);
  if (!city) return { title: "Ville inconnue · MAPA Property" };
  const loc = locale as Locale;
  const cityName = city.name[loc];
  return {
    title: `${cityName} — Immobilier prestige · MAPA Property`,
    description: city.metaDescription[loc],
    alternates: {
      canonical: `${SITE_URL}/${locale}/villes/${city.slug}`,
      languages: {
        fr: `${SITE_URL}/fr/villes/${city.slug}`,
        en: `${SITE_URL}/en/villes/${city.slug}`,
        de: `${SITE_URL}/de/villes/${city.slug}`,
        "x-default": `${SITE_URL}/fr/villes/${city.slug}`,
      },
    },
  };
}

const labels: Record<Locale, {
  market: string; price_floor: string; price_ceiling: string;
  schools: string; highlights: string; nearby: string;
  cta_search: string; cta_estimate: string;
  back_to_markets: string;
}> = {
  fr: {
    market: "Marché",
    price_floor: "Plancher",
    price_ceiling: "Plafond",
    schools: "Écoles internationales",
    highlights: "Points clés",
    nearby: "Marchés voisins",
    cta_search: "Mandat de recherche",
    cta_estimate: "Estimation",
    back_to_markets: "← Voir tous nos marchés",
  },
  en: {
    market: "Market",
    price_floor: "Floor",
    price_ceiling: "Ceiling",
    schools: "International schools",
    highlights: "Key points",
    nearby: "Nearby markets",
    cta_search: "Search mandate",
    cta_estimate: "Valuation",
    back_to_markets: "← All our markets",
  },
  de: {
    market: "Markt",
    price_floor: "Untergrenze",
    price_ceiling: "Obergrenze",
    schools: "Internationale Schulen",
    highlights: "Eckpunkte",
    nearby: "Benachbarte Märkte",
    cta_search: "Suchmandat",
    cta_estimate: "Bewertung",
    back_to_markets: "← Alle Märkte",
  },
};

function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function buildJsonLd(city: City, locale: Locale) {
  const url = `${SITE_URL}/${locale}/villes/${city.slug}`;
  if (city.country === "LU") {
    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `${url}#mapa-${city.slug}`,
      name: `MAPA Property — ${city.name[locale]}`,
      url,
      areaServed: { "@type": "Place", name: city.name[locale] },
      address: { "@type": "PostalAddress", addressLocality: city.name[locale], addressCountry: "LU" },
      parentOrganization: { "@id": `${SITE_URL}#organization` },
      description: city.metaDescription[locale],
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: city.name[locale],
    url,
    address: { "@type": "PostalAddress", addressLocality: city.name[locale], addressCountry: city.country },
    description: city.metaDescription[locale],
  };
}

export default async function VillePage({
  params,
}: {
  params: Promise<{ locale: string; ville: string }>;
}) {
  const { locale, ville } = await params;
  setRequestLocale(locale);
  const city = getCityBySlug(ville);
  if (!city) notFound();
  const loc = locale as Locale;
  const t = labels[loc];
  const nearby = getNearbyCities(city.slug, 4);

  return (
    <>
      <JsonLd data={buildJsonLd(city, loc)} />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20 lg:px-10 lg:pt-40">
        <Link
          href="/services/marches-actifs"
          className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft transition-colors hover:text-gold"
        >
          {t.back_to_markets}
        </Link>

        <header className="mt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
            {city.country === "LU" ? "Luxembourg" : city.country}
            {city.region ? ` · ${city.region}` : null}
          </p>
          <h1 className="mt-3 font-display text-5xl font-black leading-[1.05] tracking-tight text-ink sm:text-6xl">
            {city.name[loc]}
          </h1>
        </header>

        <p className="mt-8 text-lg leading-relaxed text-ink-mid">
          {city.intro[loc]}
        </p>

        {city.priceRange ? (
          <section className="mt-12 rounded-lg border border-line bg-bg-soft p-6">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
              {t.market}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                  {t.price_floor}
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-ink">
                  {formatEuro(city.priceRange.floor)} €/m²
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                  {t.price_ceiling}
                </p>
                <p className="mt-1 font-display text-3xl font-bold gold-text">
                  {formatEuro(city.priceRange.ceiling)} €/m²
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {city.schools && city.schools.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold text-ink">{t.schools}</h2>
            <ul className="mt-4 space-y-2">
              {city.schools.map((s) => (
                <li key={s} className="text-base leading-relaxed text-ink-mid">
                  · {s}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-ink">{t.highlights}</h2>
          <ul className="mt-4 space-y-2">
            {city.highlights.map((h) => (
              <li key={h} className="text-base leading-relaxed text-ink-mid">
                · {h}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/mandats/recherche"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-navy-deep"
          >
            {t.cta_search}
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/services/estimer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.08em] text-ink transition-colors hover:border-gold hover:text-gold"
          >
            {t.cta_estimate}
          </Link>
        </section>

        {nearby.length > 0 ? (
          <section className="mt-16">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
              {t.nearby}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {nearby.map((n) => (
                <li key={n.slug}>
                  <Link
                    href={`/villes/${n.slug}`}
                    className="block rounded-md border border-line bg-bg p-4 transition-colors hover:border-gold hover:text-gold"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                      {n.country === "LU" ? "Luxembourg" : n.country}
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-ink">
                      {n.name[loc]}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}

export const dynamicParams = false;
export { cities };
