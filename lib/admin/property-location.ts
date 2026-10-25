// Pays et ville d'un bien saisis dans l'admin (oct. 2026), controles cote
// serveur a la creation et a la modification :
// - pays : code de la liste fermee lib/countries.ts ;
// - Luxembourg : ville = nom officiel exact d'une localite ou d'un quartier
//   du registre CACLR (lib/geo/lu-localities.ts), jamais un texte libre ;
// - autre pays : texte libre (100 caracteres au plus).
import { cities } from "@/lib/cities";
import { getCountry } from "@/lib/countries";
import { LU_PLACES } from "@/lib/geo/lu-localities";
import { findLuPlace, isLuCountry, type LuPlace } from "@/lib/geo/lu-place-match";

export type LocationCheck =
  | { ok: true; country?: string; city?: string | null }
  | { ok: false; code: "country_invalid" | "city_not_official" | "city_invalid" };

/** Code pays de la liste fermee, ou null. */
export function countryCode(value: string | null | undefined): string | null {
  return value && getCountry(value) ? value : null;
}

/**
 * Controle d'une saisie. `country` et `city` absents = non modifies ;
 * `currentCountry` et `currentCity` = valeurs deja enregistrees
 * (modification) : passer au Luxembourg exige une localite officielle.
 */
export function checkLocation(input: {
  country?: string | null;
  city?: string | null;
  commune?: string | null;
  currentCountry?: string | null;
  currentCity?: string | null;
}): LocationCheck {
  const out: { ok: true; country?: string; city?: string | null } = { ok: true };
  if (input.country !== undefined) {
    const code = countryCode(input.country);
    if (!code) return { ok: false, code: "country_invalid" };
    out.country = code;
  }
  const country = out.country ?? input.currentCountry ?? null;
  if (input.city !== undefined) {
    const city = (input.city ?? "").trim();
    if (isLuCountry(country)) {
      if (!findLuPlace(LU_PLACES, city, input.commune || null)) return { ok: false, code: "city_not_official" };
      out.city = city;
    } else {
      if (city.length > 100 || /[\u0000-\u001f]/.test(city)) return { ok: false, code: "city_invalid" };
      out.city = city || null;
    }
  } else if (out.country && isLuCountry(out.country) && !isLuCountry(input.currentCountry ?? null)) {
    if (!findLuPlace(LU_PLACES, input.currentCity ?? null, input.commune || null)) return { ok: false, code: "city_not_official" };
  }
  return out;
}

/** Liste legere des localites officielles, passee en prop a l'admin. */
export function adminLuPlaces(): LuPlace[] {
  return LU_PLACES;
}

/** Suggestions hors Luxembourg : villes des pages et leurs alias. */
export function foreignCitySuggestions(): string[] {
  const names = cities.filter((c) => c.country !== "LU").flatMap((c) => [c.name.fr, ...(c.aliases ?? [])]);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "fr"));
}
