import { getTranslations } from "next-intl/server";
import { brandedTitle } from "@/lib/meta-text";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { cityWebPage, pageAlternates } from "@/lib/seo";
import { cities as allCities, getCityBySlug, getCitySlugs, getNearbyCities, isAgencyCity, type City } from "@/lib/cities";
import { communeCityOf, isQuartierCity, quartierCities } from "@/lib/city-links";
import { routing } from "@/i18n/routing";
import { fetchSearchesForCity } from "@/lib/searches/data";
import { SearchCard } from "@/components/searches/SearchCard";
import { PropertyCard } from "@/components/property/PropertyCard";
import { availableFirst } from "@/lib/property-banner";
import { fetchAllBlogPosts, fetchCityPropertiesStrict } from "@/lib/data";
import { pickLang } from "@/lib/types";
import { FaqSection } from "@/components/faq/FaqSection";
import { cityFaqKey } from "@/lib/faq/keys";
import { withSocial } from "@/lib/seo-page-meta";
import { cityForPlace } from "@/lib/internal-links";
import { cityHasOwnContent, isCityIndexable } from "@/lib/city-indexing";

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
  if (!city) return {};
  const loc = locale as Locale;
  const cityName = city.nameInSentence?.[loc] ?? city.name[loc];
  const fr = frenchPreposition(city, loc);
  // Titre traduit (oct. 2026) : l'ancien suffixe francais fige donnait le
  // meme titre aux trois langues.
  const tc = await getTranslations({ locale, namespace: "seo_pages" });
  // Oct. 2026 : ville etrangere sans bien publie ni contenu propre ->
  // "noindex, follow" et aucune autre langue declaree (hreflang) ; la page
  // reste accessible (lib/city-indexing.ts).
  // Lecture sans repli : en cas d'erreur, la regeneration echoue et la page
  // garde son etat precedent (jamais de noindex faute de biens lus).
  // Cache de la ville seule (oct. 2026, quotas Vercel) : un bien modifie ne
  // rafraichit que sa ville (etiquette city-properties:<ville>).
  const published = (await fetchCityPropertiesStrict(city.slug)).length;
  const indexable = isCityIndexable(city, published);
  const alternates = pageAlternates(locale, `/villes/${city.slug}`);
  return withSocial(locale, {
    title: brandedTitle(fr(tc(isAgencyCity(city) ? "city.title" : "city.title_intl", { city: cityName }), cityName)),
    description: fr(cityDescription(tc, city, cityName), cityName),
    alternates: indexable ? alternates : { canonical: alternates.canonical },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  });
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

// Oct. 2026 : une page de ville n'est PAS un etablissement. L'ancien
// LocalBusiness par ville luxembourgeoise declarait autant de faux
// etablissements (adresse fictive dans chaque commune). Desormais : une
// page web qui parle d'un lieu, publiee par l'unique etablissement reel
// (#organization, cf. lib/seo.ts).
// Titre et description Google d'une ville (oct. 2026) : agence immobiliere
// au Luxembourg et dans les pays de la carte europeenne (isAgencyCity),
// broker immobilier ailleurs. Rien d'invente sur la
// ville (plus de "prestige" ni de prix dans la description).
/**
 * Preposition francaise d'une ville si ce n'est pas "a" ("en Algarve") :
 * remplace "a <nom>" dans un texte des modeles (nom vide : "a" final du
 * grand titre). Sans effet hors du francais et pour les autres villes.
 */
function frenchPreposition(city: City, loc: Locale) {
  const prep = loc === "fr" ? city.prepositionFr : undefined;
  return (text: string, name: string) => (prep ? text.replace(name ? `à ${name}` : /à $/, name ? `${prep} ${name}` : `${prep} `) : text);
}

function cityDescription(tc: (k: string, v: Record<string, string>) => string, city: City, cityName: string): string {
  return tc(isAgencyCity(city) ? "city.description" : "city.description_intl", { city: cityName });
}

function buildJsonLd(city: City, locale: Locale, description: string) {
  return cityWebPage({ url: `${SITE_URL}/${locale}/villes/${city.slug}`, name: city.name[locale], description, locale, country: city.country });
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
  // Nom dans une phrase ("a l'Ile Maurice") ; sinon le nom de la ville.
  const inSentence = city.nameInSentence?.[loc] ?? city.name[loc];
  const fr = frenchPreposition(city, loc);
  // Voisines par distance reelle, jamais une ville non indexable (nov. 2026).
  // Indexabilite lue ville par ville (cache city-properties:<ville>), jamais
  // la liste complete des biens : modifier un bien ne regenere pas toutes les
  // pages de ville (quotas Vercel). Une ville du Luxembourg est toujours
  // indexable ; une erreur de lecture exclut la ville (prudence).
  const indexableSlugs = new Set<string>();
  for (const c of allCities) {
    if (c.country === "LU" || cityHasOwnContent(c)) indexableSlugs.add(c.slug);
    else if (city.country !== "LU" && (await fetchCityPropertiesStrict(c.slug).catch(() => [])).length > 0) indexableSlugs.add(c.slug);
  }
  const nearby = getNearbyCities(city.slug, 4, (c) => indexableSlugs.has(c.slug));
  // Luxembourg-Ville : ses quartiers ; un quartier : lien vers tous les
  // quartiers ; une ville : la page de sa commune (nov. 2026, audit SEO).
  const quartiers = city.slug === "luxembourg-ville" ? quartierCities() : [];
  const isQuartier = isQuartierCity(city);
  const communeCity = communeCityOf(city);
  // Recherches en cours qui visent cette commune (oct. 2026).
  const searches = await fetchSearchesForCity(city.slug);
  // Biens publies de la commune (oct. 2026).
  const cityProperties = await fetchCityPropertiesStrict(city.slug);
  const ts = await getTranslations({ locale, namespace: "searches_page" });
  const tc = await getTranslations({ locale, namespace: "seo_pages" });
  // Articles du blog rattaches a la commune (champ commune, admin Blog).
  const cityArticles = (await fetchAllBlogPosts()).filter((b) => b.slug && cityForPlace(b.commune)?.slug === city.slug);
  const tx = await getTranslations({ locale, namespace: "explore" });

  return (
    <>
      <JsonLd data={buildJsonLd(city, loc, fr(cityDescription(tc, city, inSentence), inSentence))} />
      <PageBreadcrumb locale={locale} path={`/villes/${city.slug}`} current={city.name[loc]} />
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
          {/* Oct. 2026 : le H1 lu par Google est "Agence immobilière à
              Dudelange" ; la petite ligne reprend exactement le style de
              la ligne "LUXEMBOURG · SUD" ci-dessus, le nom garde son style. */}
          <h1 className="mt-3 t-h1">
            <span className="mb-2 block font-mono text-[11px] font-normal uppercase leading-normal tracking-[0.3em] text-ink-soft">
              {fr(`${tc(isAgencyCity(city) ? "city.h1_prefix" : "city.h1_prefix_intl")} `, "").trim()}
            </span>{" "}
            {inSentence}
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
            <h2 className="t-h2">{t.schools}</h2>
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
          <h2 className="t-h2">{t.highlights}</h2>
          <ul className="mt-4 space-y-2">
            {(city.highlightsByLang?.[loc] ?? city.highlights).map((h) => (
              <li key={h} className="text-base leading-relaxed text-ink-mid">
                · {h}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/mandats/recherche"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.08em] text-bg transition-opacity hover:opacity-85"
          >
            {t.cta_search}
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/services/estimer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.08em] text-ink transition-colors hover:border-gold hover:text-gold-text"
          >
            {t.cta_estimate}
          </Link>
        </section>

        {cityProperties.length > 0 ? (
          <section className="mt-16" data-city-properties>
            <h2 className="t-h2">{fr(ts("city_properties_title", { city: inSentence }), inSentence)}</h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2">
              {availableFirst(cityProperties).slice(0, 6).map((p) => (
                <li key={p.id}>
                  <PropertyCard property={p} locale={loc} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {searches.length > 0 ? (
          <section className="mt-16" data-city-searches>
            <h2 className="t-h2">{tx("city_searches_here")}</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-mid">{fr(ts("city_block_intro", { city: inSentence }), inSentence)}</p>
            <ul className="mt-6 grid gap-4">
              {searches.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <SearchCard search={s} locale={locale} />
                </li>
              ))}
            </ul>
            <Link href="/recherches" className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.3em] text-gold-deep hover:text-gold">
              {ts("city_block_all")}
            </Link>
          </section>
        ) : null}

        {cityArticles.length > 0 ? (
          <section className="mt-16" data-city-articles>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
              {tx("city_articles_title")}
            </h2>
            <ul className="mt-4 grid gap-3">
              {cityArticles.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/blog/${b.slug}`}
                    className="block rounded-md border border-line bg-bg p-4 transition-colors hover:border-gold hover:text-gold-text"
                  >
                    <p className="font-display text-lg font-bold text-ink">
                      {pickLang(b, "title", loc)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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
                    className="block rounded-md border border-line bg-bg p-4 transition-colors hover:border-gold hover:text-gold-text"
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

        {quartiers.length > 0 ? (
          <section id="quartiers" className="mt-16 scroll-mt-28" data-city-quartiers>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
              {tx("city_quartiers_title")}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {quartiers.map((q) => (
                <li key={q.slug}>
                  <Link
                    href={`/villes/${q.slug}`}
                    className="block rounded-md border border-line bg-bg p-4 transition-colors hover:border-gold hover:text-gold-text"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">Luxembourg</span>
                    <p className="mt-1 font-display text-lg font-bold text-ink">{q.name[loc]}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {communeCity || isQuartier || searches.length > 0 ? (
          <nav aria-label={tx("city_more_title")} className="mt-16 border-t border-line pt-8" data-city-more>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">{tx("city_more_title")}</h2>
            <ul className="mt-4 grid gap-3">
              {isQuartier ? (
                <li>
                  <Link href="/villes/luxembourg-ville#quartiers" className="block rounded-md border border-line bg-bg p-4 font-display text-lg font-bold text-ink transition-colors hover:border-gold hover:text-gold-text">
                    {tx("city_all_quartiers")}
                  </Link>
                </li>
              ) : null}
              {communeCity ? (
                <li>
                  <Link href={`/villes/${communeCity.slug}`} className="block rounded-md border border-line bg-bg p-4 font-display text-lg font-bold text-ink transition-colors hover:border-gold hover:text-gold-text">
                    {tx("city_commune_link", { city: communeCity.name[loc] })}
                  </Link>
                </li>
              ) : null}
              {searches.map((s) => (
                <li key={s.id}>
                  <Link href={`/recherches/${s.reference}`} className="block rounded-md border border-line bg-bg p-4 font-display text-lg font-bold text-ink transition-colors hover:border-gold hover:text-gold-text">
                    {tx("city_search_link", { reference: s.reference })}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <FaqSection pageKey={cityFaqKey(city.slug)} locale={locale} />
      </main>
    </>
  );
}

export const dynamicParams = false;
// Bloc des recherches en cours : mis a jour par l'admin (etiquette
// property-searches) et au plus tard toutes les heures.
// Quotas Vercel (oct. 2026, docs/vercel-quotas.md) : revalidation a la
// demande quand le contenu change ; minuterie de secours de 30 jours seulement.
export const revalidate = 2592000;
