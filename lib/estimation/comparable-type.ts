// Comparables des ventes realisees (oct. 2026) : un logement ne se compare
// qu'a un logement du meme groupe, jamais a une vente non residentielle
// (commerce, bureau, fonds de commerce, entrepot, parking, terrain), et
// inversement. Module pur, utilise par app/api/estimate/route.ts
// (fetchComparablesForCommune) et teste par scripts/test-sales-types.mts.
//
// Groupes tires du referentiel des fiches (lib/listing/families.ts) :
//   appartement (appartement, studio, duplex, triplex, rez-de-jardin,
//   penthouse), maison (familles maison et villa), puis un groupe propre a
//   chaque famille non residentielle (commercial, parking, terrain) et aux
//   biens de prestige (chateau, domaine), jamais melanges aux maisons.
// Anciennes valeurs des ventes (avant le referentiel commun) : maison, loft
// et immeuble.
import { familyOf } from "@/lib/listing/families";

export type ComparableGroup = "appartement" | "maison" | "prestige" | "commercial" | "parking" | "terrain";

const LEGACY_SALE_GROUPS: Record<string, ComparableGroup> = {
  maison: "maison",
  loft: "appartement",
  immeuble: "commercial",
};

/** Groupe de comparaison d'un type de bien (vente ou estimation), ou null si inconnu. */
export function comparableGroup(type: string | null | undefined): ComparableGroup | null {
  const t = (type ?? "").trim().toLowerCase();
  if (!t) return null;
  const family = familyOf(t);
  if (family === "appartement") return "appartement";
  if (family === "maison" || family === "villa") return "maison";
  if (family) return family;
  return LEGACY_SALE_GROUPS[t] ?? null;
}

export function isResidentialGroup(g: ComparableGroup | null): boolean {
  return g === "appartement" || g === "maison" || g === "prestige";
}

/** Une vente entre dans les comparables d'une estimation seulement si les deux groupes sont identiques et connus. */
export function isComparableSale(estimType: string, saleType: string | null | undefined): boolean {
  const a = comparableGroup(estimType);
  const b = comparableGroup(saleType);
  return a !== null && a === b;
}
