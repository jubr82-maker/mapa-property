// lib/countries.ts — Sprint C9 : extension a 65 pays (UE 27 + Europe hors
// UE + International HNW). Source unique consommee par <CountrySelect>,
// <PhoneInput> et lib/validators/contact.ts (validatePhone). Ordre dans
// COUNTRIES = ordre d'affichage du dropdown : LU premier (defaut), puis
// UE 27 alphabetique (hors LU), puis Europe hors UE alphabetique, puis
// International cible alphabetique.

export type Country = {
  code: string; // ISO 3166-1 alpha-2
  name_fr: string;
  name_en: string;
  name_de: string;
  phone_prefix: string; // indicatif E.164, ex "+352"
  flag: string; // emoji drapeau
};

export const COUNTRIES: Country[] = [
  // ====== LUXEMBOURG (defaut, en tete) ======
  { code: "LU", name_fr: "Luxembourg", name_en: "Luxembourg", name_de: "Luxemburg", phone_prefix: "+352", flag: "🇱🇺" },

  // ====== UE 27 (alphabetique, hors LU) ======
  { code: "AT", name_fr: "Autriche", name_en: "Austria", name_de: "Österreich", phone_prefix: "+43", flag: "🇦🇹" },
  { code: "BE", name_fr: "Belgique", name_en: "Belgium", name_de: "Belgien", phone_prefix: "+32", flag: "🇧🇪" },
  { code: "BG", name_fr: "Bulgarie", name_en: "Bulgaria", name_de: "Bulgarien", phone_prefix: "+359", flag: "🇧🇬" },
  { code: "CY", name_fr: "Chypre", name_en: "Cyprus", name_de: "Zypern", phone_prefix: "+357", flag: "🇨🇾" },
  { code: "CZ", name_fr: "Tchéquie", name_en: "Czech Republic", name_de: "Tschechien", phone_prefix: "+420", flag: "🇨🇿" },
  { code: "DE", name_fr: "Allemagne", name_en: "Germany", name_de: "Deutschland", phone_prefix: "+49", flag: "🇩🇪" },
  { code: "DK", name_fr: "Danemark", name_en: "Denmark", name_de: "Dänemark", phone_prefix: "+45", flag: "🇩🇰" },
  { code: "EE", name_fr: "Estonie", name_en: "Estonia", name_de: "Estland", phone_prefix: "+372", flag: "🇪🇪" },
  { code: "ES", name_fr: "Espagne", name_en: "Spain", name_de: "Spanien", phone_prefix: "+34", flag: "🇪🇸" },
  { code: "FI", name_fr: "Finlande", name_en: "Finland", name_de: "Finnland", phone_prefix: "+358", flag: "🇫🇮" },
  { code: "FR", name_fr: "France", name_en: "France", name_de: "Frankreich", phone_prefix: "+33", flag: "🇫🇷" },
  { code: "GR", name_fr: "Grèce", name_en: "Greece", name_de: "Griechenland", phone_prefix: "+30", flag: "🇬🇷" },
  { code: "HR", name_fr: "Croatie", name_en: "Croatia", name_de: "Kroatien", phone_prefix: "+385", flag: "🇭🇷" },
  { code: "HU", name_fr: "Hongrie", name_en: "Hungary", name_de: "Ungarn", phone_prefix: "+36", flag: "🇭🇺" },
  { code: "IE", name_fr: "Irlande", name_en: "Ireland", name_de: "Irland", phone_prefix: "+353", flag: "🇮🇪" },
  { code: "IT", name_fr: "Italie", name_en: "Italy", name_de: "Italien", phone_prefix: "+39", flag: "🇮🇹" },
  { code: "LT", name_fr: "Lituanie", name_en: "Lithuania", name_de: "Litauen", phone_prefix: "+370", flag: "🇱🇹" },
  { code: "LV", name_fr: "Lettonie", name_en: "Latvia", name_de: "Lettland", phone_prefix: "+371", flag: "🇱🇻" },
  { code: "MT", name_fr: "Malte", name_en: "Malta", name_de: "Malta", phone_prefix: "+356", flag: "🇲🇹" },
  { code: "NL", name_fr: "Pays-Bas", name_en: "Netherlands", name_de: "Niederlande", phone_prefix: "+31", flag: "🇳🇱" },
  { code: "PL", name_fr: "Pologne", name_en: "Poland", name_de: "Polen", phone_prefix: "+48", flag: "🇵🇱" },
  { code: "PT", name_fr: "Portugal", name_en: "Portugal", name_de: "Portugal", phone_prefix: "+351", flag: "🇵🇹" },
  { code: "RO", name_fr: "Roumanie", name_en: "Romania", name_de: "Rumänien", phone_prefix: "+40", flag: "🇷🇴" },
  { code: "SE", name_fr: "Suède", name_en: "Sweden", name_de: "Schweden", phone_prefix: "+46", flag: "🇸🇪" },
  { code: "SI", name_fr: "Slovénie", name_en: "Slovenia", name_de: "Slowenien", phone_prefix: "+386", flag: "🇸🇮" },
  { code: "SK", name_fr: "Slovaquie", name_en: "Slovakia", name_de: "Slowakei", phone_prefix: "+421", flag: "🇸🇰" },

  // ====== Europe hors UE (alphabetique) ======
  { code: "AD", name_fr: "Andorre", name_en: "Andorra", name_de: "Andorra", phone_prefix: "+376", flag: "🇦🇩" },
  { code: "AL", name_fr: "Albanie", name_en: "Albania", name_de: "Albanien", phone_prefix: "+355", flag: "🇦🇱" },
  { code: "BA", name_fr: "Bosnie-Herzégovine", name_en: "Bosnia and Herzegovina", name_de: "Bosnien und Herzegowina", phone_prefix: "+387", flag: "🇧🇦" },
  { code: "BY", name_fr: "Biélorussie", name_en: "Belarus", name_de: "Weißrussland", phone_prefix: "+375", flag: "🇧🇾" },
  { code: "CH", name_fr: "Suisse", name_en: "Switzerland", name_de: "Schweiz", phone_prefix: "+41", flag: "🇨🇭" },
  { code: "FO", name_fr: "Îles Féroé", name_en: "Faroe Islands", name_de: "Färöer-Inseln", phone_prefix: "+298", flag: "🇫🇴" },
  { code: "GB", name_fr: "Royaume-Uni", name_en: "United Kingdom", name_de: "Vereinigtes Königreich", phone_prefix: "+44", flag: "🇬🇧" },
  { code: "GI", name_fr: "Gibraltar", name_en: "Gibraltar", name_de: "Gibraltar", phone_prefix: "+350", flag: "🇬🇮" },
  { code: "IS", name_fr: "Islande", name_en: "Iceland", name_de: "Island", phone_prefix: "+354", flag: "🇮🇸" },
  { code: "LI", name_fr: "Liechtenstein", name_en: "Liechtenstein", name_de: "Liechtenstein", phone_prefix: "+423", flag: "🇱🇮" },
  { code: "MC", name_fr: "Monaco", name_en: "Monaco", name_de: "Monaco", phone_prefix: "+377", flag: "🇲🇨" },
  { code: "MD", name_fr: "Moldavie", name_en: "Moldova", name_de: "Moldau", phone_prefix: "+373", flag: "🇲🇩" },
  { code: "ME", name_fr: "Monténégro", name_en: "Montenegro", name_de: "Montenegro", phone_prefix: "+382", flag: "🇲🇪" },
  { code: "MK", name_fr: "Macédoine du Nord", name_en: "North Macedonia", name_de: "Nordmazedonien", phone_prefix: "+389", flag: "🇲🇰" },
  { code: "NO", name_fr: "Norvège", name_en: "Norway", name_de: "Norwegen", phone_prefix: "+47", flag: "🇳🇴" },
  { code: "RS", name_fr: "Serbie", name_en: "Serbia", name_de: "Serbien", phone_prefix: "+381", flag: "🇷🇸" },
  { code: "SM", name_fr: "Saint-Marin", name_en: "San Marino", name_de: "San Marino", phone_prefix: "+378", flag: "🇸🇲" },
  { code: "TR", name_fr: "Turquie", name_en: "Turkey", name_de: "Türkei", phone_prefix: "+90", flag: "🇹🇷" },
  { code: "UA", name_fr: "Ukraine", name_en: "Ukraine", name_de: "Ukraine", phone_prefix: "+380", flag: "🇺🇦" },
  { code: "VA", name_fr: "Vatican", name_en: "Vatican City", name_de: "Vatikanstadt", phone_prefix: "+379", flag: "🇻🇦" },
  { code: "XK", name_fr: "Kosovo", name_en: "Kosovo", name_de: "Kosovo", phone_prefix: "+383", flag: "🇽🇰" },

  // ====== International cible HNW (alphabetique) ======
  { code: "AE", name_fr: "Émirats arabes unis", name_en: "United Arab Emirates", name_de: "Vereinigte Arabische Emirate", phone_prefix: "+971", flag: "🇦🇪" },
  { code: "AU", name_fr: "Australie", name_en: "Australia", name_de: "Australien", phone_prefix: "+61", flag: "🇦🇺" },
  { code: "BR", name_fr: "Brésil", name_en: "Brazil", name_de: "Brasilien", phone_prefix: "+55", flag: "🇧🇷" },
  { code: "CA", name_fr: "Canada", name_en: "Canada", name_de: "Kanada", phone_prefix: "+1", flag: "🇨🇦" },
  { code: "CN", name_fr: "Chine", name_en: "China", name_de: "China", phone_prefix: "+86", flag: "🇨🇳" },
  { code: "HK", name_fr: "Hong Kong", name_en: "Hong Kong", name_de: "Hongkong", phone_prefix: "+852", flag: "🇭🇰" },
  { code: "IL", name_fr: "Israël", name_en: "Israel", name_de: "Israel", phone_prefix: "+972", flag: "🇮🇱" },
  { code: "JP", name_fr: "Japon", name_en: "Japan", name_de: "Japan", phone_prefix: "+81", flag: "🇯🇵" },
  { code: "LB", name_fr: "Liban", name_en: "Lebanon", name_de: "Libanon", phone_prefix: "+961", flag: "🇱🇧" },
  { code: "MA", name_fr: "Maroc", name_en: "Morocco", name_de: "Marokko", phone_prefix: "+212", flag: "🇲🇦" },
  { code: "MU", name_fr: "Île Maurice", name_en: "Mauritius", name_de: "Mauritius", phone_prefix: "+230", flag: "🇲🇺" },
  { code: "MX", name_fr: "Mexique", name_en: "Mexico", name_de: "Mexiko", phone_prefix: "+52", flag: "🇲🇽" },
  { code: "QA", name_fr: "Qatar", name_en: "Qatar", name_de: "Katar", phone_prefix: "+974", flag: "🇶🇦" },
  { code: "SA", name_fr: "Arabie saoudite", name_en: "Saudi Arabia", name_de: "Saudi-Arabien", phone_prefix: "+966", flag: "🇸🇦" },
  { code: "SG", name_fr: "Singapour", name_en: "Singapore", name_de: "Singapur", phone_prefix: "+65", flag: "🇸🇬" },
  { code: "US", name_fr: "États-Unis", name_en: "United States", name_de: "Vereinigte Staaten", phone_prefix: "+1", flag: "🇺🇸" },
  { code: "ZA", name_fr: "Afrique du Sud", name_en: "South Africa", name_de: "Südafrika", phone_prefix: "+27", flag: "🇿🇦" },
];

export const DEFAULT_COUNTRY = "LU";

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

// +1 partage US/CA : renvoie la premiere correspondance (US par ordre).
// Acceptable pour pre-remplir un indicatif ; le code pays reste choisi
// explicitement par l'utilisateur via le dropdown.
export function getCountryByPrefix(prefix: string): Country | undefined {
  const norm = prefix.startsWith("+") ? prefix : `+${prefix}`;
  return COUNTRIES.find((c) => c.phone_prefix === norm);
}

type Locale = "fr" | "en" | "de";

export function countryName(c: Country, locale: string): string {
  const l = (["fr", "en", "de"].includes(locale) ? locale : "fr") as Locale;
  return l === "en" ? c.name_en : l === "de" ? c.name_de : c.name_fr;
}

// Sprint C9 : longueurs minimales conservees pour la validation legere
// fallback (PhoneInput tooShort) ; la validation officielle passe par
// libphonenumber-js dans lib/validators/contact.ts (validatePhone).
// Couvre les 65 pays du dropdown ; defaut 6 si absent.
export const PHONE_MIN_DIGITS: Record<string, number> = {
  // UE 27
  LU: 8, AT: 10, BE: 9, BG: 8, CY: 8, CZ: 9, DE: 10, DK: 8, EE: 7, ES: 9,
  FI: 9, FR: 9, GR: 10, HR: 8, HU: 8, IE: 9, IT: 9, LT: 8, LV: 8, MT: 8,
  NL: 9, PL: 9, PT: 9, RO: 9, SE: 9, SI: 8, SK: 9,
  // Europe hors UE
  AD: 6, AL: 8, BA: 8, BY: 9, CH: 9, FO: 6, GB: 10, GI: 8, IS: 7, LI: 7,
  MC: 8, MD: 8, ME: 8, MK: 8, NO: 8, RS: 9, SM: 7, TR: 10, UA: 9, VA: 7,
  XK: 8,
  // International cible
  AE: 9, AU: 9, BR: 10, CA: 10, CN: 11, HK: 8, IL: 9, JP: 10, LB: 7,
  MA: 9, MU: 7, MX: 10, QA: 8, SA: 9, SG: 8, US: 10, ZA: 9,
};

export function phoneMinDigits(code: string): number {
  return PHONE_MIN_DIGITS[code.toUpperCase()] ?? 6;
}

// Validation serveur legere (legacy, conservee pour retro-compat ContactForm/
// NDAForm). La validation officielle Sprint C9 passe par
// lib/validators/contact.ts::validatePhone (libphonenumber-js).
export function isPlausiblePhone(combined: string): boolean {
  const s = combined.trim();
  if (!s) return false;
  const match = COUNTRIES.filter((c) => s.startsWith(c.phone_prefix)).sort(
    (a, b) => b.phone_prefix.length - a.phone_prefix.length,
  )[0];
  if (!match) return false;
  const national = s.slice(match.phone_prefix.length).replace(/\D/g, "");
  return national.length >= phoneMinDigits(match.code);
}
