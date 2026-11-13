// Title Google d'une page de recherche (nov. 2026, controle Google du
// 13/11 : titres de 72 a 123 caracteres). Module pur. Titre court : type de
// bien et lieu (communes entieres, autant qu'il en tient), puis
// ", MAPA Property" seulement s'il reste de la place. Trop long meme avec
// une seule commune : coupe propre sur un mot entier. Deux recherches au
// meme titre : la reference les distingue (jamais deux titres identiques).
import { CONTROLE_TITLE_LENGTH } from "@/lib/pilotage/config";

export const SEARCH_TITLE_MAX = CONTROLE_TITLE_LENGTH.max;
export const SEARCH_TITLE_MIN = CONTROLE_TITLE_LENGTH.min;
const BRAND = ", MAPA Property";

export type SearchTitleTemplates = {
  /** Sans lieu, ex. "Recherche : {type}". */
  type: string;
  /** Avec lieu, ex. "Recherche : {type} à {place}". */
  place: string;
};

const fill = (tpl: string, v: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

/** Coupe sur un mot entier, sans ponctuation ni petit mot de liaison en fin. */
export function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = text.slice(0, max + 1);
  const space = out.lastIndexOf(" ");
  out = space > 0 ? out.slice(0, space) : text.slice(0, max);
  for (;;) {
    const next = out.replace(/[\s,;:·(]+$/, "").replace(/\s+(à|a|au|aux|en|et|de|du|des|in|and|or|und|oder|im|bei)$/i, "");
    if (next === out) break;
    out = next;
  }
  return out;
}

export function searchTitle(
  s: { reference: string; communes: string[] },
  typeLabel: string,
  tpl: SearchTitleTemplates,
  opts: { duplicate?: boolean; max?: number; min?: number } = {},
): string {
  const max = opts.max ?? SEARCH_TITLE_MAX;
  const min = opts.min ?? SEARCH_TITLE_MIN;
  const communes = s.communes.map((c) => c.trim()).filter(Boolean);
  let base = fill(tpl.type, { type: typeLabel });
  for (let k = communes.length; k >= 1; k--) {
    const candidate = fill(tpl.place, { type: typeLabel, place: communes.slice(0, k).join(", ") });
    if (candidate.length <= max || k === 1) {
      base = candidate;
      break;
    }
  }
  // Doublon : la reference distingue les recherches (place gardee pour elle).
  const suffix = opts.duplicate ? ` (${s.reference})` : "";
  base = cutAtWord(base, max - suffix.length) + suffix;
  if (base.length + BRAND.length <= max) return base + BRAND;
  if (base.length < min) return cutAtWord(base + BRAND, max);
  return base;
}

/** Type de bien dans la phrase : minuscule en francais et en anglais, tel quel en allemand (noms). */
export function typeInTitle(label: string, locale: string): string {
  return locale === "de" ? label : label.charAt(0).toLocaleLowerCase(locale) + label.slice(1);
}

/** Title de chaque recherche publiee, references en cas de doublon (meme regle pour toutes). */
export function searchTitles(
  list: { reference: string; communes: string[]; property_type: string }[],
  typeLabel: (type: string) => string,
  tpl: SearchTitleTemplates,
): Map<string, string> {
  const plain = new Map(list.map((s) => [s.reference, searchTitle(s, typeLabel(s.property_type), tpl)]));
  const count = new Map<string, number>();
  for (const v of plain.values()) count.set(v.toLowerCase(), (count.get(v.toLowerCase()) ?? 0) + 1);
  return new Map(list.map((s) => [s.reference, (count.get(plain.get(s.reference)!.toLowerCase()) ?? 0) > 1 ? searchTitle(s, typeLabel(s.property_type), tpl, { duplicate: true }) : plain.get(s.reference)!]));
}
