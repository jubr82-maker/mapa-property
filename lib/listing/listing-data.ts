// Donnees du modele d'annonce d'un bien (colonne properties.listing_data,
// jsonb, SQL 17). Module pur : forme, valeurs par defaut et assainissement
// (la meme fonction sert a l'ecran et dans l'action serveur).
//
// Champs rediges par Julien, par langue : qualificatif, phrase d'ambiance,
// atouts, pieces (texte de chaque piece), histoire du lieu, vue,
// affectation. Tout le reste est factuel (nombres, choix, cases).

export const LISTING_LANGS = ["fr", "en", "de"] as const;
export type ListingLang = (typeof LISTING_LANGS)[number];
export type PerLang = Record<ListingLang, string>;

export const LEVEL_KINDS = ["basement", "ground", "garden", "floor", "mezzanine", "attic"] as const;
export type LevelKind = (typeof LEVEL_KINDS)[number];

export const CONSTRUCTION_TYPES = ["massive", "wood", "prefab", "passive", "low_energy"] as const;
export const ORIENTATIONS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
export const HERITAGE_TYPES = ["national", "communal"] as const;
export const SERVICING_TYPES = ["full", "partial", "none"] as const;

/** Textes generes automatiquement tant que Julien ne les a pas modifies. */
export const AUTO_KEYS = ["title_fr", "title_en", "title_de", "description_fr", "description_en", "description_de"] as const;
export type AutoKey = (typeof AUTO_KEYS)[number];

export type ListingRoom = { id: string; text: PerLang };
export type ListingLevel = { id: string; kind: LevelKind; rooms: ListingRoom[] };

export type ListingFacts = {
  renovation_year?: number | null;
  cellar?: boolean;
  parking_indoor?: number | null;
  parking_outdoor?: number | null;
  monthly_charges?: number | null;
  elevator?: boolean;
  building_levels?: number | null;
  top_floor?: boolean;
  private_elevator?: boolean;
  construction?: (typeof CONSTRUCTION_TYPES)[number] | null;
  orientation?: (typeof ORIENTATIONS)[number] | null;
  garage_spaces?: number | null;
  landscaped_garden?: boolean;
  home_automation?: boolean;
  outbuildings?: number | null;
  heritage?: (typeof HERITAGE_TYPES)[number] | null;
  zone_pag?: string | null;
  servicing?: (typeof SERVICING_TYPES)[number] | null;
  shopfront?: boolean;
  shopfront_length?: number | null;
  current_rent?: number | null;
  yield_percent?: number | null;
  rent_charges?: number | null;
  deposit_months?: number | null;
  available_now?: boolean;
  available_from?: string | null;
};

export type ListingWritten = {
  qualifier: string;
  ambiance: string;
  highlights: string;
  history: string;
  view: string;
  affectation: string;
};

export type ListingData = {
  v: 1;
  written: Record<ListingLang, ListingWritten>;
  levels: ListingLevel[];
  facts: ListingFacts;
  auto: Partial<Record<AutoKey, boolean>>;
};

export const WRITTEN_KEYS = ["qualifier", "ambiance", "highlights", "history", "view", "affectation"] as const;

const emptyWritten = (): ListingWritten => ({ qualifier: "", ambiance: "", highlights: "", history: "", view: "", affectation: "" });

export function emptyListingData(): ListingData {
  return { v: 1, written: { fr: emptyWritten(), en: emptyWritten(), de: emptyWritten() }, levels: [], facts: {}, auto: {} };
}

/** Le modele est-il engage (au moins un champ redige ou une piece) ? */
export function listingEngaged(d: ListingData): boolean {
  const anyWritten = LISTING_LANGS.some((l) => WRITTEN_KEYS.some((k) => d.written[l][k].trim().length > 0));
  return anyWritten || d.levels.some((lv) => lv.rooms.some((r) => LISTING_LANGS.some((l) => r.text[l].trim())));
}

// --- Assainissement (ecran et serveur) ------------------------------------

const MAX_TEXT = 2000;
const MAX_LEVELS = 12;
const MAX_ROOMS = 40;

function str(v: unknown, max = MAX_TEXT): string {
  return typeof v === "string" ? v.replace(/\u0000/g, "").slice(0, max) : "";
}
function int(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.replace(",", ".")) : NaN;
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r < min || r > max ? null : r;
}
function dec(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}
function bool(v: unknown): boolean {
  return v === true;
}
function oneOf<T extends string>(v: unknown, list: readonly T[]): T | null {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;
}
function id(v: unknown): string {
  return typeof v === "string" && /^[a-z0-9_-]{1,40}$/i.test(v) ? v : Math.random().toString(36).slice(2, 10);
}
function perLang(v: unknown, max = 600): PerLang {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { fr: str(o.fr, max), en: str(o.en, max), de: str(o.de, max) };
}

export function sanitizeListingData(input: unknown): ListingData {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = emptyListingData();
  const w = (o.written && typeof o.written === "object" ? o.written : {}) as Record<string, unknown>;
  for (const l of LISTING_LANGS) {
    const src = (w[l] && typeof w[l] === "object" ? w[l] : {}) as Record<string, unknown>;
    out.written[l] = {
      qualifier: str(src.qualifier, 80),
      ambiance: str(src.ambiance, 600),
      highlights: str(src.highlights, 2000),
      history: str(src.history, 1500),
      view: str(src.view, 200),
      affectation: str(src.affectation, 200),
    };
  }
  const levels = Array.isArray(o.levels) ? o.levels.slice(0, MAX_LEVELS) : [];
  out.levels = levels.map((lv) => {
    const L = (lv && typeof lv === "object" ? lv : {}) as Record<string, unknown>;
    const rooms = Array.isArray(L.rooms) ? L.rooms.slice(0, MAX_ROOMS) : [];
    return {
      id: id(L.id),
      kind: oneOf(L.kind, LEVEL_KINDS) ?? "ground",
      rooms: rooms.map((r) => {
        const R = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
        return { id: id(R.id), text: perLang(R.text, 300) };
      }),
    };
  });
  const f = (o.facts && typeof o.facts === "object" ? o.facts : {}) as Record<string, unknown>;
  const facts: ListingFacts = {
    renovation_year: int(f.renovation_year, 1000, 2100),
    cellar: bool(f.cellar),
    parking_indoor: int(f.parking_indoor, 0, 500),
    parking_outdoor: int(f.parking_outdoor, 0, 500),
    monthly_charges: dec(f.monthly_charges, 0, 1_000_000),
    elevator: bool(f.elevator),
    building_levels: int(f.building_levels, 1, 200),
    top_floor: bool(f.top_floor),
    private_elevator: bool(f.private_elevator),
    construction: oneOf(f.construction, CONSTRUCTION_TYPES),
    orientation: oneOf(f.orientation, ORIENTATIONS),
    garage_spaces: int(f.garage_spaces, 0, 100),
    landscaped_garden: bool(f.landscaped_garden),
    home_automation: bool(f.home_automation),
    outbuildings: int(f.outbuildings, 0, 100),
    heritage: oneOf(f.heritage, HERITAGE_TYPES),
    zone_pag: str(f.zone_pag, 40).trim() || null,
    servicing: oneOf(f.servicing, SERVICING_TYPES),
    shopfront: bool(f.shopfront),
    shopfront_length: dec(f.shopfront_length, 0, 1000),
    current_rent: dec(f.current_rent, 0, 100_000_000),
    yield_percent: dec(f.yield_percent, 0, 100),
    rent_charges: dec(f.rent_charges, 0, 1_000_000),
    deposit_months: int(f.deposit_months, 0, 24),
    available_now: bool(f.available_now),
    available_from: typeof f.available_from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f.available_from) ? f.available_from : null,
  };
  out.facts = facts;
  const a = (o.auto && typeof o.auto === "object" ? o.auto : {}) as Record<string, unknown>;
  for (const k of AUTO_KEYS) if (typeof a[k] === "boolean") out.auto[k] = a[k] as boolean;
  return out;
}
