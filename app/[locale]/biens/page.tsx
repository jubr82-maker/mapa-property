import type { Metadata } from "next";
import { withPageMessages } from "@/components/i18n/withPageMessages";
import { setRequestLocale, getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { fetchAllPropertiesWithCover, type PropertyWithCover } from "@/lib/data";
import { FilterBar } from "@/components/property/FilterBar";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { pageAlternates } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { CHILD_TO_PARENT, PARENT_TO_CHILDREN, expandType } from "@/lib/taxonomy/property-types";
import { withSocial } from "@/lib/seo-page-meta";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { redirect } from "@/i18n/navigation";
import { foreignCityPlaces } from "@/lib/search/places";
import { runSearch, type SearchCriteria } from "@/lib/search/engine";
import { hrefWith, paramsFromParsed, searchFromParams, type SearchParamsRecord } from "@/lib/search/url";
import { SearchSummary } from "@/components/search/SearchSummary";
import { CountryPrompt } from "@/components/search/CountryPrompt";
// Sprint OPTIM-BIENS-3 — chargé en lazy (chunk séparé, embla-carousel-react
// inclus) : ne pèse sur le bundle client que sur les recherches où le
// carrousel s'affiche réellement (peu de résultats + type précis). SSR
// conservé (pas de ssr:false — interdit en Server Component, et de toute
// façon indésirable ici : on veut le HTML du carrousel dans la réponse
// initiale, pas un flash de contenu).
const SiblingCarousel = dynamic(() =>
  import("@/components/property/SiblingCarousel").then(
    (mod) => mod.SiblingCarousel,
  ),
);

// Recherche (nov. 2026) : la liste des biens applique les regles uniques de
// lib/search/engine.ts (meme referentiel et memes regles que la recherche
// en texte libre et qu'Elena) : champ "Ville / quartier" (city), texte libre
// (q), pres de, zones, equipements, question du pays. L'ancien mode "rayon
// de 10 km" est remplace par ces regles.

const SIBLING_LIMIT = 12;

/**
 * Sprint SIBLING-1 — "Voir aussi les autres [famille]" : quand un filtre
 * de type PRECIS (un enfant de la hierarchie) ramene peu de resultats
 * (<= 3), propose les biens freres de la meme famille, avec EXACTEMENT les
 * memes autres criteres (lieu, transaction, budget, chambres...) : seul le
 * type change.
 */
function computeSiblingSuggestions(
  allProperties: PropertyWithCover[],
  displayed: PropertyWithCover[],
  criteria: SearchCriteria,
): { parentSlugs: string[]; triggerTypes: string[]; properties: PropertyWithCover[] } | null {
  if (displayed.length > 3) return null;
  const normalizedTypes = criteria.types.map((t) => t.trim().toLowerCase());
  if (normalizedTypes.length === 0) return null;
  if (normalizedTypes.some((t) => t in PARENT_TO_CHILDREN)) return null;
  const parentSlugs = Array.from(new Set(normalizedTypes.map((t) => CHILD_TO_PARENT[t]).filter((p): p is string => Boolean(p))));
  if (parentSlugs.length === 0) return null;
  const candidateTypes = new Set<string>();
  for (const parent of parentSlugs) for (const t of expandType(parent)) candidateTypes.add(t);
  for (const t of normalizedTypes) candidateTypes.delete(t);
  if (candidateTypes.size === 0) return null;
  const r = runSearch(allProperties, { ...criteria, types: [...candidateTypes], hasQuery: false });
  if (r.relaxed.length) return null;
  const displayedIds = new Set(displayed.map((p) => p.id));
  const siblings = [...r.main, ...r.nearby].filter((p) => !displayedIds.has(p.id));
  if (siblings.length === 0) return null;
  return { parentSlugs, triggerTypes: normalizedTypes, properties: siblings.slice(0, SIBLING_LIMIT) };
}

// Canonical SANS les query params de filtre (?country=&types=&budget_max=...)
// -> évite que Google traite chaque combinaison de filtres comme une page
// distincte à indexer (duplication de contenu). Toutes les variantes
// filtrées canonicalisent vers /[locale]/biens, la liste non filtrée.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "property_list" });
  return withSocial(locale, {
    title: `${t("title")}, MAPA Property`,
    description: t("subtitle"),
    alternates: pageAlternates(locale, "/biens"),
  });
}

async function PropertiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParamsRecord>;
}) {
  const { locale } = await params;
  const rawFilters = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "property_list" });
  const tr = await getTranslations({ locale, namespace: "search_results" });
  const allProperties = await fetchAllPropertiesWithCover();
  const extraPlaces = foreignCityPlaces(allProperties);
  const { criteria, parsedText, offmarket } = searchFromParams(rawFilters, extraPlaces);

  // Off-market : jamais detaille ici, renvoi vers sa page.
  if (offmarket) redirect({ href: "/off-market", locale });
  // Texte libre compris : adresse normalisee (pastilles retirables).
  if (rawFilters.q && parsedText?.understood) {
    const merged = paramsFromParsed(parsedText);
    for (const [k, v] of Object.entries(rawFilters)) if (v && k !== "q" && !merged.has(k)) merged.set(k, v);
    redirect({ href: `/biens?${merged.toString()}`, locale });
  }

  const outcome = runSearch(allProperties, criteria);
  const displayed = outcome.main;
  const total = outcome.main.length + outcome.nearby.length;
  const siblingSuggestions = criteria.notUnderstood ? null : computeSiblingSuggestions(allProperties, displayed, criteria);
  const countryChoices = (["LU", "FR", "autre", "tous"] as const).map((c) => ({ label: tr(`pays_${c}`), href: hrefWith(rawFilters, { pays: c }) }));

  return (
    <>
      <PageBreadcrumb locale={locale} path="/biens" />
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-10 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-ink-mid">{t("subtitle")}</p>
        </header>

        <FilterBar />

        <SearchSummary
          locale={locale}
          sp={rawFilters}
          criteria={criteria}
          emptyPlace={outcome.emptyPlace}
          relaxed={outcome.relaxed}
          suggestCity={outcome.suggestCity}
        />

        {!criteria.notUnderstood && (
          <>
            <div className="mt-10 mb-6 flex items-baseline justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
                {total}{" "}
                {total > 1 ? t("results") : t("result")}
              </p>
            </div>

            {displayed.length > 0 && <PropertyGrid properties={displayed} locale={locale as Locale} />}

            {outcome.nearby.length > 0 && (
              <section className="mt-14" data-search-nearby>
                <h2 className="t-h2 mb-6">{tr("nearby_title")}</h2>
                <PropertyGrid properties={outcome.nearby} locale={locale as Locale} />
              </section>
            )}

            {siblingSuggestions && (
              <SiblingCarousel
                properties={siblingSuggestions.properties}
                parentSlugs={siblingSuggestions.parentSlugs}
                triggerTypes={siblingSuggestions.triggerTypes}
                locale={locale as Locale}
              />
            )}
          </>
        )}
      </div>
    </div>
      {outcome.askCountry && <CountryPrompt title={tr("country_prompt")} closeLabel={tr("country_prompt_close")} choices={countryChoices} />}
    </>
  );
}

// Traductions des composants client de la page seulement (oct. 2026, quotas Vercel).
export default withPageMessages(PropertiesPage, ["property_list", "search", "status_banner"]);
