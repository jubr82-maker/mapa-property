// lib/countries.ts — Liste cadrée des 26 marchés MAPA Property.
// Source unique consommée par <CountrySelect> (BUG 4) et <PhoneInput>
// (BUG 3). Pas d'ISO 3166 complète : seulement les marchés réellement
// traités par Julien. Luxembourg par défaut, en premier.

export type Country = {
  code: string; // ISO 3166-1 alpha-2
  name_fr: string;
  name_en: string;
  name_de: string;
  phone_prefix: string; // indicatif E.164, ex "+352"
  flag: string; // emoji drapeau
};

export const COUNTRIES: Country[] = [
  // Europe de l'Ouest — cœur de marché
  { code: "LU", name_fr: "Luxembourg", name_en: "Luxembourg", name_de: "Luxemburg", phone_prefix: "+352", flag: "🇱🇺" },
  { code: "FR", name_fr: "France", name_en: "France", name_de: "Frankreich", phone_prefix: "+33", flag: "🇫🇷" },
  { code: "BE", name_fr: "Belgique", name_en: "Belgium", name_de: "Belgien", phone_prefix: "+32", flag: "🇧🇪" },
  { code: "DE", name_fr: "Allemagne", name_en: "Germany", name_de: "Deutschland", phone_prefix: "+49", flag: "🇩🇪" },
  { code: "CH", name_fr: "Suisse", name_en: "Switzerland", name_de: "Schweiz", phone_prefix: "+41", flag: "🇨🇭" },
  { code: "MC", name_fr: "Monaco", name_en: "Monaco", name_de: "Monaco", phone_prefix: "+377", flag: "🇲🇨" },
  { code: "GB", name_fr: "Royaume-Uni", name_en: "United Kingdom", name_de: "Vereinigtes Königreich", phone_prefix: "+44", flag: "🇬🇧" },
  { code: "NL", name_fr: "Pays-Bas", name_en: "Netherlands", name_de: "Niederlande", phone_prefix: "+31", flag: "🇳🇱" },
  { code: "IT", name_fr: "Italie", name_en: "Italy", name_de: "Italien", phone_prefix: "+39", flag: "🇮🇹" },
  { code: "ES", name_fr: "Espagne", name_en: "Spain", name_de: "Spanien", phone_prefix: "+34", flag: "🇪🇸" },
  { code: "PT", name_fr: "Portugal", name_en: "Portugal", name_de: "Portugal", phone_prefix: "+351", flag: "🇵🇹" },
  { code: "AT", name_fr: "Autriche", name_en: "Austria", name_de: "Österreich", phone_prefix: "+43", flag: "🇦🇹" },
  { code: "IE", name_fr: "Irlande", name_en: "Ireland", name_de: "Irland", phone_prefix: "+353", flag: "🇮🇪" },

  // Destinations luxe / résidence secondaire
  { code: "AD", name_fr: "Andorre", name_en: "Andorra", name_de: "Andorra", phone_prefix: "+376", flag: "🇦🇩" },
  { code: "SM", name_fr: "Saint-Marin", name_en: "San Marino", name_de: "San Marino", phone_prefix: "+378", flag: "🇸🇲" },
  { code: "LI", name_fr: "Liechtenstein", name_en: "Liechtenstein", name_de: "Liechtenstein", phone_prefix: "+423", flag: "🇱🇮" },
  { code: "GR", name_fr: "Grèce", name_en: "Greece", name_de: "Griechenland", phone_prefix: "+30", flag: "🇬🇷" },
  { code: "HR", name_fr: "Croatie", name_en: "Croatia", name_de: "Kroatien", phone_prefix: "+385", flag: "🇭🇷" },
  { code: "CY", name_fr: "Chypre", name_en: "Cyprus", name_de: "Zypern", phone_prefix: "+357", flag: "🇨🇾" },
  { code: "MT", name_fr: "Malte", name_en: "Malta", name_de: "Malta", phone_prefix: "+356", flag: "🇲🇹" },

  // Amériques
  { code: "US", name_fr: "États-Unis", name_en: "United States", name_de: "Vereinigte Staaten", phone_prefix: "+1", flag: "🇺🇸" },
  { code: "CA", name_fr: "Canada", name_en: "Canada", name_de: "Kanada", phone_prefix: "+1", flag: "🇨🇦" },

  // Autres marchés HNWI / destinations
  { code: "AE", name_fr: "Émirats arabes unis", name_en: "United Arab Emirates", name_de: "Vereinigte Arabische Emirate", phone_prefix: "+971", flag: "🇦🇪" },
  { code: "MA", name_fr: "Maroc", name_en: "Morocco", name_de: "Marokko", phone_prefix: "+212", flag: "🇲🇦" },
  { code: "MU", name_fr: "Île Maurice", name_en: "Mauritius", name_de: "Mauritius", phone_prefix: "+230", flag: "🇲🇺" },
  { code: "SC", name_fr: "Seychelles", name_en: "Seychelles", name_de: "Seychellen", phone_prefix: "+248", flag: "🇸🇨" },
];

export const DEFAULT_COUNTRY = "LU";

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

// +1 partagé US/CA : renvoie la première correspondance (US). Acceptable
// pour pré-remplir un indicatif ; le code pays reste choisi explicitement.
export function getCountryByPrefix(prefix: string): Country | undefined {
  const norm = prefix.startsWith("+") ? prefix : `+${prefix}`;
  return COUNTRIES.find((c) => c.phone_prefix === norm);
}

type Locale = "fr" | "en" | "de";

export function countryName(c: Country, locale: string): string {
  const l = (["fr", "en", "de"].includes(locale) ? locale : "fr") as Locale;
  return l === "en" ? c.name_en : l === "de" ? c.name_de : c.name_fr;
}

// Longueur minimale (chiffres, hors indicatif) du numéro national —
// validation client/serveur légère, sans dépendance externe (BUG 3).
export const PHONE_MIN_DIGITS: Record<string, number> = {
  LU: 6, FR: 9, BE: 8, DE: 7, CH: 9, MC: 8, GB: 9, NL: 9, IT: 9,
  ES: 9, PT: 9, AT: 7, IE: 7, AD: 6, SM: 7, LI: 7, GR: 10, HR: 8,
  CY: 8, MT: 8, US: 10, CA: 10, AE: 8, MA: 9, MU: 7, SC: 7,
};

export function phoneMinDigits(code: string): number {
  return PHONE_MIN_DIGITS[code.toUpperCase()] ?? 6;
}
