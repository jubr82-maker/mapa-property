// Familles et types de biens de la fiche admin (oct. 2026), type de mandat
// et champs utiles par famille. Module pur, partage par la fiche admin,
// les modeles d'annonces et le site.
//
// Les types reprennent les identifiants de la taxonomie du site
// (lib/taxonomy/property-types.ts, colonne properties.property_type) :
// "maison isolee" = maison-individuelle, "domaine" = propriete-domaine,
// "propriete" = propriete-de-prestige. Deux types ajoutes a la taxonomie :
// rez-de-jardin (appartement) et maison-plain-pied (maison).
// Libelles : namespace next-intl admin_properties (family_*, ptype_*).

export const LISTING_FAMILIES = ["appartement", "maison", "villa", "prestige", "terrain", "commercial", "parking"] as const;
export type ListingFamily = (typeof LISTING_FAMILIES)[number];

/** Bloc du modele d'annonce : la famille, sauf le penthouse (bloc propre). */
export type TemplateBlock = ListingFamily | "penthouse";

export const LISTING_TYPES: { slug: string; family: ListingFamily }[] = [
  { slug: "appartement", family: "appartement" },
  { slug: "studio", family: "appartement" },
  { slug: "duplex", family: "appartement" },
  { slug: "triplex", family: "appartement" },
  { slug: "rez-de-jardin", family: "appartement" },
  { slug: "penthouse", family: "appartement" },
  { slug: "maison-individuelle", family: "maison" },
  { slug: "maison-jumelee", family: "maison" },
  { slug: "maison-mitoyenne", family: "maison" },
  { slug: "maison-plain-pied", family: "maison" },
  { slug: "maison-de-maitre", family: "maison" },
  { slug: "villa", family: "villa" },
  { slug: "chateau", family: "prestige" },
  { slug: "propriete-domaine", family: "prestige" },
  { slug: "propriete-de-prestige", family: "prestige" },
  { slug: "terrain", family: "terrain" },
  { slug: "local-commercial", family: "commercial" },
  { slug: "bureau", family: "commercial" },
  { slug: "immeuble-de-rapport", family: "commercial" },
  { slug: "fonds-de-commerce", family: "commercial" },
  { slug: "parking", family: "parking" },
  { slug: "garage", family: "parking" },
];

export function familyOf(propertyType: string | null | undefined): ListingFamily | null {
  return LISTING_TYPES.find((t) => t.slug === propertyType)?.family ?? null;
}

export function templateBlockOf(propertyType: string | null | undefined): TemplateBlock | null {
  if (propertyType === "penthouse") return "penthouse";
  return familyOf(propertyType);
}

export function isListingType(v: unknown): v is string {
  return typeof v === "string" && LISTING_TYPES.some((t) => t.slug === v);
}

/** Type de mandat (colonne properties.mandate_type). */
export const MANDATE_TYPES = ["exclusive", "semi_exclusive", "simple", "autonomous"] as const;
export type MandateType = (typeof MANDATE_TYPES)[number];

export function isMandateType(v: unknown): v is MandateType {
  return typeof v === "string" && (MANDATE_TYPES as readonly string[]).includes(v);
}

/** Classes du passeport energetique luxembourgeois (efficacite et isolation). */
export const ENERGY_CLASSES = ["A+", "A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

export function isEnergyClass(v: unknown): boolean {
  return typeof v === "string" && (ENERGY_CLASSES as readonly string[]).includes(v);
}

/** Champs de la fiche admin et familles qui les utilisent. */
const RESIDENTIAL: ListingFamily[] = ["appartement", "maison", "villa", "prestige"];
const BUILT: ListingFamily[] = ["appartement", "maison", "villa", "prestige", "commercial"];
const WITH_LAND: ListingFamily[] = ["maison", "villa", "prestige", "terrain"];

export const FIELD_FAMILIES: Record<string, ListingFamily[]> = {
  living_surface: RESIDENTIAL,
  usable_surface: BUILT,
  land_surface: WITH_LAND,
  terrace_surface: RESIDENTIAL,
  balcony_surface: ["appartement"],
  garden_surface: ["appartement", "maison", "villa", "prestige"],
  kitchen_surface: RESIDENTIAL,
  bedrooms: RESIDENTIAL,
  bathrooms: RESIDENTIAL,
  douches: RESIDENTIAL,
  wc: BUILT,
  bureaux: ["commercial"],
  locaux_stockage: ["commercial", "appartement", "maison", "villa", "prestige"],
  floor: ["appartement", "commercial"],
  has_laundry: RESIDENTIAL,
  has_dressing: RESIDENTIAL,
  has_pool: ["maison", "villa", "prestige"],
  parking: ["appartement", "maison", "villa", "prestige", "commercial", "parking"],
  energy: BUILT,
  thermal: BUILT,
  ges: BUILT,
  year: BUILT,
  current_use: ["commercial", "terrain"],
  potential_use: ["commercial", "terrain", "prestige"],
};

/** Le champ est-il utile a la famille ? Sans type choisi, tout s'affiche. */
export function fieldVisible(field: string, family: ListingFamily | null): boolean {
  if (!family) return true;
  const fams = FIELD_FAMILIES[field];
  return !fams || fams.includes(family);
}

/** Valeur du badge "Exclusivite" en base (BADGE_LABELS de l'admin). */
export const EXCLUSIVE_BADGE = "Exclusivité";

/**
 * Badge public : un bien en mandat exclusif porte le badge "Exclusivite",
 * a la place du badge choisi a la main (taille et position conservees).
 */
export function effectiveBadge(badge: string | null | undefined, mandateType: string | null | undefined): string | null {
  if (mandateType === "exclusive") return EXCLUSIVE_BADGE;
  return badge ?? null;
}

/** Pieces d'un modele modifiables dans Parametres > Modeles d'annonces. */
export const TEMPLATE_PARTS = ["title", "tronc", ...LISTING_FAMILIES, "penthouse"] as const;
export type TemplatePart = (typeof TEMPLATE_PARTS)[number];

export function isTemplatePart(v: unknown): v is TemplatePart {
  return typeof v === "string" && (TEMPLATE_PARTS as readonly string[]).includes(v);
}
