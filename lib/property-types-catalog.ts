// Sprint C13-ter — Catalogue UI des types de biens.
//
// Source unique de vérité pour l'affichage du multi-select :
//   - groupes ordonnés (apartment, house, land, commercial, parking,
//     building, office, industrial)
//   - sous-types par groupe avec clé i18n stable + valeur de match
//
// La clé i18n est utilisée pour t(`type_subtype.${key}`) (lowercase +
// underscores, pas d'apostrophe ni d'accent dans le path next-intl).
// La valeur de match est la string normalisée qui sera stockée dans
// l'URL (?types=studio,villa) et passée à matchesTypeQuery côté
// filtrage. Elle correspond EXACTEMENT à une entrée de TYPE_GROUPS
// dans lib/property-types.ts.
//
// Dédoublonnage : 'Hôtel particulier' apparaît dans 2 groupes (house +
// building), 'Box' dans 2 groupes (parking + industrial). Pratique
// Apimo légitime. Le UI affiche le sous-type dans les 2 catégories ;
// la valeur de match est la même (les biens DB matche sur cette valeur
// unique).

import type { TypeGroup } from "./property-types";

export interface SubtypeEntry {
  /** Clé i18n stable (lowercase, underscores). */
  key: string;
  /** Valeur de match normalisée (= entrée TYPE_GROUPS). */
  value: string;
}

export interface CategoryEntry {
  group: TypeGroup;
  /** Clé i18n pour le label catégorie (search.type_group.<groupKey>). */
  groupKey: string;
  subtypes: SubtypeEntry[];
}

export const TYPE_CATALOG: CategoryEntry[] = [
  {
    group: "apartment",
    groupKey: "apartment",
    subtypes: [
      { key: "appartement", value: "appartement" },
      { key: "studio", value: "studio" },
      { key: "duplex", value: "duplex" },
      { key: "triplex", value: "triplex" },
      { key: "penthouse", value: "penthouse" },
      { key: "loft", value: "loft" },
      { key: "appartement_villa", value: "appartement villa" },
      { key: "apparthotel", value: "appart'hotel" },
      { key: "chambre", value: "chambre" },
    ],
  },
  {
    group: "house",
    groupKey: "house",
    subtypes: [
      { key: "villa", value: "villa" },
      { key: "maison", value: "maison" },
      { key: "maison_de_ville", value: "maison de ville" },
      { key: "maison_de_village", value: "maison de village" },
      { key: "maison_jumelee", value: "maison jumelee" },
      { key: "maison_prefabriquee", value: "maison prefabriquee" },
      { key: "maison_dhotes", value: "maison d'hotes" },
      { key: "villa_jumelee", value: "villa jumelee" },
      { key: "bungalow", value: "bungalow" },
      { key: "chalet", value: "chalet" },
      { key: "chateau", value: "chateau" },
      { key: "chaumiere", value: "chaumiere" },
      { key: "domaine_equestre", value: "domaine equestre" },
      { key: "ferme", value: "ferme" },
      { key: "fermette", value: "fermette" },
      { key: "grange", value: "grange" },
      { key: "haras", value: "haras" },
      { key: "hotel_particulier", value: "hotel particulier" },
      { key: "manoir", value: "manoir" },
      { key: "mobile_home", value: "mobile home" },
      { key: "moulin", value: "moulin" },
      { key: "palais", value: "palais" },
      { key: "pavillon", value: "pavillon" },
      { key: "propriete", value: "propriete" },
      { key: "refuge", value: "refuge" },
      { key: "remise", value: "remise" },
      { key: "ruine", value: "ruine" },
    ],
  },
  {
    group: "land",
    groupKey: "land",
    subtypes: [
      { key: "terrain", value: "terrain" },
      { key: "terrain_constructible", value: "terrain constructible" },
      { key: "terrain_residentiel", value: "terrain residentiel" },
      { key: "terrain_commercial", value: "terrain commercial" },
      { key: "terrain_agricole", value: "terrain agricole" },
      { key: "terrain_inconstructible", value: "terrain inconstructible" },
      { key: "lac", value: "lac" },
    ],
  },
  {
    group: "commercial",
    groupKey: "commercial",
    subtypes: [
      { key: "boutique", value: "boutique" },
      { key: "commerce", value: "commerce" },
      { key: "local_commercial", value: "local commercial" },
      {
        key: "local_et_fonds_de_commerce",
        value: "local et fonds de commerce",
      },
      { key: "fonds_de_commerce", value: "fonds de commerce" },
      { key: "droit_au_bail", value: "droit au bail" },
      { key: "gerance", value: "gerance" },
      { key: "hotel", value: "hotel" },
      { key: "entreprise", value: "entreprise" },
      { key: "exploitation_agricole", value: "exploitation agricole" },
    ],
  },
  {
    group: "parking",
    groupKey: "parking",
    subtypes: [
      { key: "garage", value: "garage" },
      { key: "box", value: "box" },
      { key: "parking", value: "parking" },
    ],
  },
  {
    group: "building",
    groupKey: "building",
    subtypes: [
      { key: "immeuble", value: "immeuble" },
      { key: "ensemble_immobilier", value: "ensemble immobilier" },
      { key: "lotissement", value: "lotissement" },
      { key: "hotel_particulier", value: "hotel particulier" },
    ],
  },
  {
    group: "office",
    groupKey: "office",
    subtypes: [
      { key: "bureau", value: "bureau" },
      { key: "cabinet", value: "cabinet" },
      { key: "local", value: "local" },
    ],
  },
  {
    group: "industrial",
    groupKey: "industrial",
    subtypes: [
      { key: "atelier", value: "atelier" },
      { key: "entrepot", value: "entrepot" },
      { key: "hangar", value: "hangar" },
      { key: "usine", value: "usine" },
      { key: "cave", value: "cave" },
      { key: "box", value: "box" },
    ],
  },
];

/** Retourne toutes les valeurs de match (en lowercase normalise) d'un groupe. */
export function valuesForGroup(group: TypeGroup): string[] {
  const cat = TYPE_CATALOG.find((c) => c.group === group);
  return cat ? cat.subtypes.map((s) => s.value) : [];
}

/** Liste exhaustive (deduplique) de toutes les valeurs du catalogue. */
export function allCatalogValues(): string[] {
  const set = new Set<string>();
  for (const cat of TYPE_CATALOG) {
    for (const s of cat.subtypes) set.add(s.value);
  }
  return [...set];
}
