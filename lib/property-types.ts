// lib/property-types.ts — équivalences de types de biens (BUG D)
//
// Source unique de vérité pour les synonymes de types. Utilisé par la
// recherche (SearchBar / filtrage biens) ET le moteur d'estimation EVS
// (élargissement du pool de comparables, BUG E).
//
// Pur, sans dépendance, sans effet de bord → testable isolément
// (scripts/test-property-types.mjs). Aucune intégration ici : le
// branchement SearchBar / filtrage / comparables est fait séparément
// (cf. TODO RAPPORT_NUIT) pour ne pas risquer la recherche en prod.

// Sprint C13 — equivalences etendues pour matcher les valeurs reelles
// Apimo en DB (Capitalized + variantes composees comme "Maison jumelee",
// "Terrain constructible") + types off-market ("immeuble", "ensemble
// immobilier"). Les valeurs ici sont en lowercase + sans accents
// (apres normalisation NFD) — norm() s'occupe de la transformation des
// entrees au match. Chaque variante composee est listee explicitement,
// pas de matching par substring (deterministe, testable).
export const TYPE_GROUPS = {
  house: ["maison", "villa", "maison jumelee"],
  apartment: ["appartement", "duplex", "studio", "penthouse", "triplex"],
  land: ["terrain", "terrain constructible"],
  commercial: [
    "bureau",
    "local commercial",
    "local et fonds de commerce",
  ],
  building: ["immeuble", "ensemble immobilier"],
} as const;

export type TypeGroup = keyof typeof TYPE_GROUPS;

// Sprint C13 — strip accents via NFD decomposition + filtrage diacritiques.
// Necessaire pour matcher les valeurs Apimo qui arrivent en
// "Maison jumelee" (accent sur le e final) en lowercase + accents.
const norm = (s: string | null | undefined): string =>
  (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/** Groupe d'un type (ex. "villa" → "house"), sinon null. */
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
 * Le type d'un bien matche-t-il un type recherché (synonymes inclus) ?
 * - queryType vide/absent → true (pas de filtre type).
 * - propertyType absent → false.
 */
export function matchesTypeQuery(
  propertyType: string | null | undefined,
  queryType: string | null | undefined,
): boolean {
  if (!norm(queryType)) return true;
  const p = norm(propertyType);
  if (!p) return false;
  return getEquivalentTypes(queryType).includes(p);
}
