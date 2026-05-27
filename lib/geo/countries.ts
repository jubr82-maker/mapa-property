// Sprint C13-bis C2 — helper pays ISO 3166-1 + matching multi-format DB.
//
// Probleme : properties.country (Apimo) stocke le nom FR long
// ('Luxembourg', 'Émirats arabes unis', 'France', 'Portugal'),
// properties_offmarket.country stocke le code ISO ('LU').
// Le filtre UI envoie l'ISO via URL param ?country=LU.
//
// Solution :
//   - UI / URL : code ISO ('LU', 'FR', ...)
//   - Filtrage : matchesCountry tolere les 2 formats (ISO direct + nom
//     localise FR/EN/DE via Intl.DisplayNames qui retourne EXACTEMENT
//     les valeurs Apimo verifiees au runtime).
//   - Labels UI : Intl.DisplayNames natif (Node 18+ + browsers modernes).
//     Zero maintenance manuelle des 195 noms x 3 langues.
//
// Top 20 affaires affiches en premier dans le dropdown (Luxembourg en
// tete = defaut), reste alphabetique par label localise.

// ISO 3166-1 alpha-2 — 195 pays officiellement reconnus (au 2026).
const ALL_COUNTRY_CODES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AL", "AM", "AO", "AR", "AT", "AU",
  "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ",
  "BN", "BO", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CD",
  "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO", "CR", "CU",
  "CV", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC",
  "EE", "EG", "ER", "ES", "ET", "FI", "FJ", "FM", "FR", "GA",
  "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW",
  "GY", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IN", "IQ",
  "IR", "IS", "IT", "JM", "JO", "JP", "KE", "KG", "KH", "KI",
  "KM", "KN", "KP", "KR", "KW", "KZ", "LA", "LB", "LC", "LI",
  "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD",
  "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MR", "MT", "MU",
  "MV", "MW", "MX", "MY", "MZ", "NA", "NE", "NG", "NI", "NL",
  "NO", "NP", "NR", "NZ", "OM", "PA", "PE", "PG", "PH", "PK",
  "PL", "PT", "PW", "PY", "QA", "RO", "RS", "RU", "RW", "SA",
  "SB", "SC", "SD", "SE", "SG", "SI", "SK", "SL", "SM", "SN",
  "SO", "SR", "SS", "ST", "SV", "SY", "SZ", "TD", "TG", "TH",
  "TJ", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TZ", "UA",
  "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VN", "VU", "WS",
  "YE", "ZA", "ZM", "ZW",
] as const;

// Top 20 affaires MAPA Property — affiches dans cet ordre en tete du
// dropdown. Luxembourg defaut, puis Belgique/France/Allemagne (marche
// transfrontalier direct), reste Europe + ciblage HNW international.
const TOP_COUNTRY_CODES: readonly string[] = [
  "LU", "BE", "FR", "DE", "NL", "CH", "IT", "ES", "PT", "GB",
  "US", "AE", "CA", "MC", "AD", "LI", "AT", "DK", "SE", "NO",
] as const;

export const DEFAULT_COUNTRY = "LU";

/**
 * Label localise pour un code ISO via Intl.DisplayNames natif.
 * Fallback : retourne le code lui-meme si la locale n'est pas supportee
 * ou si le code est inconnu (defense en profondeur).
 */
export function countryLabel(code: string, locale: string): string {
  if (!code) return "";
  try {
    const dn = new Intl.DisplayNames([locale || "fr"], { type: "region" });
    return dn.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * Liste ordonnee pour le dropdown : top 20 en premier (ordre defini),
 * puis reste alphabetique par label localise.
 */
export function sortedCountries(
  locale: string,
): { code: string; label: string }[] {
  const top = TOP_COUNTRY_CODES.map((code) => ({
    code,
    label: countryLabel(code, locale),
  }));
  const topSet = new Set(TOP_COUNTRY_CODES);
  const rest = ALL_COUNTRY_CODES.filter((c) => !topSet.has(c))
    .map((code) => ({ code, label: countryLabel(code, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  return [...top, ...rest];
}

/**
 * Match tolerant entre la colonne DB country (formats heterogenes) et
 * le code ISO du filtre UI.
 *
 * Couvre :
 * - properties_offmarket.country = 'LU' (ISO direct)
 * - properties.country = 'Luxembourg' / 'Émirats arabes unis' / 'France' /
 *   'Portugal' (nom localise FR, valeurs Apimo verifiees runtime via
 *   Intl.DisplayNames('fr'))
 * - Defense : matche aussi le label EN et DE au cas ou Apimo livre une
 *   variante autre que FR.
 *
 * @param propertyCountry valeur brute DB (string ou null)
 * @param queryCode code ISO de la query UI (ex. 'LU')
 * @returns true si match, false sinon.
 *          Si queryCode vide -> true (pas de filtre).
 *          Si propertyCountry null/vide ET queryCode present -> false.
 */
export function matchesCountry(
  propertyCountry: string | null | undefined,
  queryCode: string | null | undefined,
): boolean {
  const q = (queryCode ?? "").trim().toUpperCase();
  if (!q) return true;
  const p = (propertyCountry ?? "").trim();
  if (!p) return false;
  // Match ISO direct (off-market)
  if (p.toUpperCase() === q) return true;
  // Match nom localise (Apimo)
  for (const loc of ["fr", "en", "de"]) {
    if (p === countryLabel(q, loc)) return true;
  }
  return false;
}
