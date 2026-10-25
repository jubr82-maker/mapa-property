// Referentiel officiel des localites du Luxembourg (oct. 2026), genere par
// scripts/geo/build-lu-localities.mjs depuis le registre CACLR (licence
// CC0). Lu cote serveur seulement : l'admin recoit la liste legere
// (luPlaces) en prop, le site public ne l'embarque jamais.
import data from "./lu-localities.json";
import type { LuPlace } from "./lu-place-match";

export type LuLocality = { name: string; commune: string; canton: string; postalCodes: string[] };

export const LU_LOCALITIES_FILE_DATE: string | null = data.fileDate;
export const LU_COMMUNES: { name: string; canton: string }[] = data.communes;
export const LU_LOCALITIES: LuLocality[] = data.localities;
export const LU_QUARTIERS: { name: string; commune: string }[] = data.quartiers;

/** Liste legere pour la recherche et le rattachement : localites, puis quartiers de la Ville. */
export const LU_PLACES: LuPlace[] = [
  ...LU_LOCALITIES.map((l) => ({ name: l.name, commune: l.commune })),
  ...LU_QUARTIERS.map((q) => ({ name: q.name, commune: q.commune, quartier: true })),
];
