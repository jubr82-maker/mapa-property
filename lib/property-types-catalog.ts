// Catalogue UI des types de biens — régénéré depuis lib/taxonomy/property-types.ts
// (source de vérité unique) via lib/property-types.ts (TYPE_GROUPS,
// FAMILY_LABEL_BY_GROUP).
//
// Source unique de vérité pour l'affichage du multi-select :
//   - groupes ordonnés selon les 8 familles de la taxonomie
//   - sous-types par groupe, clé i18n = valeur de match = slug taxonomie
//
// La clé i18n (t(`type_subtype.${key}`)) et la valeur de match sont
// désormais la MÊME chaîne : le slug taxonomie (ex. "maison-jumelee"),
// déjà stable et sans accent/apostrophe. Stockée dans l'URL
// (?types=studio,villa) et passée à matchesTypeQuery côté filtrage.

import { PROPERTY_TYPE_FAMILIES } from "./taxonomy/property-types";
import { TYPE_GROUPS, FAMILY_LABEL_BY_GROUP, type TypeGroup } from "./property-types";

export interface SubtypeEntry {
  /** Clé i18n stable = slug taxonomie. */
  key: string;
  /** Valeur de match = slug taxonomie (identique à `key`). */
  value: string;
}

export interface CategoryEntry {
  group: TypeGroup;
  /** Clé i18n pour le label catégorie (search.type_group.<groupKey>). */
  groupKey: string;
  subtypes: SubtypeEntry[];
}

function familyByLabel(label: string) {
  const family = PROPERTY_TYPE_FAMILIES.find((f) => f.label === label);
  if (!family) {
    throw new Error(
      `[property-types-catalog] Famille "${label}" absente de lib/taxonomy/property-types.ts.`,
    );
  }
  return family;
}

export const TYPE_CATALOG: CategoryEntry[] = (
  Object.keys(TYPE_GROUPS) as TypeGroup[]
).map((group) => {
  const family = familyByLabel(FAMILY_LABEL_BY_GROUP[group]);
  return {
    group,
    groupKey: group,
    subtypes: family.types.map((t) => ({ key: t.slug, value: t.slug })),
  };
});

/** Retourne toutes les valeurs de match (slugs) d'un groupe. */
export function valuesForGroup(group: TypeGroup): string[] {
  const cat = TYPE_CATALOG.find((c) => c.group === group);
  return cat ? cat.subtypes.map((s) => s.value) : [];
}

/** Liste exhaustive (dédupliquée) de toutes les valeurs du catalogue. */
export function allCatalogValues(): string[] {
  const set = new Set<string>();
  for (const cat of TYPE_CATALOG) {
    for (const s of cat.subtypes) set.add(s.value);
  }
  return [...set];
}
