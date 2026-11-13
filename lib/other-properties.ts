// Bloc « Autres biens » d'une fiche (nov. 2026, controle Google du 13/11 :
// des fiches recevaient moins de 3 liens internes). Module pur : quatre
// biens publies, jamais le bien lui-meme, dans cet ordre :
//   1. meme ville (meme page de ville, sinon meme localite saisie) ;
//   2. villes voisines (getNearbyCities, dans l'ordre de proximite) ; pour
//      une localite du Luxembourg sans page de ville (Hesperange, Fentange,
//      Bettembourg...), les biens a NEAR_KM au plus, du plus proche au plus
//      loin (coordonnees des localites, lib/geo/luxembourg-communes.ts) ;
//   3. meme type de bien ;
//   4. les autres biens, pour toujours en montrer quatre.
// A egalite, ordre circulaire a partir du bien (biens tries par id) : chaque
// fiche montre les biens qui la suivent, donc chaque bien est montre par
// ceux qui le precedent ; les liens se repartissent sur tous les biens au
// lieu de toujours viser les memes. Ajouter ou retirer un bien ne change
// pas l'ordre des autres (revalidation limitee aux fiches qui le montrent).
import { getNearbyCities } from "@/lib/cities";
import { cityForProperty } from "@/lib/internal-links";
import { getLocalityCoords, haversineKm } from "@/lib/geo/luxembourg-communes";
import { isLuCountry } from "@/lib/geo/lu-place-match";

export type OtherCandidate = {
  id: string;
  city?: string | null;
  country?: string | null;
  property_type?: string | null;
  badge?: string | null;
  city_page?: string | null;
  city_commune?: string | null;
};

export const OTHER_PROPERTIES_COUNT = 4;
/** Distance maximale d'un bien "voisin" sans page de ville (km). */
export const NEAR_KM = 15;

function coordsOf(p: OtherCandidate): { lat: number; lng: number } | null {
  if (!isLuCountry(p.country)) return null;
  const c = getLocalityCoords(p.city_commune || p.city);
  return c ? { lat: c.lat, lng: c.lng } : null;
}

const norm = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function pickOtherProperties<T extends OtherCandidate>(
  target: OtherCandidate,
  all: T[],
  opts: { exclude?: Iterable<string>; count?: number } = {},
): T[] {
  const count = opts.count ?? OTHER_PROPERTIES_COUNT;
  const exclude = new Set(opts.exclude ?? []);
  const targetCity = cityForProperty(target)?.slug ?? null;
  const targetPlace = norm(target.city);
  const targetType = target.property_type ?? target.badge ?? null;
  const nearby = targetCity ? getNearbyCities(targetCity).map((c) => c.slug) : [];
  const here = coordsOf(target);
  // Rang de voisinage : ordre de getNearbyCities, sinon distance (au-dela).
  const nearRank = (p: OtherCandidate, city: string | null): number => {
    const i = city ? nearby.indexOf(city) : -1;
    if (i >= 0) return i;
    const there = here ? coordsOf(p) : null;
    if (!here || !there) return -1;
    const km = haversineKm(here.lat, here.lng, there.lat, there.lng);
    return km <= NEAR_KM ? 100 + km : -1;
  };

  const ordered = [...all].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const n = ordered.length;
  // Position du bien dans l'ordre circulaire (meme s'il n'est plus publie).
  let start = ordered.findIndex((p) => p.id >= target.id);
  if (start < 0) start = n;
  const circular = (i: number) => (i - start + n) % n;

  const scored = ordered
    .map((p, i) => {
      const city = cityForProperty(p)?.slug ?? null;
      const sameCity = targetCity ? city === targetCity : Boolean(targetPlace) && norm(p.city) === targetPlace;
      const near = nearRank(p, city);
      const type = p.property_type ?? p.badge ?? null;
      const tier = sameCity ? 0 : near >= 0 ? 1 : targetType && type === targetType ? 2 : 3;
      const sameCountry = p.country && p.country === target.country ? 0 : 1;
      return { p, tier, near: tier === 1 ? near : 0, sameCountry: tier >= 2 ? sameCountry : 0, pos: circular(i) };
    })
    .filter(({ p }) => p.id !== target.id && !exclude.has(p.id));
  scored.sort((a, b) => a.tier - b.tier || a.near - b.near || a.sameCountry - b.sameCountry || a.pos - b.pos);
  return scored.slice(0, count).map((x) => x.p);
}
