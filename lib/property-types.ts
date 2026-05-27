// lib/property-types.ts — équivalences de types de biens.
//
// Source unique de vérité pour les synonymes de types. Utilisé par la
// recherche (SearchBar / FilterBar / TypeFilterMultiSelect / filtrage
// biens) ET le moteur d'estimation EVS (élargissement du pool de
// comparables).
//
// Pur, sans dépendance, sans effet de bord → testable isolément
// (scripts/test-property-types.mjs).
//
// ─── Sprint C13-ter — Catalogue exhaustif 8 groupes / 68 sous-types Apimo ───
// Étend C13-bis (5 groupes) avec parking, office, industrial + tous les
// sous-types Apimo officiels (catalogue Julien). Maisonette retirée
// explicitement. "Hôtel particulier" est dans 2 groupes (maison +
// building), "Box" est dans 2 groupes (parking + industrial) — voulu
// par Apimo. Les valeurs ici sont en lowercase + sans accents + avec
// apostrophe ASCII (apres normalisation NFD + replace) — norm() s'occupe
// de la transformation des entrées au match. Chaque variante composée
// est listée explicitement, pas de matching par substring (déterministe,
// testable).

export const TYPE_GROUPS = {
  apartment: [
    "appartement",
    "duplex",
    "studio",
    "penthouse",
    "triplex",
    "loft",
    "appartement villa",
    "appart'hotel",
    "chambre",
  ],
  house: [
    "villa",
    "maison",
    "maison de ville",
    "maison de village",
    "maison jumelee",
    "maison prefabriquee",
    "maison d'hotes",
    "villa jumelee",
    "bungalow",
    "chalet",
    "chateau",
    "chaumiere",
    "domaine equestre",
    "ferme",
    "fermette",
    "grange",
    "haras",
    "hotel particulier",
    "manoir",
    "mobile home",
    "moulin",
    "palais",
    "pavillon",
    "propriete",
    "refuge",
    "remise",
    "ruine",
  ],
  land: [
    "terrain",
    "terrain constructible",
    "terrain residentiel",
    "terrain commercial",
    "terrain agricole",
    "terrain inconstructible",
    "lac",
  ],
  commercial: [
    "boutique",
    "commerce",
    "local commercial",
    "local et fonds de commerce",
    "fonds de commerce",
    "droit au bail",
    "gerance",
    "hotel",
    "entreprise",
    "exploitation agricole",
  ],
  parking: ["garage", "box", "parking"],
  building: [
    "immeuble",
    "ensemble immobilier",
    "lotissement",
    "hotel particulier",
  ],
  office: ["bureau", "cabinet", "local"],
  industrial: ["atelier", "entrepot", "hangar", "usine", "cave", "box"],
} as const;

export type TypeGroup = keyof typeof TYPE_GROUPS;

// Sprint C13-ter — normalisation enrichie :
// - lowercase + trim
// - NFD strip diacritiques (accents)
// - apostrophes typographiques (U+2019 et U+2018) -> ASCII (U+0027)
// - tirets/underscores -> espace (defense lookup)
const norm = (s: string | null | undefined): string =>
  (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[‘’]/g, "'");

/**
 * Groupe d'un type (ex. "villa" → "house", "studio" → "apartment").
 * Si le type appartient a plusieurs groupes (ex. "hotel particulier"
 * dans house ET building), retourne le PREMIER trouvé selon l'ordre
 * de declaration de TYPE_GROUPS.
 *
 * @returns nom du groupe (TypeGroup) ou null si type inconnu/vide.
 */
export function getTypeGroup(type: string | null | undefined): TypeGroup | null {
  const t = norm(type);
  if (!t) return null;
  for (const group of Object.keys(TYPE_GROUPS) as TypeGroup[]) {
    if ((TYPE_GROUPS[group] as readonly string[]).includes(t)) return group;
  }
  return null;
}

/**
 * Tous les types équivalents d'un type donné (le groupe entier).
 * Si le type n'appartient à aucun groupe → [type normalisé] (lui-même),
 * ou [] si vide. Jamais d'élargissement hasardeux.
 */
export function getEquivalentTypes(type: string | null | undefined): string[] {
  const g = getTypeGroup(type);
  if (g) return [...TYPE_GROUPS[g]];
  const t = norm(type);
  return t ? [t] : [];
}

/**
 * Le type d'un bien matche-t-il un type recherché ?
 *
 * Deux sémantiques selon le type d'entrée :
 *
 * 1. `queryType: string` — comportement legacy C13 (synonymes inclus).
 *    Si le query est un sous-type d'un groupe, expand au groupe entier.
 *    Exemple : matchesTypeQuery("Villa", "maison") = true (groupe house).
 *    Utilisé pour la rétro-compat URL ?type=villa (C13).
 *
 * 2. `queryType: string[]` — Sprint C13-ter multi-select STRICT OR.
 *    Match exact (normalisé) si propertyType ∈ queryType (aucun expand).
 *    L'UI multi-select gère lui-même l'expansion groupe -> sous-types
 *    quand l'utilisateur coche une catégorie. Si l'utilisateur décoche
 *    tout sauf 1 sous-type, le matching est strict sur ce sous-type.
 *    Exemple : matchesTypeQuery("Penthouse", ["studio"]) = false (strict).
 *    Exemple : matchesTypeQuery("Studio", ["studio", "villa"]) = true.
 *
 * Cas limites communs :
 * - queryType vide/null/[] -> true (pas de filtre).
 * - propertyType vide/null + queryType present -> false.
 */
export function matchesTypeQuery(
  propertyType: string | null | undefined,
  queryType: string | string[] | null | undefined,
): boolean {
  // Cas no-filter
  if (queryType == null) return true;
  if (Array.isArray(queryType)) {
    if (queryType.length === 0) return true;
    const p = norm(propertyType);
    if (!p) return false;
    // STRICT OR : match exact normalise sur n'importe quel element.
    return queryType.some((q) => norm(q) === p);
  }
  // string : comportement legacy C13 (expand groupe)
  if (!norm(queryType)) return true;
  const p = norm(propertyType);
  if (!p) return false;
  return getEquivalentTypes(queryType).includes(p);
}
