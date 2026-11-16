// Import d'une annonce collee (nov. 2026). Module pur : consigne donnee a
// Mistral (reconnaissance seulement, JSON, temperature 0) et CONTROLE de sa
// reponse contre le texte colle. Regle : rien n'est invente.
//   - listes fermees (transaction, type, pays, classes energie) : valeur de
//     la liste ET mot correspondant present dans le texte colle ;
//   - commune et localite : registre officiel de l'admin (CACLR), jamais un
//     texte libre au Luxembourg, et nom present dans le texte colle ;
//   - chiffres (prix, charges, surfaces, pieces, annee) : le chiffre doit
//     figurer tel quel dans le texte colle, sinon il est refuse ;
//   - titre : present dans le texte colle ;
//   - description : passage du texte colle (debut et fin reperes par
//     Mistral, texte recopie depuis la source, jamais depuis Mistral) ;
//   - prestations : seulement si le mot figure dans le texte colle.
// Ce qui n'est pas reconnu avec certitude reste vide et passe "a completer".
import { LISTING_TYPES, ENERGY_CLASSES } from "@/lib/listing/families";
import { PROPERTY_TYPE_FAMILIES, TRANSACTION_TYPES } from "@/lib/taxonomy/property-types";
import { COUNTRIES } from "@/lib/countries";
import { resolveLuPlace, type LuPlace } from "@/lib/geo/lu-place-match";

/** Types acceptes a la creation ET a la modification d'un bien. */
export const IMPORT_TYPES: string[] = LISTING_TYPES.map((t) => t.slug).filter((s) => PROPERTY_TYPE_FAMILIES.some((f) => f.types.some((t) => t.slug === s)));
export const IMPORT_TRANSACTIONS: string[] = TRANSACTION_TYPES.map((t) => t.slug);

/** Champs remplis par l'import (ordre d'affichage du resume). */
export const IMPORT_FIELDS = [
  "title_fr",
  "transaction",
  "property_type",
  "country",
  "city",
  "price",
  "monthly_charges",
  "living_surface",
  "usable_surface",
  "land_surface",
  "terrace_surface",
  "balcony_surface",
  "garden_surface",
  "bedrooms",
  "bathrooms",
  "floor",
  "year",
  "energy",
  "thermal",
  "availability",
  "amenities",
  "description_fr",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const AMENITY_KEYS = ["has_pool", "has_laundry", "has_dressing", "cellar", "elevator", "home_automation", "landscaped_garden"] as const;
export type AmenityKey = (typeof AMENITY_KEYS)[number];

export type ImportedValues = {
  title_fr: string | null;
  transaction: string | null;
  property_type: string | null;
  country: string | null;
  city: string | null;
  city_commune: string | null;
  price: number | null;
  monthly_charges: number | null;
  surface: number | null;
  living_surface: number | null;
  usable_surface: number | null;
  land_surface: number | null;
  terrace_surface: number | null;
  balcony_surface: number | null;
  garden_surface: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  year: number | null;
  energy: string | null;
  thermal: string | null;
  available_now: boolean;
  available_from: string | null;
  parking: number | null;
  garage_spaces: number | null;
  amenities: Record<AmenityKey, boolean>;
  /** Texte brut de la description, recopie du texte colle. */
  description_fr: string | null;
};

export type ImportValidation = {
  values: ImportedValues;
  filled: ImportField[];
  todo: ImportField[];
  /** Valeurs proposees par Mistral et refusees (absentes du texte colle). */
  rejected: { field: string; value: string }[];
};

/** Texte envoye a Mistral : 15 000 caracteres au plus. */
export const SOURCE_MAX = 15000;

// --- Consigne ----------------------------------------------------------------

export function extractionMessages(source: string): { role: "system" | "user"; content: string }[] {
  const system = `You read a real estate listing copied from a web page (it may contain menus and unrelated text) and return ONE JSON object.
Rules:
- Only report what the listing states explicitly. When a value is not written, use null. Never guess, never compute, never convert units.
- Copy numbers exactly as written in the text (digits only, no thousands separators, decimal point "."): price 1250000, surface 348.5.
- "transaction": one of ${IMPORT_TRANSACTIONS.map((s) => `"${s}"`).join(", ")} ("vente" for a sale, "location" for a rent).
- "property_type": one of ${IMPORT_TYPES.map((s) => `"${s}"`).join(", ")}.
- "country": ISO code, one of ${COUNTRIES.map((c) => `"${c.code}"`).join(", ")}.
- "locality": the town or district of the property, exactly as written; "commune": its municipality if written.
- "energy" and "thermal": energy class and insulation class, one of ${ENERGY_CLASSES.map((c) => `"${c}"`).join(", ")}.
- "floor": the floor as written (for example "2" or "rez-de-chaussée").
- "available_now": true only if the text says available immediately; "available_from": date YYYY-MM-DD only if written.
- Booleans for amenities: true only if the text states it, otherwise false.
- "description_start": the first 8 words of the main descriptive paragraph, copied exactly; "description_end": its last 8 words, copied exactly. The description may span several paragraphs.
Keys: title, transaction, property_type, country, locality, commune, address, price, monthly_charges, living_surface, usable_surface, land_surface, terrace_surface, balcony_surface, garden_surface, bedrooms, bathrooms, floor, year_built, energy, thermal, available_now, available_from, parking, garage_spaces, has_pool, has_laundry, has_dressing, cellar, elevator, home_automation, landscaped_garden, description_start, description_end.`;
  return [
    { role: "system", content: system },
    { role: "user", content: source.slice(0, SOURCE_MAX) },
  ];
}

// --- Chiffres ----------------------------------------------------------------

/**
 * Tous les nombres ecrits dans un texte, avec leurs lectures possibles :
 * "1 250 000", "1.250.000", "1'250'000", "348,5", "1.250" (1250 ou 1,25).
 */
export function numbersInText(text: string): number[] {
  const out = new Set<number>();
  const re = /\d{1,3}(?:[ \u00A0\u202F.,'’]\d{3})+(?:[.,]\d{1,2})?(?!\d)|\d+(?:[.,]\d+)?/g;
  for (const m of String(text ?? "").matchAll(re)) {
    const raw = m[0];
    const parts = raw.split(/[ \u00A0\u202F'’]/);
    for (const p of parts) addReadings(p, out);
    addReadings(raw.replace(/[ \u00A0\u202F'’]/g, ""), out);
  }
  return [...out];
}

function addReadings(s: string, out: Set<number>) {
  if (!s) return;
  const seps = [...s.matchAll(/[.,]/g)];
  if (!seps.length) {
    out.add(Number(s));
    return;
  }
  const last = seps[seps.length - 1];
  const tail = s.slice((last.index ?? 0) + 1);
  const head = s.slice(0, last.index).replace(/[.,]/g, "");
  // Separateur de milliers partout.
  if (/^\d{3}$/.test(tail)) out.add(Number(head + tail));
  // Dernier separateur decimal.
  out.add(Number(`${head}.${tail}`));
}

export function numberInSource(value: number, nums: number[]): boolean {
  return nums.some((n) => Math.abs(n - value) < 1e-6);
}

// --- Texte -------------------------------------------------------------------

/** Forme de comparaison : sans accents, minuscules, espaces et ponctuation reduits. */
export function looseKey(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();
}

function containsLoose(source: string, needle: string): boolean {
  const n = looseKey(needle);
  return n.length > 0 && ` ${looseKey(source)} `.includes(` ${n} `);
}

/**
 * Passage de la description dans le texte colle, du debut a la fin donnes
 * par Mistral. Le texte rendu est celui de la SOURCE (lignes conservees).
 */
export function sliceDescription(source: string, start: string | null, end: string | null): string | null {
  if (!start) return null;
  // Index de chaque caractere de la forme reduite vers la source.
  const map: number[] = [];
  let reduced = "";
  let prevSpace = true;
  const norm = source.normalize("NFC");
  for (let i = 0; i < norm.length; i++) {
    const ch = looseKey(norm[i]);
    if (!ch || ch === " ") {
      if (!prevSpace) {
        reduced += " ";
        map.push(i);
        prevSpace = true;
      }
      continue;
    }
    for (const c of ch) {
      reduced += c;
      map.push(i);
    }
    prevSpace = false;
  }
  const s = looseKey(start);
  const from = s ? reduced.indexOf(s) : -1;
  if (from < 0) return null;
  let to = reduced.length;
  if (end) {
    const e = looseKey(end);
    const at = e ? reduced.indexOf(e, from) : -1;
    if (at < 0) return null;
    to = at + e.length;
  } else {
    return null;
  }
  const a = map[from];
  let b = map[Math.min(to, map.length) - 1] + 1;
  // Ponctuation finale de la phrase incluse.
  while (b < norm.length && /[.)»"]/.test(norm[b])) b++;
  const text = norm.slice(a, b).trim();
  return text.length >= 60 ? text : null;
}

// --- Listes fermees et mots-temoins ---------------------------------------------

const TX_WORDS: Record<string, RegExp> = {
  vente: /\b(vente|a vendre|vendre|for sale|sale|zu verkaufen|verkauf|kauf)\b/,
  location: /\b(location|a louer|louer|loyer|for rent|to let|rent|zu vermieten|miete|vermietung)\b/,
  "location-saisonniere": /\b(saisonniere|seasonal|ferienwohnung)\b/,
  "vente-en-viager": /\bviager\b/,
  "vente-occupee": /\b(vente occupee|occupe|occupied)\b/,
  "location-avec-option-d-achat": /\boption d'?\s?achat\b/,
  "cession-de-fonds-de-commerce": /\bfonds de commerce\b/,
  "cession-de-bail": /\bcession de bail\b/,
};

const TYPE_WORDS: Record<string, RegExp> = {
  appartement: /\b(appartement|apartment|flat|wohnung)\b/,
  studio: /\bstudio\b/,
  duplex: /\bduplex\b/,
  triplex: /\btriplex\b/,
  "rez-de-jardin": /\brez de jardin\b/,
  penthouse: /\bpenthouse\b/,
  "maison-individuelle": /\b(maison|house|haus|einfamilienhaus)\b/,
  "maison-jumelee": /\b(jumelee|semi detached|doppelhaus)/,
  "maison-mitoyenne": /\b(mitoyenne|terraced|reihenhaus)/,
  "maison-plain-pied": /\b(plain pied|bungalow)\b/,
  "maison-de-maitre": /\b(maison de maitre|mansion|herrenhaus)\b/,
  villa: /\bvilla\b/,
  chateau: /\b(chateau|castle|schloss)\b/,
  "propriete-domaine": /\b(domaine|propriete|estate|anwesen)\b/,
  terrain: /\b(terrain|plot|land|grundstuck|bauland)\b/,
  "local-commercial": /\b(local commercial|commercial|gewerbe)/,
  bureau: /\b(bureau|bureaux|office|offices|buro)\b/,
  "fonds-de-commerce": /\bfonds de commerce\b/,
  commerce: /\b(commerce|shop|laden|geschaft)\b/,
  entrepot: /\b(entrepot|warehouse|lager|lagerhalle)\b/,
  parking: /\b(parking|stellplatz)\b/,
  garage: /\bgarage\b/,
};

const AMENITY_WORDS: Record<AmenityKey, RegExp> = {
  has_pool: /\b(piscine|pool|schwimmbad)\b/,
  has_laundry: /\b(buanderie|laundry|waschkuche|hauswirtschaftsraum)\b/,
  has_dressing: /\b(dressing|walk in|ankleide)/,
  cellar: /\b(cave|cellar|keller)\b/,
  elevator: /\b(ascenseur|elevator|lift|aufzug|fahrstuhl)\b/,
  home_automation: /\b(domotique|home automation|smart home|hausautomation)\b/,
  landscaped_garden: /\b(jardin paysager|landscaped|angelegter garten)\b/,
};

const ENERGY_CONTEXT = /(energ|isolation|thermi|cpe|passeport|passport|effizienz|warmeschutz|damm|klasse|classe|class)/;

function energyInSource(src: string, cls: string): boolean {
  const c = cls.toLowerCase().replace("+", "\\+");
  return new RegExp(`${ENERGY_CONTEXT.source}[^\\n]{0,40}?(?<![\\p{L}\\d])${c}(?![\\p{L}\\d+])`, "u").test(src);
}

const str = (v: unknown, max = 300): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : null);

function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || !v.trim()) return null;
  const n = Number(v.replace(/[\s\u00A0\u202F']/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// --- Controle ----------------------------------------------------------------

export type ValidateContext = { luPlaces: LuPlace[]; now?: Date };

export function validateExtraction(raw: Record<string, unknown> | null, source: string, ctx: ValidateContext): ImportValidation {
  const r = raw ?? {};
  const src = looseKey(source);
  const nums = numbersInText(source);
  const rejected: { field: string; value: string }[] = [];
  const reject = (field: string, v: unknown) => {
    if (v !== null && v !== undefined && v !== "" && v !== false) rejected.push({ field, value: String(v).slice(0, 120) });
  };

  const number = (key: string, field: string, min: number, max: number, integer = false): number | null => {
    const n = toNum(r[key]);
    if (n == null) return null;
    if (n < min || n > max || (integer && !Number.isInteger(n)) || !numberInSource(n, nums)) {
      reject(field, r[key]);
      return null;
    }
    return n;
  };

  // Titre.
  let title = str(r.title, 200);
  if (title && !containsLoose(source, title)) {
    reject("title_fr", title);
    title = null;
  }

  // Transaction et type.
  let transaction = str(r.transaction, 60);
  if (transaction && (!IMPORT_TRANSACTIONS.includes(transaction) || !TX_WORDS[transaction]?.test(src))) {
    reject("transaction", transaction);
    transaction = null;
  }
  let type = str(r.property_type, 60);
  if (type && (!IMPORT_TYPES.includes(type) || !TYPE_WORDS[type]?.test(src))) {
    reject("property_type", type);
    type = null;
  }

  // Lieu : registre officiel au Luxembourg.
  let country = str(r.country, 4)?.toUpperCase() ?? null;
  if (country && !COUNTRIES.some((c) => c.code === country)) {
    reject("country", country);
    country = null;
  }
  const locality = str(r.locality, 100);
  const communeHint = str(r.commune, 100);
  let city: string | null = null;
  let cityCommune: string | null = null;
  const inSource = (s: string | null) => Boolean(s && containsLoose(source, s));
  if (!country || country === "LU") {
    for (const name of [locality, communeHint]) {
      if (!name || !inSource(name)) continue;
      const res = resolveLuPlace(ctx.luPlaces, name, communeHint && name !== communeHint ? communeHint : null);
      const place = res.status === "ok" ? res.place : null;
      if (place && !place.communeOnly) {
        city = place.name;
        cityCommune = place.commune;
        country = "LU";
        break;
      }
    }
    if (!city && locality) reject("city", locality);
  } else if (locality && inSource(locality)) {
    city = locality;
  } else if (locality) {
    reject("city", locality);
  }
  if (country && !city && country !== "LU" && !inSource(COUNTRIES.find((c) => c.code === country)?.name_fr ?? "") && !inSource(COUNTRIES.find((c) => c.code === country)?.name_en ?? "")) {
    reject("country", country);
    country = null;
  }

  // Chiffres.
  const year = (now: Date) => now.getFullYear() + 5;
  const price = number("price", "price", 1, 1e9);
  const charges = number("monthly_charges", "monthly_charges", 1, 1e6);
  const living = number("living_surface", "living_surface", 1, 1e5);
  const usable = number("usable_surface", "usable_surface", 1, 1e6);
  const land = number("land_surface", "land_surface", 1, 1e8);
  const terrace = number("terrace_surface", "terrace_surface", 1, 1e5);
  const balcony = number("balcony_surface", "balcony_surface", 1, 1e5);
  const garden = number("garden_surface", "garden_surface", 1, 1e7);
  const bedrooms = number("bedrooms", "bedrooms", 0, 100, true);
  const bathrooms = number("bathrooms", "bathrooms", 0, 100, true);
  const built = number("year_built", "year", 1500, year(ctx.now ?? new Date()), true);
  const parking = number("parking", "parking", 0, 1000, true);
  const garages = number("garage_spaces", "parking", 0, 1000, true);

  // Etage : chiffre present, ou rez-de-chaussee ecrit.
  let floor = str(r.floor, 40);
  if (floor) {
    const n = toNum(floor);
    const ground = /^(rez|rdc|ground|erdgeschoss|eg$)/i.test(looseKey(floor)) && /\b(rez de chaussee|rdc|ground floor|erdgeschoss)\b/.test(src);
    if (ground) floor = "Rez-de-chaussée";
    else if (n != null && Number.isInteger(n) && n >= -5 && n <= 200 && numberInSource(n, nums)) floor = String(n);
    else {
      reject("floor", floor);
      floor = null;
    }
  }

  // Classes energie.
  const cls = (key: "energy" | "thermal"): string | null => {
    const v = str(r[key], 3)?.toUpperCase() ?? null;
    if (!v) return null;
    if (!(ENERGY_CLASSES as readonly string[]).includes(v) || !energyInSource(src, v)) {
      reject(key, v);
      return null;
    }
    return v;
  };
  const energy = cls("energy");
  const thermal = cls("thermal");

  // Disponibilite.
  const availableNow = r.available_now === true && /\b(immediatement|de suite|tout de suite|immediately|sofort)\b/.test(src);
  let availableFrom = str(r.available_from, 10);
  if (availableFrom) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(availableFrom);
    const ok = m && numberInSource(Number(m[1]), nums) && (numberInSource(Number(m[3]), nums) || new RegExp(`\\b${Number(m[3])}\\b`).test(src));
    if (!ok) {
      reject("availability", availableFrom);
      availableFrom = null;
    }
  }

  // Prestations : la case n'est cochee que si le mot figure dans le texte.
  const amenities = Object.fromEntries(AMENITY_KEYS.map((k) => [k, r[k] === true && AMENITY_WORDS[k].test(src)])) as Record<AmenityKey, boolean>;

  const description = sliceDescription(source, str(r.description_start, 400), str(r.description_end, 400));

  const values: ImportedValues = {
    title_fr: title,
    transaction,
    property_type: type,
    country,
    city,
    city_commune: cityCommune,
    price,
    monthly_charges: charges,
    surface: living ?? usable,
    living_surface: living,
    usable_surface: usable,
    land_surface: land,
    terrace_surface: terrace,
    balcony_surface: balcony,
    garden_surface: garden,
    bedrooms,
    bathrooms,
    floor,
    year: built,
    energy,
    thermal,
    available_now: availableNow,
    available_from: availableNow ? null : availableFrom,
    parking,
    garage_spaces: garages,
    amenities,
    description_fr: description,
  };

  const has: Record<ImportField, boolean> = {
    title_fr: Boolean(title),
    transaction: Boolean(transaction),
    property_type: Boolean(type),
    country: Boolean(country),
    city: Boolean(city),
    price: price != null,
    monthly_charges: charges != null,
    living_surface: living != null,
    usable_surface: usable != null,
    land_surface: land != null,
    terrace_surface: terrace != null,
    balcony_surface: balcony != null,
    garden_surface: garden != null,
    bedrooms: bedrooms != null,
    bathrooms: bathrooms != null,
    floor: Boolean(floor),
    year: built != null,
    energy: Boolean(energy),
    thermal: Boolean(thermal),
    availability: availableNow || Boolean(availableFrom),
    amenities: Object.values(amenities).some(Boolean) || parking != null || garages != null,
    description_fr: Boolean(description),
  };
  const filled = IMPORT_FIELDS.filter((f) => has[f]);
  // A completer : champs essentiels non reconnus, plus tout champ propose et refuse.
  const essential: ImportField[] = ["title_fr", "transaction", "property_type", "country", "city", "price", "living_surface", "bedrooms", "energy", "description_fr"];
  const rejectedFields = new Set(rejected.map((x) => x.field));
  const todo = IMPORT_FIELDS.filter((f) => !has[f] && (essential.includes(f) || rejectedFields.has(f)));
  return { values, filled, todo, rejected };
}

/** Lieu affichable (pour le resume). */
export function placeLabel(v: ImportedValues): string {
  return [v.city, v.city_commune && v.city_commune !== v.city ? `(${v.city_commune})` : null].filter(Boolean).join(" ");
}

