// Source : Observatoire de l'Habitat, Rapport d'analyse n°19 (oct 2025)
// "Les évolutions des prix des terrains à bâtir en 2023 et 2024"
// 6 zones concentriques autour de Luxembourg-Ville (modèle hédonique)

export type LandZone = 1 | 2 | 3 | 4 | 5 | 6;

// Prix médian par are converti en €/m² (1 are = 100 m²)
// Valeurs post-correction marché -14.9% entre 2022 et 2024
export const LAND_PRICE_PER_SQM: Record<LandZone, number> = {
  1: 2728, // Luxembourg-Ville (tous quartiers) — 272 821 €/are
  2: 1472, // 1ère couronne premium — 147 187 €/are
  3: 1092, // 2ème couronne — 109 176 €/are
  4: 1012, // 3ème couronne — 101 231 €/are
  5: 750, // Sud / bassin minier
  6: 450, // Nord rural
};

// Mapping commune → zone terrain
export const COMMUNE_TO_LAND_ZONE: Record<string, LandZone> = {
  // ============ Zone 1 : Luxembourg-Ville et ses 19 quartiers ============
  luxembourg: 1,
  "luxembourg-ville": 1,
  "luxembourg ville": 1,
  belair: 1,
  centre: 1,
  "centre-ville": 1,
  "centre ville": 1,
  hollerich: 1,
  merl: 1,
  weimershof: 1,
  limpertsberg: 1,
  kirchberg: 1,
  gasperich: 1,
  "gasperich-cloche-d-or": 1,
  "cloche-d-or": 1,
  "cloche d or": 1,
  cessange: 1,
  muhlenbach: 1,
  rollingergrund: 1,
  neudorf: 1,
  gare: 1,
  beggen: 1,
  bonnevoie: 1,
  eich: 1,
  dommeldange: 1,
  cents: 1,
  weimerskirch: 1,

  // ============ Zone 2 : 1ère couronne premium ============
  strassen: 2,
  bertrange: 2,
  walferdange: 2,
  hesperange: 2,
  bereldange: 2,
  steinsel: 2,
  howald: 2,
  helmsange: 2,
  leudelange: 2,
  bridel: 2,
  kopstal: 2,

  // ============ Zone 3 : 2ème couronne ============
  mamer: 3,
  mersch: 3,
  lorentzweiler: 3,
  schuttrange: 3,
  alzingen: 3,
  itzig: 3,
  moutfort: 3,
  fentange: 3,
  sandweiler: 3,
  contern: 3,
  roeser: 3,
  olm: 3,
  heisdorf: 3,
  nospelt: 3,

  // ============ Zone 4 : 3ème couronne ============
  steinfort: 4,
  capellen: 4,
  kehlen: 4,
  koerich: 4,
  hobscheid: 4,
  kaerjeng: 4,
  "käerjeng": 4,
  kleinbettingen: 4,
  junglinster: 4,
  gonderange: 4,
  bascharage: 4,
  hagen: 4,
  eischen: 4,
  mondercange: 4,
  grevenmacher: 4,
  hautcharage: 4,
  dippach: 4,
  pontpierre: 4,
  rollingen: 4,
  oetrange: 4,
  aspelt: 4,
  frisange: 4,
  hellange: 4,
  garnich: 4,

  // ============ Zone 5 : Sud / bassin minier ============
  "esch-sur-alzette": 5,
  "esch sur alzette": 5,
  esch: 5,
  differdange: 5,
  dudelange: 5,
  petange: 5,
  "pétange": 5,
  belvaux: 5,
  schifflange: 5,
  bettembourg: 5,
  soleuvre: 5,
  sanem: 5,
  rumelange: 5,
  kayl: 5,
  belval: 5,
  lamadelaine: 5,
  tetange: 5,
  oberkorn: 5,
  niederkorn: 5,
  rodange: 5,
  "mondorf-les-bains": 5,
  "mondorf les bains": 5,
  remich: 5,
  mertert: 5,
  wasserbillig: 5,
  bissen: 5,
  "colmar-berg": 5,
  schieren: 5,
  filsdorf: 5,
  peppange: 5,
  burmerange: 5,

  // ============ Zone 6 : Nord rural ============
  wiltz: 6,
  clervaux: 6,
  ettelbruck: 6,
  diekirch: 6,
  vianden: 6,
  larochette: 6,
  medernach: 6,
  mertzig: 6,
  beaufort: 6,
  echternach: 6,
  consdorf: 6,
  beckerich: 6,
  redange: 6,
  weiswampach: 6,
  pissange: 6,
  grosbous: 6,
  "erpeldange-sur-sure": 6,
  "erpeldange-sur-sûre": 6,
  lintgen: 6,
  bettendorf: 6,
  heffingen: 6,
  beidweiler: 6,
  warken: 6,
  blaschette: 6,
  "boevange-sur-attert": 6,
  stegen: 6,
  folschette: 6,
  clemency: 6,
};

export function getLandZone(commune: string, quartier?: string): LandZone {
  if (!commune) return 4; // fallback prudent
  const norm = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  // Quartier Luxembourg-Ville prioritaire
  if (quartier) {
    const q = norm(quartier);
    const z = COMMUNE_TO_LAND_ZONE[q];
    if (z !== undefined) return z;
  }
  const key = norm(commune);
  return COMMUNE_TO_LAND_ZONE[key] || 4;
}

// Coef occupation : terrain construit (POL3-6, annonces réelles 2026 —
// terrain construit Bertrange/Strassen ≈ 90-95 % du nu équivalent, validé
// Julien : 0.75 sous-évaluait structurellement toutes les maisons).
const TERRAIN_CONSTRUIT_RATIO = 0.9;

// Paliers occupation : surface excédentaire vaut moins (saturation marché)
export function calcLandValue(surfaceTerrain: number, zone: LandZone): number {
  if (!surfaceTerrain || surfaceTerrain <= 0) return 0;
  const pricePerSqm = LAND_PRICE_PER_SQM[zone];
  let value = 0;

  // Palier 1 : 0-500 m² à 100%
  const t1 = Math.min(surfaceTerrain, 500);
  value += t1 * pricePerSqm;

  if (surfaceTerrain > 500) {
    // Palier 2 : 500-1000 m² à 70%
    const t2 = Math.min(surfaceTerrain - 500, 500);
    value += t2 * pricePerSqm * 0.7;
  }
  if (surfaceTerrain > 1000) {
    // Palier 3 : 1000-2000 m² à 50%
    const t3 = Math.min(surfaceTerrain - 1000, 1000);
    value += t3 * pricePerSqm * 0.5;
  }
  // Au-delà de 2000 m² : ignoré (saturation marché)

  // Coef terrain construit
  return value * TERRAIN_CONSTRUIT_RATIO;
}
