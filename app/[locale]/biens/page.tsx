import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchAllPropertiesWithCover, type PropertyWithCover } from "@/lib/data";
import { FilterBar } from "@/components/property/FilterBar";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import type { Locale } from "@/lib/types";
import { matchesTypeQuery } from "@/lib/property-types";

interface SearchParams {
  country?: string;
  city?: string;
  type?: string;
  transaction?: string;
  budget_max?: string;
  min_bedrooms?: string;
  min_surface?: string;
}

// Sprint C13 : fallback title-matching pour les biens dont la colonne
// property_type est null/vide (rare mais possible si Apimo n'a pas
// renseigne le type). Le matching principal passe par matchesTypeQuery
// (lib/property-types.ts) qui couvre les 5 groupes d'equivalences avec
// normalisation accents.
const matchTypeFromTitle = (title: string | null, type: string) => {
  if (!title) return false;
  const lower = title.toLowerCase();
  const map: Record<string, string[]> = {
    appartement: ["appart"],
    maison: ["maison"],
    penthouse: ["penthouse"],
    duplex: ["duplex"],
    villa: ["villa"],
    immeuble: ["immeuble"],
    terrain: ["terrain"],
  };
  const keywords = map[type] ?? [type];
  return keywords.some((k) => lower.includes(k));
};

const filterProperties = (
  list: PropertyWithCover[],
  filters: SearchParams,
): PropertyWithCover[] => {
  return list.filter((p) => {
    if (filters.country && p.country !== filters.country) return false;
    if (
      filters.city &&
      !(p.city ?? "").toLowerCase().includes(filters.city.toLowerCase())
    )
      return false;
    if (filters.transaction && p.transaction !== filters.transaction) return false;
    if (filters.type) {
      // Sprint C13 : 1) match strict sur property_type via les groupes
      // d'equivalences (maison<->villa<->maison jumelee, appartement<->
      // duplex<->penthouse<->studio<->triplex, terrain<->terrain
      // constructible, etc.). 2) si property_type est null/vide ->
      // fallback title-matching legacy pour ne pas perdre les biens mal
      // renseignes par Apimo.
      if (p.property_type) {
        if (!matchesTypeQuery(p.property_type, filters.type)) return false;
      } else {
        const titles = [p.title_fr, p.title_en, p.title_de].filter(
          Boolean,
        ) as string[];
        const ok = titles.some((t) => matchTypeFromTitle(t, filters.type!));
        if (!ok) return false;
      }
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
  const filters = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "property_list" });
  const allProperties = await fetchAllPropertiesWithCover();
  const filtered = filterProperties(allProperties, filters);

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
            {filtered.length} {filtered.length > 1 ? t("results") : t("result")}
          </p>
        </div>

        <PropertyGrid properties={filtered} locale={locale as Locale} />
      </div>
    </div>
  );
}
