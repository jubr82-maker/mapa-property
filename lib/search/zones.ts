// Zones du Luxembourg pour la recherche (nov. 2026). LISTE UNIQUE ET
// MODIFIABLE : une zone = des cantons du registre officiel (CACLR,
// lib/geo/lu-localities.ts). Les mots qui designent chaque zone (FR, EN, DE)
// sont lus par l'analyseur (lib/search/parse-query.ts).
//   nord   = Clervaux, Wiltz, Vianden, Diekirch
//   centre = Luxembourg (Ville comprise), Mersch
//   sud    = Esch-sur-Alzette
//   ouest  = Capellen, Redange
//   est    = Echternach, Grevenmacher, Remich

export const ZONES = {
  nord: { cantons: ["CLERVAUX", "WILTZ", "VIANDEN", "DIEKIRCH"], words: ["nord", "north", "norden"] },
  centre: { cantons: ["LUXEMBOURG", "LUXEMBOURG-VILLE", "MERSCH"], words: ["centre", "center", "zentrum", "mitte"] },
  sud: { cantons: ["ESCH-SUR-ALZETTE"], words: ["sud", "south", "suden", "sueden"] },
  ouest: { cantons: ["CAPELLEN", "REDANGE"], words: ["ouest", "west", "westen"] },
  est: { cantons: ["ECHTERNACH", "GREVENMACHER", "REMICH"], words: ["est", "east", "osten"] },
} as const;

export type ZoneKey = keyof typeof ZONES;

export const ZONE_KEYS = Object.keys(ZONES) as ZoneKey[];

export function isZoneKey(v: unknown): v is ZoneKey {
  return typeof v === "string" && Object.hasOwn(ZONES, v);
}

/** Cantons d'une zone (noms du registre, en majuscules). */
export function zoneCantons(zone: ZoneKey): readonly string[] {
  return ZONES[zone].cantons;
}
