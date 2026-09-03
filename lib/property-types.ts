// lib/property-types.ts — dérivé de lib/taxonomy/property-types.ts (source de
// vérité unique). Regroupe les slugs de la taxonomie par famille
// (TYPE_GROUPS) et fournit la recherche hiérarchique (matchesTypeQuery) :
// un type LARGE (ex. "appartement") remonte lui-même ET tous ses enfants
// (studio, penthouse, loft, duplex, triplex) ; un type PRÉCIS (ex.
// "penthouse") ne remonte que lui-même. Utilisé par la recherche
// (SearchBar / FilterBar / TypeFilterMultiSelect / filtrage biens).
//
// Pur, sans dépendance runtime hors lib/taxonomy, testable isolément
// (scripts/test-property-types.mjs).

import {
  PROPERTY_TYPE_FAMILIES,
  expandType,
} from "./taxonomy/property-types";

export const FAMILY_LABEL_BY_GROUP = {
  residentiel: "Résidentiel",
  professionnel_commercial: "Professionnel & commercial",
  immeubles_investissement: "Immeubles & investissement",
  neuf_projets: "Neuf & projets",
  terrains: "Terrains",
  parkings_annexes: "Parkings & annexes",
  ruraux_specifiques: "Ruraux & spécifiques",
  prestige_atypique: "Prestige & atypique",
} as const;

function familyTypes(label: string): string[] {
  const family = PROPERTY_TYPE_FAMILIES.find((f) => f.label === label);
  if (!family) {
    throw new Error(
      `[property-types] Famille "${label}" absente de lib/taxonomy/property-types.ts.`,
    );
  }
  return family.types.map((t) => t.slug);
}

export const TYPE_GROUPS = {
  residentiel: familyTypes(FAMILY_LABEL_BY_GROUP.residentiel),
  professionnel_commercial: familyTypes(
    FAMILY_LABEL_BY_GROUP.professionnel_commercial,
  ),
  immeubles_investissement: familyTypes(
    FAMILY_LABEL_BY_GROUP.immeubles_investissement,
  ),
  neuf_projets: familyTypes(FAMILY_LABEL_BY_GROUP.neuf_projets),
  terrains: familyTypes(FAMILY_LABEL_BY_GROUP.terrains),
  parkings_annexes: familyTypes(FAMILY_LABEL_BY_GROUP.parkings_annexes),
  ruraux_specifiques: familyTypes(FAMILY_LABEL_BY_GROUP.ruraux_specifiques),
  prestige_atypique: familyTypes(FAMILY_LABEL_BY_GROUP.prestige_atypique),
} as const;

export type TypeGroup = keyof typeof TYPE_GROUPS;

// Normalisation : minuscules, accents retirés, espaces/underscores/
// apostrophes -> tiret. Aligne toute variante de format (legacy Apimo,
// query Eléna avec underscores, saisie humaine) sur le slug kebab-case
// canonique de la taxonomie (ex. "Maison jumelée" / "maison_jumelee" /
// "maison-jumelee" -> "maison-jumelee").
const norm = (s: string | null | undefined): string =>
  (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\s_'’‘]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Famille (groupe) d'un type, ou null si type inconnu/vide.
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
 * Types équivalents d'un type donné pour la recherche : lui-même + ses
 * enfants s'il est un type large (cf. expandType), lui seul sinon.
 */
export function getEquivalentTypes(type: string | null | undefined): string[] {
  const t = norm(type);
  return t ? expandType(t) : [];
}

/**
 * Le type d'un bien matche-t-il un type recherché ?
 *
 * Règle hiérarchique unique, identique en requête simple (string, legacy
 * ?type=) et en multi-select (string[], UI actuelle) : chaque terme de
 * requête est élargi indépendamment via expandType avant comparaison.
 * - type LARGE (ex. "appartement") -> remonte lui-même ET tous ses enfants.
 * - type PRÉCIS (ex. "penthouse") -> remonte SEULEMENT ce type.
 *
 * Cas limites : queryType vide/null/[] -> true (pas de filtre).
 * propertyType vide/null + queryType présent -> false.
 */
export function matchesTypeQuery(
  propertyType: string | null | undefined,
  queryType: string | string[] | null | undefined,
): boolean {
  if (queryType == null) return true;
  const p = norm(propertyType);
  if (Array.isArray(queryType)) {
    if (queryType.length === 0) return true;
    if (!p) return false;
    return queryType.some((q) => expandType(norm(q)).includes(p));
  }
  const q = norm(queryType);
  if (!q) return true;
  if (!p) return false;
  return expandType(q).includes(p);
}
