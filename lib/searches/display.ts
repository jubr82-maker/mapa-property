// Affichage public d'une recherche (oct. 2026) : faits lisibles (type,
// communes, budget en fourchette, criteres, delai) et donnees
// structurees. Seuls les champs publics sont lus (PublicSearch).
import { formatMoney, formatNumber } from "@/lib/listing/language";
import type { ListingLang } from "@/lib/listing/listing-data";
import { htmlToText } from "@/lib/listing/template-engine";
import { searchFamily, type PublicSearch } from "@/lib/searches/search";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

type T = (key: string, values?: Record<string, string | number>) => string;

const langOf = (locale: string): ListingLang => (locale === "en" || locale === "de" ? locale : "fr");

export function localizedText(s: PublicSearch, field: "title" | "description" | "criteria", locale: string): string {
  const l = langOf(locale);
  const v = s[`${field}_${l}` as const] || s[`${field}_fr` as const] || "";
  return field === "description" ? htmlToText(v) : v;
}

export function budgetLabel(s: PublicSearch, locale: string, t: T): string {
  const l = langOf(locale);
  const m = (n: number) => formatMoney(n, l);
  if (s.budget_min && s.budget_max) return t("budget_range", { min: m(s.budget_min), max: m(s.budget_max) });
  if (s.budget_max) return t("budget_to", { max: m(s.budget_max) });
  if (s.budget_min) return t("budget_from", { min: m(s.budget_min) });
  return t("budget_none");
}

/** Criteres : chiffres de la recherche puis criteres rediges. */
export function criteriaList(s: PublicSearch, locale: string, t: T): string[] {
  const l = langOf(locale);
  const out: string[] = [];
  const fam = searchFamily(s.property_type);
  const residential = fam === "appartement" || fam === "maison" || fam === "villa" || fam === "prestige";
  if (residential && s.bedrooms_min) out.push(t("bedrooms_min", { count: s.bedrooms_min }));
  if (residential && s.surface_min) out.push(t("surface_min", { surface: formatNumber(s.surface_min, l) }));
  if (s.land_min) out.push(t("land_min", { ares: formatNumber(s.land_min / 100, l) }));
  for (const line of localizedText(s, "criteria", locale).split(/\n+/)) {
    const c = line.trim().replace(/^[-•*]\s*/, "");
    if (c) out.push(c);
  }
  return out.map((c) => c.charAt(0).toLocaleUpperCase(l) + c.slice(1));
}

const ITEM_TYPE: Record<string, string> = {
  appartement: "Apartment",
  maison: "SingleFamilyResidence",
  villa: "SingleFamilyResidence",
  prestige: "House",
  terrain: "Place",
  commercial: "Place",
  parking: "Place",
};

/**
 * Donnees structurees schema.org Demand : ce que recherche le client de
 * MAPA Property (type de bien, communes, fourchette de prix). Rien
 * d'invente : les champs vides sont omis.
 */
export function searchJsonLd(s: PublicSearch, locale: string, title: string, description: string) {
  const url = `${SITE_URL}/${locale}/recherches/${s.reference}`;
  const fam = searchFamily(s.property_type) ?? "maison";
  const itemType = ITEM_TYPE[fam] ?? "Place";
  const accommodation = itemType !== "Place";
  const item: Record<string, unknown> = { "@type": itemType };
  if (accommodation && s.bedrooms_min) item.numberOfBedrooms = { "@type": "QuantitativeValue", minValue: s.bedrooms_min };
  if (accommodation && s.surface_min) item.floorSize = { "@type": "QuantitativeValue", minValue: s.surface_min, unitCode: "MTK" };
  const price: Record<string, unknown> | null =
    s.budget_min || s.budget_max
      ? { "@type": "PriceSpecification", priceCurrency: "EUR", ...(s.budget_min ? { minPrice: s.budget_min } : {}), ...(s.budget_max ? { maxPrice: s.budget_max } : {}) }
      : null;
  return {
    "@context": "https://schema.org",
    "@type": "Demand",
    "@id": `${url}#demand`,
    url,
    name: title,
    description: description.slice(0, 500),
    sku: s.reference,
    businessFunction: s.transaction === "rent" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
    itemOffered: item,
    areaServed: s.communes.map((c) => ({ "@type": "City", name: c })),
    ...(price ? { priceSpecification: price } : {}),
    ...(s.published_at ? { validFrom: s.published_at } : {}),
    mainEntityOfPage: url,
  };
}
