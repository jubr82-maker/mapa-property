// Bien fictif de l'apercu (page Parametres > Modeles d'annonces) et des
// essais. Chiffres fictifs, affiches comme tels a l'ecran ; textes rediges
// dans les messages (listing_model.sample).
import { familyOf } from "@/lib/listing/families";
import { emptyListingData, type ListingData, type ListingLang } from "@/lib/listing/listing-data";
import type { ListingColumns } from "@/lib/listing/generate";

export type SampleTexts = { city: string; qualifier: string; ambiance: string; highlights: string; rooms_ground: string; rooms_floor: string };

export function sampleColumns(propertyType: string, transaction: "sale" | "rent", mandate: string | null, city: string): ListingColumns {
  const family = familyOf(propertyType);
  const land = family === "prestige" ? 25000 : family === "terrain" ? 850 : family === "maison" || family === "villa" ? 650 : null;
  return {
    property_type: propertyType,
    transaction,
    mandate_type: mandate,
    city,
    year_built: 2004,
    surface: 115,
    living_surface: 115,
    usable_surface: family === "commercial" ? 140 : null,
    land_surface: land,
    terrace_surface: 24,
    balcony_surface: null,
    garden_surface: family === "maison" || family === "villa" || family === "prestige" ? 400 : null,
    bedrooms: 2,
    parking: null,
    has_pool: family === "villa" || family === "prestige",
    floor: family === "appartement" || family === "commercial" ? "2" : null,
    price: transaction === "rent" ? 2400 : 720000,
    price_on_demand: false,
    current_use: null,
  };
}

export function sampleListing(texts: Record<ListingLang, SampleTexts>): ListingData {
  const d = emptyListingData();
  const split = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  for (const l of ["fr", "en", "de"] as const) {
    d.written[l] = { ...d.written[l], qualifier: texts[l].qualifier, ambiance: texts[l].ambiance, highlights: texts[l].highlights };
  }
  const level = (kind: "ground" | "floor", key: "rooms_ground" | "rooms_floor") => {
    const rows = { fr: split(texts.fr[key]), en: split(texts.en[key]), de: split(texts.de[key]) };
    return {
      id: kind,
      kind,
      rooms: rows.fr.map((_, i) => ({ id: `${kind}${i}`, text: { fr: rows.fr[i] ?? "", en: rows.en[i] ?? "", de: rows.de[i] ?? "" } })),
    };
  };
  d.levels = [level("ground", "rooms_ground"), level("floor", "rooms_floor")];
  d.facts = {
    renovation_year: 2020,
    cellar: true,
    parking_indoor: 2,
    monthly_charges: 280,
    elevator: true,
    building_levels: 4,
    top_floor: true,
    private_elevator: false,
    construction: "massive",
    orientation: "sw",
    garage_spaces: 2,
    landscaped_garden: true,
    home_automation: true,
    outbuildings: 2,
    heritage: null,
    zone_pag: "HAB-1",
    servicing: "full",
    shopfront: true,
    shopfront_length: 8,
    current_rent: 4200,
    yield_percent: 5.2,
    rent_charges: 250,
    deposit_months: 3,
    available_now: true,
  };
  return d;
}
