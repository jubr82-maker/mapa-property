// Taxonomie officielle MAPA des types de biens.
// Source de vérité unique, alimente le back-office. Modifier ICI et nulle part ailleurs.

export interface PropertyTypeEntry {
  slug: string;
  label: string;
}

export interface PropertyTypeFamily {
  label: string;
  types: PropertyTypeEntry[];
}

export const FEATURED_TYPES: PropertyTypeEntry[] = [
  { slug: "appartement", label: "Appartement" },
  { slug: "maison-individuelle", label: "Maison individuelle" },
  { slug: "maison-jumelee", label: "Maison jumelée" },
  { slug: "penthouse", label: "Penthouse" },
  { slug: "villa", label: "Villa" },
];

export const PROPERTY_TYPE_FAMILIES: PropertyTypeFamily[] = [
  {
    label: "Résidentiel",
    types: [
      { slug: "appartement", label: "Appartement" },
      { slug: "studio", label: "Studio" },
      { slug: "penthouse", label: "Penthouse" },
      { slug: "loft", label: "Loft" },
      { slug: "duplex", label: "Duplex" },
      { slug: "triplex", label: "Triplex" },
      { slug: "rez-de-jardin", label: "Rez-de-jardin" },
      { slug: "maison", label: "Maison" },
      { slug: "maison-individuelle", label: "Maison individuelle" },
      { slug: "maison-jumelee", label: "Maison jumelée" },
      { slug: "maison-mitoyenne", label: "Maison mitoyenne" },
      { slug: "maison-plain-pied", label: "Maison de plain-pied" },
      { slug: "villa", label: "Villa" },
      { slug: "chalet", label: "Chalet" },
      { slug: "maison-de-maitre", label: "Maison de maître" },
      { slug: "chateau", label: "Château" },
      { slug: "propriete-domaine", label: "Propriété / Domaine" },
    ],
  },
  {
    label: "Professionnel & commercial",
    types: [
      { slug: "local-professionnel", label: "Local professionnel" },
      { slug: "bureau", label: "Bureau" },
      { slug: "commerce", label: "Commerce" },
      { slug: "local-commercial", label: "Local commercial" },
      { slug: "surface-commerciale", label: "Surface commerciale" },
      { slug: "entrepot", label: "Entrepôt" },
      { slug: "depot", label: "Dépôt" },
      { slug: "atelier", label: "Atelier" },
      { slug: "local-industriel", label: "Local industriel" },
      { slug: "fonds-de-commerce", label: "Fonds de commerce" },
    ],
  },
  {
    label: "Immeubles & investissement",
    types: [
      { slug: "immeuble", label: "Immeuble" },
      { slug: "immeuble-residentiel", label: "Immeuble résidentiel" },
      { slug: "immeuble-de-rapport", label: "Immeuble de rapport" },
      { slug: "immeuble-mixte", label: "Immeuble mixte" },
      { slug: "immeuble-de-bureaux", label: "Immeuble de bureaux" },
      { slug: "immeuble-commercial", label: "Immeuble commercial" },
      { slug: "ensemble-immobilier", label: "Ensemble immobilier" },
      { slug: "residence", label: "Résidence" },
      { slug: "residence-services", label: "Résidence-services" },
      { slug: "hotel", label: "Hôtel" },
      { slug: "residence-hoteliere", label: "Résidence hôtelière" },
    ],
  },
  {
    label: "Neuf & projets",
    types: [
      { slug: "projet-immobilier", label: "Projet immobilier" },
      { slug: "residence-neuve", label: "Résidence neuve" },
      { slug: "immeuble-a-developper", label: "Immeuble à développer" },
      {
        slug: "immeuble-a-renover-transformer",
        label: "Immeuble à rénover / transformer",
      },
    ],
  },
  {
    label: "Terrains",
    types: [
      { slug: "terrain", label: "Terrain" },
      { slug: "terrain-a-batir", label: "Terrain à bâtir" },
      { slug: "terrain-constructible", label: "Terrain constructible" },
      { slug: "terrain-avec-permis", label: "Terrain avec permis" },
      { slug: "terrain-agricole", label: "Terrain agricole" },
      { slug: "terrain-commercial", label: "Terrain commercial" },
      { slug: "terrain-industriel", label: "Terrain industriel" },
      { slug: "terrain-de-loisirs", label: "Terrain de loisirs" },
      { slug: "terrain-non-constructible", label: "Terrain non constructible" },
    ],
  },
  {
    label: "Parkings & annexes",
    types: [
      { slug: "parking", label: "Parking" },
      { slug: "garage", label: "Garage" },
      { slug: "box", label: "Box" },
    ],
  },
  {
    label: "Ruraux & spécifiques",
    types: [
      { slug: "ferme-fermette", label: "Ferme / Fermette" },
      { slug: "grange", label: "Grange" },
      { slug: "exploitation-agricole", label: "Exploitation agricole" },
      { slug: "propriete-equestre", label: "Propriété équestre" },
      { slug: "domaine-viticole", label: "Domaine viticole" },
    ],
  },
  {
    label: "Prestige & atypique",
    types: [
      { slug: "propriete-de-prestige", label: "Propriété de prestige" },
      { slug: "maison-d-architecte", label: "Maison d'architecte" },
      { slug: "hotel-particulier", label: "Hôtel particulier" },
      { slug: "manoir", label: "Manoir" },
      { slug: "bien-atypique", label: "Bien atypique" },
    ],
  },
];

export const PROPERTY_STATES: PropertyTypeEntry[] = [
  { slug: "existant-ancien", label: "Existant / Ancien" },
  { slug: "neuf", label: "Neuf" },
  { slug: "vefa", label: "VEFA" },
  { slug: "en-construction", label: "En construction" },
  { slug: "a-renover", label: "À rénover" },
  { slug: "a-transformer", label: "À transformer" },
  { slug: "renove", label: "Rénové" },
];

export const TRANSACTION_TYPES: PropertyTypeEntry[] = [
  { slug: "vente", label: "Vente" },
  { slug: "location", label: "Location" },
  { slug: "location-saisonniere", label: "Location saisonnière" },
  { slug: "vente-en-viager", label: "Vente en viager" },
  { slug: "vente-occupee", label: "Vente occupée" },
  { slug: "location-avec-option-d-achat", label: "Location avec option d'achat" },
  { slug: "cession-de-fonds-de-commerce", label: "Cession de fonds de commerce" },
  { slug: "cession-de-bail", label: "Cession de bail" },
];

// properties.transaction reste un binaire sale/rent (CHECK constraint SQL
// existante, cohérente avec tout le code : mapTransaction() Apimo,
// PropertyCard, FilterBar, matchesTypeQuery...). Les 8 types de
// TRANSACTION_TYPES sont un vocabulaire plus riche, saisi au formulaire et
// stocké en plus dans transaction_detail — jamais à la place de
// transaction. Ce regroupement décide quel binaire chaque type riche
// alimente :
// - "Cession de fonds de commerce" -> sale : transfert définitif d'un actif
//   (le fonds de commerce), argent contre propriété — même logique
//   économique qu'une vente, même si l'objet cédé n'est pas le bien
//   immobilier lui-même.
// - "Cession de bail" -> rent : transfert d'un droit d'occupation locatif
//   en cours (le bail) — la relation sous-jacente au bien reste locative,
//   pas une vente.
const TRANSACTION_TO_BASE_SALE = new Set([
  "vente",
  "vente-en-viager",
  "vente-occupee",
  "cession-de-fonds-de-commerce",
]);
const TRANSACTION_TO_BASE_RENT = new Set([
  "location",
  "location-saisonniere",
  "location-avec-option-d-achat",
  "cession-de-bail",
]);

/** Regroupe un slug TRANSACTION_TYPES vers le binaire sale/rent attendu par
 * properties.transaction. Retourne null si le slug est inconnu. */
export function transactionToBase(
  slug: string | null | undefined,
): "sale" | "rent" | null {
  if (!slug) return null;
  if (TRANSACTION_TO_BASE_SALE.has(slug)) return "sale";
  if (TRANSACTION_TO_BASE_RENT.has(slug)) return "rent";
  return null;
}

/** Libellé riche d'un slug TRANSACTION_TYPES (ex. "vente-en-viager" ->
 * "Vente en viager"), pour l'affichage fiche via transaction_detail. */
export function transactionDetailLabel(
  slug: string | null | undefined,
): string | undefined {
  if (!slug) return undefined;
  return TRANSACTION_TYPES.find((t) => t.slug === slug)?.label;
}

// Hiérarchie parent → enfants pour la recherche. Un type LARGE (clé de cette
// map) regroupe des types précis : filtrer sur le large doit remonter le
// large lui-même ET tous ses enfants ; filtrer sur un enfant ne remonte que
// lui-même (aucune remontée inverse enfant -> large). Les familles non
// listées ici (Neuf & projets, Ruraux & spécifiques, et les types Prestige
// non rattachés à MAISON) n'ont pas de hiérarchie : chaque type y reste
// autonome.
export const PARENT_TO_CHILDREN: Record<string, string[]> = {
  appartement: ["studio", "penthouse", "loft", "duplex", "triplex", "rez-de-jardin"],
  maison: [
    "maison-individuelle",
    "maison-jumelee",
    "maison-mitoyenne",
    "maison-plain-pied",
    "villa",
    "chalet",
    "maison-de-maitre",
    "chateau",
    "manoir",
    "propriete-domaine",
    "hotel-particulier",
  ],
  immeuble: [
    "immeuble-residentiel",
    "immeuble-de-rapport",
    "immeuble-mixte",
    "immeuble-de-bureaux",
    "immeuble-commercial",
    "ensemble-immobilier",
  ],
  "local-professionnel": [
    "bureau",
    "commerce",
    "local-commercial",
    "surface-commerciale",
    "entrepot",
    "depot",
    "atelier",
    "local-industriel",
    "fonds-de-commerce",
  ],
  terrain: [
    "terrain-a-batir",
    "terrain-constructible",
    "terrain-avec-permis",
    "terrain-agricole",
    "terrain-commercial",
    "terrain-industriel",
    "terrain-de-loisirs",
    "terrain-non-constructible",
  ],
  parking: ["garage", "box"],
};

/** Table inverse : enfant -> type large qui le contient. */
export const CHILD_TO_PARENT: Record<string, string> = Object.fromEntries(
  Object.entries(PARENT_TO_CHILDREN).flatMap(([parent, children]) =>
    children.map((child) => [child, parent] as const),
  ),
);

/**
 * Élargit un slug pour la recherche : si `slug` est un type large, retourne
 * [slug, ...ses enfants] ; sinon retourne [slug] seul (type précis, ou type
 * sans hiérarchie déclarée).
 */
export function expandType(slug: string): string[] {
  const children = PARENT_TO_CHILDREN[slug];
  return children ? [slug, ...children] : [slug];
}
