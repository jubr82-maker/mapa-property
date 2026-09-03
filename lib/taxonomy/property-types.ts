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
      { slug: "maison", label: "Maison" },
      { slug: "maison-individuelle", label: "Maison individuelle" },
      { slug: "maison-jumelee", label: "Maison jumelée" },
      { slug: "maison-mitoyenne", label: "Maison mitoyenne" },
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
