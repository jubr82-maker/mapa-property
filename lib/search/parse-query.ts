// Analyseur UNIQUE des recherches en texte libre (nov. 2026), francais,
// anglais, allemand. Fonction pure : meme texte, meme resultat, aucun appel
// reseau (Mistral, en dernier recours, est appele par la route API, jamais
// ici). Utilise par /api/search-ia, la page Liste des biens et Elena.
//
// Lieux : repertoire lib/search/places.ts (registre officiel CACLR, pages de
// ville, pays, villes des biens publies), tolerant aux fautes, accents,
// majuscules, tirets et barres obliques ; code postal vers sa localite ;
// plusieurs lieux tous retenus ; "pres de", "autour de", "proche de" =
// proximite ; zones (lib/search/zones.ts). "luxe", "luxueux", "luxury" ne
// designent jamais le Luxembourg ; "Luxembourg" seul designe le pays.
import { allKeys, keyOf, lookupExact, lookupPostal, type Place } from "./places";
import { ZONES, ZONE_KEYS, type ZoneKey } from "./zones";
import { expandType } from "@/lib/taxonomy/property-types";

export type Amenity = "jardin" | "terrasse" | "garage" | "ascenseur" | "piscine";
export const AMENITIES: readonly Amenity[] = ["jardin", "terrasse", "garage", "ascenseur", "piscine"];

export interface ParsedQuery {
  /** Lieux reconnus, dans l'ordre du texte (sans doublon). */
  places: Place[];
  /** "pres de", "autour de", "proche de", "near", "in der Nahe von". */
  near: boolean;
  zones: ZoneKey[];
  /** Types de la taxonomie (familles larges : "maison" couvre toute la famille). */
  types: string[];
  /** sale, rent ou null (vente et location, la vente d'abord). */
  transaction: "sale" | "rent" | null;
  offmarket: boolean;
  budgetMin: number | null;
  budgetMax: number | null;
  bedroomsMin: number | null;
  surfaceMin: number | null;
  amenities: Amenity[];
  /** "de luxe", "luxueux", "luxury" : jamais un lieu. */
  luxury: boolean;
  /** Au moins un element utile reconnu. */
  understood: boolean;
}

export const EMPTY_QUERY: ParsedQuery = {
  places: [],
  near: false,
  zones: [],
  types: [],
  transaction: null,
  offmarket: false,
  budgetMin: null,
  budgetMax: null,
  bedroomsMin: null,
  surfaceMin: null,
  amenities: [],
  luxury: false,
  understood: false,
};

/** Minuscules, sans accents (ß -> ss), espaces simples. */
export function normText(s: string): string {
  return s
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------- types
// Mots (normalises) vers types de la taxonomie (lib/taxonomy/property-types.ts,
// familles de lib/listing/families.ts). Le plus long d'abord.
const TYPE_WORDS: [string, string[]][] = [
  ["immeuble de rapport", ["immeuble-de-rapport"]],
  ["maison de maitre", ["maison-de-maitre"]],
  ["maison jumelee", ["maison-jumelee"]],
  ["maison mitoyenne", ["maison-mitoyenne"]],
  ["maison individuelle", ["maison-individuelle"]],
  ["terrain a batir", ["terrain"]],
  ["local commercial", ["local-commercial", "commerce", "surface-commerciale", "fonds-de-commerce"]],
  ["fonds de commerce", ["fonds-de-commerce"]],
  ["semi detached house", ["maison-jumelee"]],
  ["detached house", ["maison-individuelle"]],
  ["terraced house", ["maison-mitoyenne"]],
  ["office space", ["bureau"]],
  ["building plot", ["terrain"]],
  ["appartements", ["appartement"]], ["appartement", ["appartement"]], ["apparts", ["appartement"]], ["appart", ["appartement"]], ["appt", ["appartement"]],
  ["apartments", ["appartement"]], ["apartment", ["appartement"]], ["flats", ["appartement"]], ["flat", ["appartement"]],
  ["wohnungen", ["appartement"]], ["wohnung", ["appartement"]], ["etagenwohnung", ["appartement"]], ["eigentumswohnung", ["appartement"]],
  ["studios", ["studio"]], ["studio", ["studio"]], ["penthouses", ["penthouse"]], ["penthouse", ["penthouse"]],
  ["duplex", ["duplex"]], ["triplex", ["triplex"]], ["loft", ["loft"]], ["lofts", ["loft"]],
  ["maisons", ["maison"]], ["maison", ["maison"]], ["houses", ["maison"]], ["house", ["maison"]], ["haus", ["maison"]], ["hauser", ["maison"]], ["einfamilienhaus", ["maison-individuelle"]], ["reihenhaus", ["maison-mitoyenne"]], ["doppelhaushalfte", ["maison-jumelee"]],
  ["villas", ["villa"]], ["villa", ["villa"]], ["chateau", ["chateau"]], ["castle", ["chateau"]], ["schloss", ["chateau"]],
  ["terrains", ["terrain"]], ["terrain", ["terrain"]], ["grundstuck", ["terrain"]], ["grundstueck", ["terrain"]], ["bauland", ["terrain"]], ["plot", ["terrain"]], ["land", ["terrain"]],
  ["bureaux", ["bureau"]], ["bureau", ["bureau"]], ["offices", ["bureau"]], ["office", ["bureau"]], ["buro", ["bureau"]], ["bueros", ["bureau"]], ["buero", ["bureau"]],
  ["commerces", ["commerce", "local-commercial"]], ["commerce", ["commerce", "local-commercial"]], ["shop", ["commerce", "local-commercial"]], ["retail", ["commerce", "local-commercial"]], ["geschaft", ["commerce", "local-commercial"]], ["laden", ["commerce", "local-commercial"]], ["gewerbe", ["local-professionnel"]],
  ["entrepot", ["entrepot"]], ["warehouse", ["entrepot"]], ["lager", ["entrepot"]],
  ["immeubles", ["immeuble"]], ["immeuble", ["immeuble"]], ["building", ["immeuble"]], ["mehrfamilienhaus", ["immeuble"]], ["gebaude", ["immeuble"]],
  ["parking", ["parking"]], ["stellplatz", ["parking"]], ["garage", ["garage"]], ["box", ["box"]],
];

// ---------------------------------------------------------------- autres mots
const RENT_WORDS = ["a louer", "louer", "location", "locations", "loue", "louez", "to rent", "for rent", "to let", "rent", "rental", "renting", "mieten", "miete", "zu vermieten", "vermietung", "zur miete"];
const SALE_WORDS = ["a vendre", "acheter", "achat", "vente", "vendre", "for sale", "buy", "buying", "purchase", "sale", "kaufen", "kauf", "zu verkaufen", "zum kauf", "verkauf"];
const OFFMARKET_WORDS = ["off-market", "off market", "offmarket", "hors marche"];
const NEAR_WORDS = ["pres de", "pres d'", "autour de", "autour d'", "proche de", "proche d'", "a proximite de", "aux alentours de", "aux environs de", "near", "around", "close to", "nearby", "in der nahe von", "in der naehe von", "nahe", "nahe bei", "rund um", "umgebung von"];
const LUXURY_WORDS = ["de luxe", "luxe", "luxueux", "luxueuse", "luxueuses", "luxury", "luxurious", "luxus", "luxurios", "haut de gamme", "high end", "de standing", "standing", "prestige", "prestigieux"];
const AMENITY_WORDS: [string, Amenity][] = [
  ["swimming pool", "piscine"], ["schwimmbad", "piscine"], ["piscine", "piscine"], ["pool", "piscine"],
  ["jardin", "jardin"], ["garden", "jardin"], ["garten", "jardin"],
  ["terrasse", "terrasse"], ["terrasses", "terrasse"], ["terrace", "terrasse"], ["roof terrace", "terrasse"], ["dachterrasse", "terrasse"],
  ["ascenseur", "ascenseur"], ["elevator", "ascenseur"], ["lift", "ascenseur"], ["aufzug", "ascenseur"], ["fahrstuhl", "ascenseur"],
  ["garages", "garage"], ["carport", "garage"], ["tiefgarage", "garage"],
];
// Mots sans valeur de lieu (jamais rapproches d'un nom de localite).
const STOP = new Set(
  ("a au aux avec dans de des du en et l la le les ou par pour sur un une d j je cherche recherche voudrais veux souhaite trouver moi nous " +
    "the a an and or in at of to with for i im looking want search find me my we some " +
    "der die das den dem ein eine einen und oder in im mit fur fuer ich suche mochte moechte bei von zu am " +
    "joli jolie beau belle bel grand grande petit petite moderne neuf neuve ancien ancienne renove renovee calme lumineux lumineuse vue bien biens immobilier " +
    "nice beautiful big small large modern old bright quiet property properties real estate " +
    "schon schone gross grosse klein kleine modern neu alt hell ruhig immobilie immobilien " +
    "max maximum min minimum budget moins plus entre jusqu jusqua under below over above between upto bis unter uber zwischen ab hochstens mindestens " +
    "euros euro eur mois month monat par per pro pays country land ville city stadt quartier district viertel zone region secteur " +
    "dans le sud nord est ouest centre").split(" "),
);

// ---------------------------------------------------------------- nombres
const NUM = String.raw`(\d{1,3}(?:[ .,'\u00a0]\d{3})+(?![\d])|\d+(?:[.,]\d+)?)`;
const UNIT = String.raw`(k€|keur|k|m€|meur|mio\.?|millions?|million|mn|m|tausend|thousand|€|eur|euros?)?`;
const AMOUNT = `${NUM}\\s*${UNIT}`;

function toNumber(raw: string): number {
  const s = raw.replace(/[\s\u00a0']/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(s) || /^\d{1,3}(,\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  return Number(s.replace(",", "."));
}

function amountValue(num: string, unit: string | undefined, inherit?: string): number {
  const n = toNumber(num);
  const u = (unit || inherit || "").replace(/€|eur(os?)?$/i, "").trim();
  if (/^(k|keur|tausend|thousand)$/.test(u)) return Math.round(n * 1_000);
  if (/^(m|meur|mio\.?|millions?|mn)$/.test(u)) return Math.round(n * 1_000_000);
  return Math.round(n);
}

const unitOnly = (u: string | undefined) => (u ?? "").replace(/€|eur(os?)?$/i, "").trim();

interface Work {
  text: string;
  out: ParsedQuery;
}

/** Remplace la partie reconnue par des espaces (elle n'est plus relue). */
function consume(w: Work, re: RegExp, fn: (m: RegExpExecArray) => boolean | void) {
  w.text = w.text.replace(re, (...args) => {
    const m = args.slice(0, -2) as unknown as RegExpExecArray;
    const keep = fn(m);
    return keep === false ? m[0] : " ".repeat(m[0].length);
  });
}

const phrase = (words: readonly string[]) =>
  new RegExp(`(?<![a-z0-9])(${[...words].sort((a, b) => b.length - a.length).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[\\s-]+")).join("|")})(?![a-z0-9])`, "g");

function parseNumbers(w: Work) {
  const o = w.out;
  // Chambres : "3 chambres", "3 ch", "3 bedrooms", "3 Schlafzimmer".
  consume(w, /(?<![\d.,])(\d{1,2})[\s-]*(chambres?|ch\.?|bedrooms?|beds?|bdr|schlafzimmern?|zimmern?)(?![a-z])/g, (m) => {
    o.bedroomsMin = Number(m[1]);
  });
  // Surface : "100 m2", "100m²", "100 qm", "100 sqm".
  consume(w, /(?<![\d.,])(\d{2,5}(?:[.,]\d+)?)\s*(m2|m²|qm|sqm|square metres?|square meters?|metres? carres?)(?![a-z0-9])/g, (m) => {
    o.surfaceMin = Math.round(toNumber(m[1]));
  });
  // Loyer par mois : "2 000 € par mois", "2000€/mois", "2000 per month", "2000 pro Monat".
  consume(w, new RegExp(`${AMOUNT}\\s*(?:€|eur|euros?)?\\s*(?:/|par|per|pro|a|by the|by)\\s*(?:mois|month|monat|mo)(?![a-z])`, "g"), (m) => {
    o.budgetMax = amountValue(m[1], m[2]);
    o.transaction ??= "rent";
  });
  // Fourchette : "entre 600 et 800k", "between 600k and 800k", "zwischen 600 und 800 tausend".
  consume(w, new RegExp(`(?:entre|between|zwischen|de|from|von)\\s+${AMOUNT}\\s*(?:et|and|und|a|to|bis|-)\\s*${AMOUNT}`, "g"), (m) => {
    const hi = amountValue(m[3], m[4]);
    const lo = amountValue(m[1], m[2], unitOnly(m[2]) ? undefined : m[4]);
    if (!(hi > 0) || !(lo > 0)) return false;
    o.budgetMin = Math.min(lo, hi);
    o.budgetMax = Math.max(lo, hi);
  });
  // Maximum : "max 900 000", "moins de 1M", "jusqu'a", "under", "bis", "unter".
  consume(w, new RegExp(`(?:max(?:imum)?\\.?|moins de|moins d'|jusqu'? ?a|budget(?: de| max(?:imum)?)?|under|below|up to|less than|max budget|bis|unter|hochstens|maximal|<)\\s*:?\\s*${AMOUNT}`, "g"), (m) => {
    o.budgetMax = amountValue(m[1], m[2]);
  });
  // Minimum : "plus de 500k", "a partir de", "over", "ab", "mindestens".
  consume(w, new RegExp(`(?:min(?:imum)?\\.?|plus de|au moins|a partir de|over|above|more than|at least|ab|mindestens|uber|>)\\s*:?\\s*${AMOUNT}`, "g"), (m) => {
    o.budgetMin = amountValue(m[1], m[2]);
  });
  // Montant avec unite seul ("800k", "1,2 million", "1.2M", "850 000 €") : un maximum.
  consume(w, new RegExp(`(?<![\\d.,a-z])${NUM}\\s*(k€|keur|k|m€|meur|mio\\.?|millions?|million|mn|m|tausend|thousand|€|eur|euros?)(?![a-z0-9])`, "g"), (m) => {
    const v = amountValue(m[1], m[2]);
    if (unitOnly(m[2]) === "m" && v > 50_000_000) return false;
    if (!(v >= 100)) return false;
    o.budgetMax = v;
  });
  // Code postal : "L-8410", "8410".
  consume(w, /(?<![\d.,])(?:l-?)?(\d{4})(?![\d.,])/g, (m) => {
    const hits = lookupPostal(m[1]);
    if (!hits.length) return false;
    for (const p of hits) pushPlace(o, p);
  });
  // Grand nombre seul ("850000", "850 000") : un budget maximum.
  consume(w, /(?<![\d.,])(\d{1,3}(?:[ .,'\u00a0]\d{3})+|\d{5,9})(?![\d.,])/g, (m) => {
    o.budgetMax = toNumber(m[1]);
  });
}

function pushPlace(o: ParsedQuery, p: Place) {
  if (!o.places.some((x) => x.kind === p.kind && x.name === p.name && x.commune === p.commune && x.country === p.country)) o.places.push(p);
}

/** Distance d'edition (Damerau-Levenshtein restreinte), arret au-dela de max. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

const VOCAB = new Set([
  ...TYPE_WORDS.flatMap(([w]) => w.split(" ")),
  ...RENT_WORDS.flatMap((w) => w.split(" ")),
  ...SALE_WORDS.flatMap((w) => w.split(" ")),
  ...AMENITY_WORDS.flatMap(([w]) => w.split(" ")),
  ...LUXURY_WORDS.flatMap((w) => w.split(" ")),
  ...NEAR_WORDS.flatMap((w) => w.split(" ")),
  ...ZONE_KEYS.flatMap((z) => [...ZONES[z].words]),
  ...STOP,
]);

/**
 * Mot courant qui est aussi un nom de lieu ("nice" / Nice) : lieu seulement
 * s'il est ecrit comme un nom propre (majuscule, pas en tete de phrase), ou
 * s'il est le seul mot saisi. "villa Nice", "Nice" : la ville ; "nice house" :
 * un adjectif.
 */
function writtenAsName(raw: string, token: string): boolean {
  const plain = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (plain.trim().toLowerCase() === token) return true;
  const re = new RegExp(`(?<![A-Za-z0-9])${token[0].toUpperCase()}${token.slice(1)}(?![A-Za-z0-9])`, "g");
  for (let m = re.exec(plain); m; m = re.exec(plain)) if (plain.slice(0, m.index).trim().length > 0) return true;
  return false;
}

/**
 * Analyse d'un texte libre. `extraPlaces` : villes des biens publies (hors
 * Luxembourg), cf. foreignCityPlaces.
 */
export function parseQuery(input: string, extraPlaces?: Map<string, Place[]>): ParsedQuery {
  const out: ParsedQuery = { ...EMPTY_QUERY, places: [], zones: [], types: [], amenities: [] };
  const raw = (input ?? "").slice(0, 500);
  const w: Work = { text: ` ${normText(raw)} `, out };

  // Off-market d'abord (le tiret ne doit pas couper le mot).
  consume(w, phrase(OFFMARKET_WORDS), () => {
    out.offmarket = true;
  });
  parseNumbers(w);
  consume(w, phrase(LUXURY_WORDS), () => {
    out.luxury = true;
  });

  // Proximite : marque le lieu qui suit.
  consume(w, phrase(NEAR_WORDS), () => {
    out.near = true;
  });

  // Zones : "le sud", "dans le nord", "the north", "im Suden" ; "est" seulement
  // precede de l'/the/im/dans (jamais le verbe "est").
  for (const z of ZONE_KEYS) {
    const words = ZONES[z].words.filter((x) => x !== "est" && x !== "east");
    consume(w, phrase(words), () => {
      if (!out.zones.includes(z)) out.zones.push(z);
    });
  }
  consume(w, /(?<![a-z])(?:l'|l |dans l'|a l'|de l'|the |im |in the )\s*(est|east)(?![a-z])|(?<![a-z])(osten|east)(?![a-z])/g, () => {
    if (!out.zones.includes("est")) out.zones.push("est");
  });

  // Transaction.
  consume(w, phrase(RENT_WORDS), () => {
    out.transaction = "rent";
  });
  consume(w, phrase(SALE_WORDS), () => {
    out.transaction ??= "sale";
  });

  // Equipements ("avec garage", "with garden", "mit Garten") : avant les
  // types ; "garage" seul, sans autre type, reste un type (plus bas).
  const hasOtherType = TYPE_WORDS.some(([word, types]) => !types.includes("garage") && phrase([word]).test(w.text));
  consume(w, /(?<![a-z])(?:avec|with|mit|et|and|und)\s+(?:un |une |a |an |einem |einer |einen )?(garage|parking)(?![a-z])/g, () => {
    if (!out.amenities.includes("garage")) out.amenities.push("garage");
  });
  for (const [word, a] of AMENITY_WORDS) {
    consume(w, phrase([word]), () => {
      if (!out.amenities.includes(a)) out.amenities.push(a);
    });
  }
  if (hasOtherType) {
    consume(w, phrase(["garage"]), () => {
      if (!out.amenities.includes("garage")) out.amenities.push("garage");
    });
  }

  // Types (le plus long d'abord).
  for (const [word, types] of TYPE_WORDS) {
    consume(w, phrase([word]), () => {
      for (const t of types) if (!out.types.includes(t)) out.types.push(t);
    });
  }

  // Lieux : n-grammes exacts (5 mots au plus), puis tolerance aux fautes.
  const tokens = w.text.split(/[^a-z0-9']+/).map((t) => t.replace(/^[a-z]'/, "")).filter(Boolean);
  const used = tokens.map(() => false);
  for (let i = 0; i < tokens.length; i++) {
    if (used[i]) continue;
    for (let n = Math.min(5, tokens.length - i); n >= 1; n--) {
      const span = tokens.slice(i, i + n);
      if (n === 1 && (span[0].length < 3 || /^\d+$/.test(span[0]))) continue;
      if (n === 1 && (STOP.has(span[0]) || VOCAB.has(span[0])) && !writtenAsName(raw, span[0])) continue;
      const k = keyOf(span.join(" "));
      const noSur = keyOf(span.filter((t) => t !== "sur" && t !== "s").join(" "));
      const hits = lookupExact(k, extraPlaces).length ? lookupExact(k, extraPlaces) : lookupExact(noSur, extraPlaces);
      if (hits.length) {
        for (const p of hits) pushPlace(out, p);
        for (let j = i; j < i + n; j++) used[j] = true;
        break;
      }
    }
  }
  const keys = allKeys(extraPlaces);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (used[i] || t.length < 5 || STOP.has(t) || VOCAB.has(t) || /\d/.test(t)) continue;
    const max = t.length >= 8 ? 2 : 1;
    let best: { key: string; d: number } | null = null;
    for (const k of keys) {
      if (k[0] !== t[0] || Math.abs(k.length - t.length) > max) continue;
      const d = editDistance(t, k, max);
      if (d <= max && (!best || d < best.d)) best = { key: k, d };
      if (best?.d === 0) break;
    }
    if (best) {
      for (const p of lookupExact(best.key, extraPlaces)) pushPlace(out, p);
      used[i] = true;
    }
  }

  out.understood =
    out.places.length > 0 ||
    out.zones.length > 0 ||
    out.types.length > 0 ||
    out.transaction !== null ||
    out.offmarket ||
    out.budgetMax !== null ||
    out.budgetMin !== null ||
    out.bedroomsMin !== null ||
    out.surfaceMin !== null ||
    out.amenities.length > 0;
  return out;
}

/** Types de la taxonomie couverts par la recherche (familles elargies). */
export function expandedTypes(types: readonly string[]): string[] {
  return [...new Set(types.flatMap((t) => expandType(t)))];
}

/** Valeurs connues (verification des reponses de Mistral, jamais inventees). */
export const KNOWN_TYPES = new Set(TYPE_WORDS.flatMap(([, t]) => t));
