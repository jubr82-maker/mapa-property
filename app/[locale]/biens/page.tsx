import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchAllPropertiesWithCover, type PropertyWithCover } from "@/lib/data";
import { FilterBar } from "@/components/property/FilterBar";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { RadiusCTA } from "@/components/search/RadiusCTA";
import type { Locale } from "@/lib/types";
import { matchesTypeQuery } from "@/lib/property-types";
import { DEFAULT_COUNTRY, matchesCountry } from "@/lib/geo/countries";
import {
  getLocalityCoords,
  haversineKm,
} from "@/lib/geo/luxembourg-communes";

interface SearchParams {
  country?: string;
  city?: string;
  type?: string;
  transaction?: string;
  budget_max?: string;
  min_bedrooms?: string;
  min_surface?: string;
  // Sprint C13-bis C4 : bypass rayon 10km Luxembourg (CTA "voir tout").
  showAll?: string;
}

const RADIUS_KM = 10;

// Sprint C13-bis C1 : matching STRICT sur property_type. Plus de fallback
// title-matching (ex-matchTypeFromTitle supprime). Un bien sans
// property_type renseigne est EXCLU des resultats si un filtre type est
// applique — regle business Julien : pas de match accidentel sur le
// titre (bug "bureau" matchant un appartement avec "bureau" dans le
// libelle). Quand aucun filtre type n'est passe, tous les biens passent.

const filterProperties = (
  list: PropertyWithCover[],
  filters: SearchParams,
): PropertyWithCover[] => {
  return list.filter((p) => {
    // Sprint C13-bis C2 : country toujours present (defaut LU applique
    // dans le caller). matchesCountry tolere les formats heterogenes :
    // 'LU' (offmarket) ou 'Luxembourg' (Apimo nom FR via Intl.DisplayNames).
    if (!matchesCountry(p.country, filters.country)) return false;
    if (
      filters.city &&
      !(p.city ?? "").toLowerCase().includes(filters.city.toLowerCase())
    )
      return false;
    if (filters.transaction && p.transaction !== filters.transaction) return false;
    if (filters.type) {
      // Sprint C13-bis C1 : matching STRICT property_type uniquement.
      // Si property_type est null/vide -> bien EXCLU des resultats
      // (pas de fallback titre). matchesTypeQuery couvre les 5 groupes
      // d'equivalences avec normalisation accents (cf. lib/property-types.ts).
      if (!p.property_type) return false;
      if (!matchesTypeQuery(p.property_type, filters.type)) return false;
    }
    if (filters.budget_max) {
      const max = Number(filters.budget_max);
      if (p.price !== null && p.price > max) return false;
    }
    if (filters.min_bedrooms) {
      const min = Number(filters.min_bedrooms);
      if ((p.bedrooms ?? 0) < min) return false;
    }
    if (filters.min_surface) {
      const min = Number(filters.min_surface);
      if ((p.surface ?? 0) < min) return false;
    }
    return true;
  });
};

export default async function PropertiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const rawFilters = await searchParams;
  setRequestLocale(locale);

  // Sprint C13-bis C2 : pays obligatoire — defaut Luxembourg si absent
  // de l'URL. Garde-fou si le user arrive sur /biens sans query string.
  const filters: SearchParams = {
    ...rawFilters,
    country: rawFilters.country || DEFAULT_COUNTRY,
  };

  const t = await getTranslations({ locale, namespace: "property_list" });
  const allProperties = await fetchAllPropertiesWithCover();

  // Sprint C13-bis C4 : mode rayon 10 km active si :
  //   1. country = LU
  //   2. city saisie
  //   3. getLocalityCoords(city) trouve un point (sinon fallback city LIKE
  //      via filterProperties standard).
  // En mode rayon, on IGNORE city LIKE (le rayon remplace), et on
  // partitionne en within/beyond. showAll=true bypass le rayon.
  const showAll = rawFilters.showAll === "true";
  const cityCenter =
    filters.country === DEFAULT_COUNTRY && filters.city
      ? getLocalityCoords(filters.city)
      : null;

  let displayed: PropertyWithCover[];
  let beyondCount = 0;
  let radiusActive = false;

  if (cityCenter) {
    // Mode rayon : on ignore city LIKE (filterProperties sans city), on
    // applique tous les autres filtres standards, puis on partitionne.
    const noCity = filterProperties(allProperties, {
      ...filters,
      city: undefined,
    });
    if (showAll) {
      // User a clique "voir tout" -> tous les biens du pays (sans rayon,
      // sans city LIKE).
      displayed = noCity;
    } else {
      const within: PropertyWithCover[] = [];
      const beyond: PropertyWithCover[] = [];
      for (const p of noCity) {
        const target = p.city ? getLocalityCoords(p.city) : null;
        if (!target) {
          beyond.push(p);
          continue;
        }
        const km = haversineKm(
          cityCenter.lat,
          cityCenter.lng,
          target.lat,
          target.lng,
        );
        if (km <= RADIUS_KM) within.push(p);
        else beyond.push(p);
      }
      displayed = within;
      beyondCount = beyond.length;
      radiusActive = true;
    }
  } else {
    // Mode normal : pays != LU OU pas de city OU city inconnue dans
    // GeoNames LU. city LIKE applique via filterProperties standard.
    displayed = filterProperties(allProperties, filters);
  }

  // URL pour le CTA "voir tout" : preserve les filtres + showAll=true.
  const showAllParams = new URLSearchParams();
  for (const [k, v] of Object.entries(rawFilters)) {
    if (v) showAllParams.set(k, v);
  }
  showAllParams.set("country", filters.country ?? DEFAULT_COUNTRY);
  showAllParams.set("showAll", "true");
  const showAllHref = `/biens?${showAllParams.toString()}`;

  return (
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

        <div className="mt-10 mb-6 flex items-baseline justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            {displayed.length}{" "}
            {displayed.length > 1 ? t("results") : t("result")}
          </p>
        </div>

        <PropertyGrid properties={displayed} locale={locale as Locale} />

        {radiusActive && beyondCount > 0 && (
          <RadiusCTA
            count={beyondCount}
            locale={locale}
            showAllHref={showAllHref}
          />
        )}
      </div>
    </div>
  );
}
