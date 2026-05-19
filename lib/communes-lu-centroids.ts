// POL3-3 — Centroïdes approximatifs (lat, lon) des communes/quartiers
// luxembourgeois de lib/markets.ts + grandes villes internationales +
// fallback par pays. Best-effort : précision « centre de commune/ville »
// (pas une géoloc exacte du bien — la carte n'affiche qu'un cercle de
// 600 m, jamais de pin précis : POL3-3 / confidentialité).
//
// Aucune dépendance runtime ; utilisable serveur ou client. Le résolveur
// est tolérant (normalisation accents/casse/variantes) et renvoie aussi
// le niveau de zoom recommandé : commune LU = 13, ville intl = 11,
// pays seul = 5.

export type LatLon = { lat: number; lon: number };
export type GeoResolution = {
  center: LatLon;
  zoom: number;
  // "commune" (LU), "city" (intl), "country" (fallback pays).
  level: "commune" | "city" | "country";
  label: string;
};

// ── Communes & quartiers LU ────────────────────────────────────────────
export const LU_COMMUNE_CENTROIDS: Record<string, LatLon> = {
  // Luxembourg-Ville & quartiers premium
  "luxembourg-ville": { lat: 49.6116, lon: 6.1319 },
  luxembourg: { lat: 49.6116, lon: 6.1319 },
  belair: { lat: 49.608, lon: 6.1119 },
  limpertsberg: { lat: 49.6217, lon: 6.1206 },
  merl: { lat: 49.6047, lon: 6.1083 },
  cessange: { lat: 49.5917, lon: 6.1136 },
  kirchberg: { lat: 49.6294, lon: 6.1597 },
  bonnevoie: { lat: 49.5961, lon: 6.1397 },
  hollerich: { lat: 49.5972, lon: 6.1206 },
  gasperich: { lat: 49.5847, lon: 6.1283 },
  gare: { lat: 49.6003, lon: 6.1336 },
  cents: { lat: 49.6203, lon: 6.1656 },
  clausen: { lat: 49.6125, lon: 6.1392 },
  weimerskirch: { lat: 49.6258, lon: 6.1414 },
  rollingergrund: { lat: 49.6225, lon: 6.1147 },
  beggen: { lat: 49.6433, lon: 6.1303 },
  dommeldange: { lat: 49.6356, lon: 6.1369 },
  neudorf: { lat: 49.6181, lon: 6.1567 },
  hamm: { lat: 49.6017, lon: 6.1656 },
  // Ceinture Ouest / Capellen
  strassen: { lat: 49.6178, lon: 6.075 },
  bertrange: { lat: 49.6094, lon: 6.0656 },
  mamer: { lat: 49.6275, lon: 6.0228 },
  capellen: { lat: 49.6447, lon: 5.9914 },
  steinfort: { lat: 49.6589, lon: 5.9224 },
  kehlen: { lat: 49.6694, lon: 6.0339 },
  koerich: { lat: 49.6611, lon: 5.9608 },
  hobscheid: { lat: 49.6889, lon: 5.9419 },
  septfontaines: { lat: 49.6906, lon: 5.9933 },
  garnich: { lat: 49.6206, lon: 5.9508 },
  dippach: { lat: 49.585, lon: 5.9789 },
  kopstal: { lat: 49.6586, lon: 6.0744 },
  leudelange: { lat: 49.5703, lon: 6.0742 },
  "reckange-sur-mess": { lat: 49.5611, lon: 6.0344 },
  // Sud / Minette
  "esch-sur-alzette": { lat: 49.4958, lon: 5.9806 },
  differdange: { lat: 49.5247, lon: 5.8911 },
  dudelange: { lat: 49.4806, lon: 6.0875 },
  petange: { lat: 49.5581, lon: 5.8806 },
  "pétange": { lat: 49.5581, lon: 5.8806 },
  sanem: { lat: 49.5483, lon: 5.9269 },
  belvaux: { lat: 49.5097, lon: 5.9269 },
  "kaerjeng": { lat: 49.565, lon: 5.9156 },
  "käerjeng": { lat: 49.565, lon: 5.9156 },
  bascharage: { lat: 49.5681, lon: 5.9078 },
  bettembourg: { lat: 49.5183, lon: 6.1031 },
  schifflange: { lat: 49.505, lon: 6.0136 },
  kayl: { lat: 49.4878, lon: 6.0392 },
  tetange: { lat: 49.4744, lon: 6.0489 },
  "tétange": { lat: 49.4744, lon: 6.0489 },
  mondercange: { lat: 49.5311, lon: 5.9889 },
  rumelange: { lat: 49.4569, lon: 6.0292 },
  // Centre / Nord-Centre
  mersch: { lat: 49.7494, lon: 6.1064 },
  lintgen: { lat: 49.7178, lon: 6.1281 },
  lorentzweiler: { lat: 49.6886, lon: 6.1453 },
  walferdange: { lat: 49.6606, lon: 6.1331 },
  steinsel: { lat: 49.6764, lon: 6.1264 },
  bissen: { lat: 49.7869, lon: 6.0683 },
  "colmar-berg": { lat: 49.8108, lon: 6.0939 },
  junglinster: { lat: 49.7081, lon: 6.2531 },
  betzdorf: { lat: 49.6856, lon: 6.3506 },
  ettelbruck: { lat: 49.8475, lon: 6.1019 },
  diekirch: { lat: 49.8678, lon: 6.1606 },
  "erpeldange-sur-sure": { lat: 49.8567, lon: 6.1167 },
  "erpeldange-sur-sûre": { lat: 49.8567, lon: 6.1167 },
  schieren: { lat: 49.8333, lon: 6.1019 },
  // Est / Moselle
  niederanven: { lat: 49.6589, lon: 6.2406 },
  schuttrange: { lat: 49.6228, lon: 6.2419 },
  contern: { lat: 49.5872, lon: 6.2189 },
  sandweiler: { lat: 49.6011, lon: 6.1858 },
  "weiler-la-tour": { lat: 49.5494, lon: 6.1697 },
  hesperange: { lat: 49.5697, lon: 6.1539 },
  roeser: { lat: 49.5419, lon: 6.1469 },
  frisange: { lat: 49.5181, lon: 6.1817 },
  dalheim: { lat: 49.5414, lon: 6.2592 },
  "mondorf-les-bains": { lat: 49.5039, lon: 6.2806 },
  remich: { lat: 49.5444, lon: 6.3683 },
  stadtbredimus: { lat: 49.555, lon: 6.3589 },
  bous: { lat: 49.5394, lon: 6.3439 },
  wormeldange: { lat: 49.6072, lon: 6.4042 },
  grevenmacher: { lat: 49.6803, lon: 6.4419 },
  mertert: { lat: 49.7022, lon: 6.4775 },
  schengen: { lat: 49.4694, lon: 6.3636 },
  // Nord / Ardennes
  wiltz: { lat: 49.9669, lon: 5.9322 },
  clervaux: { lat: 50.0547, lon: 6.0289 },
  troisvierges: { lat: 50.1206, lon: 6.0008 },
  vianden: { lat: 49.9347, lon: 6.2069 },
  echternach: { lat: 49.8125, lon: 6.4214 },
  beaufort: { lat: 49.8347, lon: 6.2925 },
  larochette: { lat: 49.7889, lon: 6.2197 },
  redange: { lat: 49.7639, lon: 5.8897 },
  useldange: { lat: 49.7708, lon: 5.9756 },
  rambrouch: { lat: 49.835, lon: 5.8403 },
};

// ── Villes internationales ─────────────────────────────────────────────
export const INTL_CITY_CENTROIDS: Record<string, LatLon> = {
  // France
  paris: { lat: 48.8566, lon: 2.3522 },
  cannes: { lat: 43.5528, lon: 7.0174 },
  nice: { lat: 43.7102, lon: 7.262 },
  "saint-tropez": { lat: 43.2727, lon: 6.6407 },
  // Monaco
  monaco: { lat: 43.7384, lon: 7.4246 },
  // Belgique
  bruxelles: { lat: 50.8503, lon: 4.3517 },
  brussels: { lat: 50.8503, lon: 4.3517 },
  // Suisse
  "geneve": { lat: 46.2044, lon: 6.1432 },
  "genève": { lat: 46.2044, lon: 6.1432 },
  geneva: { lat: 46.2044, lon: 6.1432 },
  zurich: { lat: 47.3769, lon: 8.5417 },
  "zürich": { lat: 47.3769, lon: 8.5417 },
  // Allemagne
  berlin: { lat: 52.52, lon: 13.405 },
  munich: { lat: 48.1351, lon: 11.582 },
  "münchen": { lat: 48.1351, lon: 11.582 },
  // Italie
  milan: { lat: 45.4642, lon: 9.19 },
  milano: { lat: 45.4642, lon: 9.19 },
  rome: { lat: 41.9028, lon: 12.4964 },
  roma: { lat: 41.9028, lon: 12.4964 },
  // Espagne
  madrid: { lat: 40.4168, lon: -3.7038 },
  barcelone: { lat: 41.3851, lon: 2.1734 },
  barcelona: { lat: 41.3851, lon: 2.1734 },
  marbella: { lat: 36.5101, lon: -4.8824 },
  ibiza: { lat: 38.9067, lon: 1.4206 },
  majorque: { lat: 39.6953, lon: 3.0176 },
  mallorca: { lat: 39.6953, lon: 3.0176 },
  // Portugal
  lisbonne: { lat: 38.7223, lon: -9.1393 },
  lisbon: { lat: 38.7223, lon: -9.1393 },
  lisboa: { lat: 38.7223, lon: -9.1393 },
  porto: { lat: 41.1579, lon: -8.6291 },
  algarve: { lat: 37.0179, lon: -7.9304 },
  // Émirats
  "dubai": { lat: 25.2048, lon: 55.2708 },
  "dubaï": { lat: 25.2048, lon: 55.2708 },
  "abu dhabi": { lat: 24.4539, lon: 54.3773 },
  "abou dhabi": { lat: 24.4539, lon: 54.3773 },
  // Amériques
  "new york": { lat: 40.7128, lon: -74.006 },
  miami: { lat: 25.7617, lon: -80.1918 },
  "cancun": { lat: 21.1619, lon: -86.8515 },
  "cancún": { lat: 21.1619, lon: -86.8515 },
  tulum: { lat: 20.2114, lon: -87.4654 },
  // Océan Indien
  "ile maurice": { lat: -20.3484, lon: 57.5522 },
  "île maurice": { lat: -20.3484, lon: 57.5522 },
  mauritius: { lat: -20.3484, lon: 57.5522 },
};

// ── Fallback pays ──────────────────────────────────────────────────────
export const COUNTRY_CENTROIDS: Record<string, LatLon> = {
  lu: { lat: 49.8153, lon: 6.1296 },
  luxembourg: { lat: 49.8153, lon: 6.1296 },
  fr: { lat: 46.6034, lon: 1.8883 },
  france: { lat: 46.6034, lon: 1.8883 },
  be: { lat: 50.5039, lon: 4.4699 },
  belgique: { lat: 50.5039, lon: 4.4699 },
  belgium: { lat: 50.5039, lon: 4.4699 },
  ch: { lat: 46.8182, lon: 8.2275 },
  suisse: { lat: 46.8182, lon: 8.2275 },
  de: { lat: 51.1657, lon: 10.4515 },
  allemagne: { lat: 51.1657, lon: 10.4515 },
  germany: { lat: 51.1657, lon: 10.4515 },
  it: { lat: 41.8719, lon: 12.5674 },
  italie: { lat: 41.8719, lon: 12.5674 },
  italy: { lat: 41.8719, lon: 12.5674 },
  es: { lat: 40.4637, lon: -3.7492 },
  espagne: { lat: 40.4637, lon: -3.7492 },
  spain: { lat: 40.4637, lon: -3.7492 },
  pt: { lat: 39.3999, lon: -8.2245 },
  portugal: { lat: 39.3999, lon: -8.2245 },
  ae: { lat: 23.4241, lon: 53.8478 },
  emirats: { lat: 23.4241, lon: 53.8478 },
  "émirats": { lat: 23.4241, lon: 53.8478 },
  uae: { lat: 23.4241, lon: 53.8478 },
  us: { lat: 39.8283, lon: -98.5795 },
  usa: { lat: 39.8283, lon: -98.5795 },
  "etats-unis": { lat: 39.8283, lon: -98.5795 },
  mx: { lat: 23.6345, lon: -102.5528 },
  mexique: { lat: 23.6345, lon: -102.5528 },
  mu: { lat: -20.3484, lon: 57.5522 },
  maurice: { lat: -20.3484, lon: 57.5522 },
};

// Normalisation : minuscules, accents conservés (les variantes accentuées
// sont indexées) + trim + on retire un éventuel suffixe " (LU)" / virgule.
function norm(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s*\(.*?\)\s*$/, "")
    .replace(/\s+/g, " ");
}

// Retire les diacritiques combinants (plage Unicode U+0300–U+036F) pour
// une comparaison accent-insensible ("Petange" ↔ "Pétange").
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Résout une localisation (ville/commune + pays) en centre + zoom.
 * Retourne null si rien n'est exploitable (l'appelant affiche alors le
 * fallback texte, sans crash).
 */
export function resolveGeo(
  city?: string | null,
  country?: string | null,
): GeoResolution | null {
  const c = city ? norm(city) : "";
  const ctry = country ? norm(country) : "";

  if (c) {
    if (LU_COMMUNE_CENTROIDS[c]) {
      return {
        center: LU_COMMUNE_CENTROIDS[c],
        zoom: 13,
        level: "commune",
        label: city as string,
      };
    }
    // accent-insensible (ex : "Petange" vs "Pétange")
    const stripped = stripAccents(c);
    const luKey = Object.keys(LU_COMMUNE_CENTROIDS).find(
      (k) => stripAccents(k) === stripped,
    );
    if (luKey) {
      return {
        center: LU_COMMUNE_CENTROIDS[luKey],
        zoom: 13,
        level: "commune",
        label: city as string,
      };
    }
    if (INTL_CITY_CENTROIDS[c]) {
      return {
        center: INTL_CITY_CENTROIDS[c],
        zoom: 11,
        level: "city",
        label: city as string,
      };
    }
    const intlKey = Object.keys(INTL_CITY_CENTROIDS).find(
      (k) => stripAccents(k) === stripped,
    );
    if (intlKey) {
      return {
        center: INTL_CITY_CENTROIDS[intlKey],
        zoom: 11,
        level: "city",
        label: city as string,
      };
    }
  }

  if (ctry && COUNTRY_CENTROIDS[ctry]) {
    return {
      center: COUNTRY_CENTROIDS[ctry],
      zoom: 5,
      level: "country",
      label: country as string,
    };
  }

  return null;
}
