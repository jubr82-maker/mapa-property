// Recherches en cours (oct. 2026) : forme d'une recherche, fourchette de
// budget publiee, texte tire du modele. Module pur (ecran, action serveur,
// site public, essais).
//
// Deux tables (SQL 18) :
// - property_searches : champs PUBLICS seulement (type, communes, budget en
//   fourchette, criteres, delai, textes), lisibles par le site quand la
//   recherche est publiee avec l'accord du client ;
// - property_search_private : nom, contact, budget exact, adresse actuelle,
//   notes. Admin seulement, jamais lus par le site.
import { LISTING_FAMILIES, LISTING_TYPES, familyOf, type ListingFamily } from "@/lib/listing/families";
import { formatArea, formatMoney, formatNumber, parseTypeNoun, plural, type Gender } from "@/lib/listing/language";
import type { ListingLang, PerLang } from "@/lib/listing/listing-data";
import { renderTemplate, textToHtml, type TemplateValues } from "@/lib/listing/template-engine";

export const SEARCH_STATUSES = ["draft", "published", "paused", "found", "withdrawn"] as const;
export type SearchStatus = (typeof SEARCH_STATUSES)[number];
/** Statuts visibles sur le site (avec l'accord du client). */
export const PUBLIC_SEARCH_STATUSES: readonly SearchStatus[] = ["published", "found"];

export const SEARCH_DELAYS = ["immediate", "3_months", "6_months", "12_months", "flexible"] as const;
export type SearchDelay = (typeof SEARCH_DELAYS)[number];

/** Type recherche : une famille entiere ("maison") ou un type precis. */
export const SEARCH_TYPES: string[] = [...LISTING_FAMILIES, ...LISTING_TYPES.map((t) => t.slug).filter((s) => !(LISTING_FAMILIES as readonly string[]).includes(s))];

export function isSearchType(v: unknown): v is string {
  return typeof v === "string" && SEARCH_TYPES.includes(v);
}
export function searchFamily(type: string | null | undefined): ListingFamily | null {
  if (type && (LISTING_FAMILIES as readonly string[]).includes(type)) return type as ListingFamily;
  return familyOf(type);
}

/** Colonnes publiques (lecture du site) : jamais une donnee du client. */
export const PUBLIC_SEARCH_COLUMNS =
  "id, reference, status, transaction, property_type, communes, budget_min, budget_max, bedrooms_min, surface_min, land_min, delay, criteria_fr, criteria_en, criteria_de, title_fr, title_en, title_de, description_fr, description_en, description_de, published_at, found_at, updated_at";

export type PublicSearch = {
  id: string;
  reference: string;
  status: SearchStatus;
  transaction: "sale" | "rent";
  property_type: string;
  communes: string[];
  budget_min: number | null;
  budget_max: number | null;
  bedrooms_min: number | null;
  surface_min: number | null;
  land_min: number | null;
  delay: SearchDelay | null;
  criteria_fr: string | null;
  criteria_en: string | null;
  criteria_de: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_de: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_de: string | null;
  published_at: string | null;
  found_at: string | null;
  updated_at: string | null;
};

/** Champs prives (table property_search_private). */
export type PrivateSearch = {
  client_name: string;
  client_email: string;
  client_phone: string;
  budget_exact: number | null;
  current_address: string;
  notes: string;
  source_mandate_id: string | null;
};

// --- Budget publie -----------------------------------------------------------

function step(n: number): number {
  if (n < 500_000) return 25_000;
  if (n < 1_500_000) return 50_000;
  if (n < 5_000_000) return 100_000;
  return 250_000;
}

/**
 * Fourchette publiee a partir du budget exact (jamais publie) : arrondie au
 * palier inferieur sous 90 % du budget et au palier superieur au-dela de
 * 105 %, pour que le budget exact ne se deduise pas des bornes.
 * Location : paliers de 250 EUR.
 */
export function publicBudgetRange(exact: number | null | undefined, transaction: "sale" | "rent"): { min: number; max: number } | null {
  if (typeof exact !== "number" || !Number.isFinite(exact) || exact <= 0) return null;
  const s = transaction === "rent" ? 250 : step(exact);
  const min = Math.max(s, Math.floor((exact * 0.9) / s) * s);
  let max = Math.ceil((exact * 1.05) / s) * s;
  if (max <= exact) max += s;
  return { min, max };
}

// --- Donnees du modele --------------------------------------------------------

export type SearchWritten = { criteria: PerLang };

export type SearchTemplates = { title: string; body: string };

export type SearchVocab = {
  types: Record<string, string>;
  indef: { m: string; m_vowel: string; f: string; n: string };
  or: string;
  tx: { sale: string; rent: string };
  budget_range: string;
  budget_from: string;
  budget_to: string;
  bedrooms_min: string;
  bedrooms_title: string;
  delay: Record<string, string>;
  unit_ares: string;
  type_title: string;
};

export type SearchInput = {
  reference: string;
  transaction: "sale" | "rent";
  property_type: string;
  communes: string[];
  budget_min: number | null;
  budget_max: number | null;
  bedrooms_min: number | null;
  surface_min: number | null;
  land_min: number | null;
  delay: SearchDelay | null;
  criteria: string;
};

const pos = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

function joinOr(list: string[], or: string): string {
  const l = list.map((x) => x.trim()).filter(Boolean);
  if (l.length <= 1) return l[0] ?? "";
  return `${l.slice(0, -1).join(", ")} ${or} ${l[l.length - 1]}`;
}

const FR_VOWEL = /^[aeiouyàâäéèêëîïôöùûüœæh]/i;

export function searchValues(s: SearchInput, lang: ListingLang, vocab: SearchVocab): TemplateValues {
  const type = parseTypeNoun(vocab.types[s.property_type]);
  const g: Gender = type.gender;
  const noun = [type.adj, type.noun].filter(Boolean).join(" ");
  const indef = lang === "fr" ? (g === "f" ? vocab.indef.f : vocab.indef.m) : lang === "en" ? (FR_VOWEL.test(noun) && !/^h/i.test(noun) ? vocab.indef.m_vowel : vocab.indef.m) : vocab.indef[g];
  // Allemand : adjectif du type apres l'article indefini a l'accusatif.
  const deNoun = type.adj ? `${type.adj}${g === "m" ? "en" : g === "f" ? "e" : "es"} ${type.noun}` : type.noun;
  const num = (n: number) => formatNumber(n, lang);
  const budget =
    pos(s.budget_min) && pos(s.budget_max)
      ? vocab.budget_range.replace("{min}", formatMoney(s.budget_min, lang)).replace("{max}", formatMoney(s.budget_max, lang))
      : pos(s.budget_max)
        ? vocab.budget_to.replace("{max}", formatMoney(s.budget_max, lang))
        : pos(s.budget_min)
          ? vocab.budget_from.replace("{min}", formatMoney(s.budget_min, lang))
          : "";
  const family = searchFamily(s.property_type);
  const residential = family === "appartement" || family === "maison" || family === "villa" || family === "prestige";
  return {
    reference: s.reference,
    bien: type.noun ? (lang === "de" ? deNoun : noun) : "",
    un_bien: type.noun ? `${indef} ${lang === "de" ? deNoun : noun}` : "",
    titre_bien: type.noun ? vocab.type_title.replace("{type}", lang === "de" ? (type.adj ? `${type.adj}${g === "m" ? "er" : g === "f" ? "e" : "es"} ${type.noun}` : type.noun) : noun) : "",
    a_acheter: s.transaction === "rent" ? vocab.tx.rent : vocab.tx.sale,
    communes: joinOr(s.communes, vocab.or),
    budget,
    chambres: residential && pos(s.bedrooms_min) ? plural(vocab.bedrooms_min, s.bedrooms_min, num) : "",
    chambres_titre: residential && pos(s.bedrooms_min) ? plural(vocab.bedrooms_title, s.bedrooms_min, num) : "",
    surface_min: residential && pos(s.surface_min) ? formatArea(s.surface_min, lang) : "",
    terrain_min: pos(s.land_min) ? vocab.unit_ares.replace("{n}", formatNumber(s.land_min / 100, lang)) : "",
    delai: s.delay ? vocab.delay[s.delay] ?? "" : "",
    criteres: s.criteria
      .split(/\n+/)
      .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
      .filter(Boolean)
      .map((l) => `- ${l}`)
      .join("\n"),
  };
}

export function generateSearch(s: SearchInput, lang: ListingLang, tpl: SearchTemplates, vocab: SearchVocab): { title: string; text: string; html: string } {
  const values = searchValues(s, lang, vocab);
  const flags = { location: s.transaction === "rent", vente: s.transaction !== "rent" };
  const text = renderTemplate(tpl.body, values, flags);
  const title = renderTemplate(tpl.title, values, flags).replace(/\s*\n\s*/g, " ").trim();
  return { title, text, html: textToHtml(text) };
}

/** Reference provisoire des textes d'une recherche pas encore creee. */
export const SEARCH_REF_PLACEHOLDER = "R-0000-000";

/** Reference publique : R-AAAA-NNN. */
export function nextSearchReference(year: number, existing: string[]): string {
  const prefix = `R-${year}-`;
  const max = existing.filter((r) => r.startsWith(prefix)).reduce((m, r) => Math.max(m, Number(r.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function isSearchReference(v: unknown): v is string {
  return typeof v === "string" && /^R-\d{4}-\d{3,5}$/.test(v);
}
