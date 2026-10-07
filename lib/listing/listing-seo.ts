// Referencement d'une fiche de bien (oct. 2026). Module pur, partage par la
// page publique, l'admin (apercu Google en direct) et les tests :
// - adresse lisible et stable : type, chambres, localite, reference ;
// - balise title construite par le modele, sans le qualificatif ;
// - meta description tiree du premier paragraphe du texte de l'annonce ;
// - mentions communes (cloture, signature, service multilingue, copyright)
//   separees du corps pour l'affichage public ;
// - textes alternatifs des photos.
// Les mots viennent des messages (listing_model.seo et listing_model.vocab).
import { formatArea, formatMoney, parseTypeNoun, plural } from "@/lib/listing/language";
import type { ListingLang } from "@/lib/listing/listing-data";
import { htmlToText, renderTemplate } from "@/lib/listing/template-engine";

export type ListingSeoVocab = {
  title: string;
  brand: string;
  bedrooms: string;
  path_bedrooms: string;
  common_start: string[];
  alt_room: string;
  alt_place: string;
  alt_photo: string;
  rent_suffix: string;
};

export type SeoProperty = {
  slug: string;
  property_type: string | null;
  transaction: string | null;
  bedrooms: number | null;
  surface: number | null;
  living_surface?: number | null;
  city: string | null;
  price: number | null;
  price_on_demand?: boolean;
};

export const SEO_TITLE_MAX = 60;
export const META_MIN = 150;
export const META_MAX = 160;

const pos = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/** Minuscules ASCII separees par des tirets (adresse de page). */
export function slugifySegment(input: string | null | undefined): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reference stable d'un bien dans son adresse : l'identifiant Apimo
 * (slug numerique) ou le suffixe aleatoire du slug cree dans l'admin. Elle
 * ne change jamais, meme si le titre, le type ou la commune changent.
 */
export function propertyRefToken(slug: string): string {
  if (/^\d+$/.test(slug)) return slug;
  const last = slug.split("-").pop() ?? slug;
  return /^[0-9a-f]{8}$/i.test(last) ? last.toLowerCase() : slug;
}

/** Reference lue dans une adresse (dernier segment). */
export function refTokenFromParam(param: string): string {
  const p = decodeURIComponent(param).toLowerCase();
  const last = p.split("-").pop() ?? p;
  return /^\d+$/.test(last) || /^[0-9a-f]{8}$/.test(last) ? last : p;
}

/** Nom du type (sans article ni qualificatif), premiere lettre capitale. */
export function typeName(propertyType: string | null, lang: ListingLang, types: Record<string, string>, fallback?: string): string {
  const t = parseTypeNoun(types[propertyType ?? ""]);
  const noun = t.noun ? [t.adj ? (lang === "de" ? `${t.adj}${t.gender === "m" ? "er" : t.gender === "f" ? "e" : "es"}` : t.adj) : "", t.noun].filter(Boolean).join(" ") : (fallback ?? "");
  return noun ? noun.charAt(0).toLocaleUpperCase(lang) + noun.slice(1) : "";
}

/** Segment d'adresse : type, chambres, localite, reference. */
export function propertySegment(p: SeoProperty, lang: ListingLang, types: Record<string, string>, seo: ListingSeoVocab, fallbackType?: string): string {
  // Slug ancien sans reference reconnaissable : garde tel quel (seule
  // adresse que la fiche sait retrouver).
  if (propertyRefToken(p.slug) === p.slug && !/^\d+$/.test(p.slug)) return p.slug;
  const parts = [
    slugifySegment(typeName(p.property_type, lang, types, fallbackType)),
    pos(p.bedrooms) ? slugifySegment(plural(seo.path_bedrooms, p.bedrooms, String)) : "",
    slugifySegment(p.city),
    propertyRefToken(p.slug),
  ].filter(Boolean);
  return parts.join("-");
}

export function propertyPath(p: SeoProperty, lang: ListingLang, types: Record<string, string>, seo: ListingSeoVocab, fallbackType?: string): string {
  return `/biens/${propertySegment(p, lang, types, seo, fallbackType)}`;
}

/**
 * Balise title : "{Type} {n} chambres {surface} m² a vendre a {localite} |
 * MAPA Property". Au-dela de 60 caracteres : la surface tombe d'abord,
 * puis la marque.
 */
export function seoTitle(
  p: SeoProperty,
  lang: ListingLang,
  ctx: { types: Record<string, string>; titleTx: { sale: string; rent: string }; seo: ListingSeoVocab; fallbackType?: string },
): string {
  const surface = pos(p.living_surface) ? p.living_surface : pos(p.surface) ? p.surface : null;
  const values = {
    type: typeName(p.property_type, lang, ctx.types, ctx.fallbackType),
    chambres: pos(p.bedrooms) ? plural(ctx.seo.bedrooms, p.bedrooms, String) : "",
    surface: surface ? formatArea(surface, lang) : "",
    a_vendre: p.transaction === "rent" ? ctx.titleTx.rent : ctx.titleTx.sale,
    commune: (p.city ?? "").trim(),
  };
  const render = (v: typeof values) => renderTemplate(ctx.seo.title, v).replace(/\s*\n\s*/g, " ").trim();
  const full = render(values) + ctx.seo.brand;
  if (full.length <= SEO_TITLE_MAX) return full;
  const noSurface = render({ ...values, surface: "" });
  if ((noSurface + ctx.seo.brand).length <= SEO_TITLE_MAX) return noSurface + ctx.seo.brand;
  return noSurface;
}

/** Corps de l'annonce et mentions communes, separes au premier paragraphe commun. */
export function splitCommonMentions(html: string, markers: string[]): { body: string; common: string } {
  const src = String(html ?? "");
  const paragraphs = src.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  if (!paragraphs || !markers.length) return { body: src, common: "" };
  const idx = paragraphs.findIndex((p) => {
    const text = htmlToText(p);
    return markers.some((m) => m && text.startsWith(m));
  });
  if (idx <= 0) return { body: src, common: "" };
  const cut = src.indexOf(paragraphs[idx]);
  return { body: src.slice(0, cut), common: src.slice(cut) };
}

// Mots qui ne terminent jamais une description coupee : prepositions,
// articles, conjonctions et participes des modeles (situe, construit...).
const DANGLING = /\s+(le|la|les|l'|de|du|des|d'|à|au|aux|en|dans|et|ou|sur|par|pour|avec|un|une|ce|cet|cette|son|sa|ses|leur|situé|située|situés|situées|construit|construite|rénové|rénovée|the|of|in|a|an|and|or|with|for|at|on|this|its|located|built|renovated|der|die|das|des|dem|den|im|in|von|und|oder|mit|ein|eine|zu|am|diese|dieses|diesen|sein|seine|seinem|seinen|gelegen|erbaut|renoviert)$/i;

/** Coupe sur un mot entier, sans preposition ni participe en fin de texte. */
export function cutOnWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  let out = (space > 0 ? cut.slice(0, space) : text.slice(0, max)).replace(/[\s,;:]+$/, "");
  while (DANGLING.test(out)) out = out.replace(DANGLING, "").replace(/[\s,;:]+$/, "");
  return out;
}

/** Phrases d'un texte (fin sur ".", "?" ou fin de paragraphe). */
function sentences(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((x) => x.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .flatMap((p) => p.match(/[^.?]+(?:[.?]+|$)/g) ?? [p])
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => (/[.?]$/.test(x) ? x : `${x}.`));
}

/**
 * Meta description : premier paragraphe du corps de l'annonce (jamais la
 * signature, la cloture ni les mentions communes), completee par la
 * surface, les chambres et le prix. Ne coupe JAMAIS une phrase : la
 * description finit toujours sur une phrase complete, 160 caracteres au
 * plus, 150 vises et 120 acceptes. Seule exception : une premiere phrase
 * de plus de 160 caracteres est coupee sur un mot entier, sans preposition
 * ni participe en fin de texte.
 */
export function seoDescription(
  bodyHtml: string,
  p: SeoProperty,
  lang: ListingLang,
  ctx: { seo: ListingSeoVocab },
): string {
  const list = sentences(htmlToText(bodyHtml));
  const surface = pos(p.living_surface) ? p.living_surface : pos(p.surface) ? p.surface : null;
  const priceText = !p.price_on_demand && pos(p.price) ? formatMoney(p.price, lang) + (p.transaction === "rent" ? ctx.seo.rent_suffix : "") : "";
  const first = list[0] ?? "";
  const facts = [surface ? formatArea(surface, lang) : "", pos(p.bedrooms) ? plural(ctx.seo.bedrooms, p.bedrooms, String) : "", priceText]
    .filter(Boolean)
    .filter((f) => !first.includes(f));
  const factsSentence = facts.length ? `${facts.join(", ")}.` : "";
  if (!first) return factsSentence;
  if (first.length > META_MAX) return cutOnWord(first.replace(/[.?]$/, ""), META_MAX);
  // Phrases entieres ajoutees tant qu'elles tiennent : faits, puis suite.
  let text = first;
  for (const next of [factsSentence, ...list.slice(1)].filter(Boolean)) {
    if (text.length >= META_MIN) break;
    if (`${text} ${next}`.length <= META_MAX) text = `${text} ${next}`;
  }
  return text;
}

/** Texte alternatif d'une photo : piece saisie, puis type et localite. */
export function photoAlt(
  args: { room?: string | null; custom?: string | null; index: number; typeLabel: string; city: string | null; title: string },
  seo: ListingSeoVocab,
): string {
  if (args.custom?.trim()) return args.custom.trim();
  const type = args.typeLabel.toLocaleLowerCase();
  const city = (args.city ?? "").trim();
  if (!type) return args.title;
  const place = city ? seo.alt_place.replace("{type}", type).replace("{city}", city) : type;
  if (args.room?.trim()) {
    const room = args.room.trim().replace(/[.\s]+$/, "");
    return seo.alt_room.replace("{room}", room).replace("{place}", place);
  }
  return seo.alt_photo.replace("{place}", place).replace("{n}", String(args.index + 1)).replace(/^./, (c) => c.toLocaleUpperCase());
}

/** Nombre de mots du texte propre a l'annonce (ambiance, pieces, atouts). */
export function ownTextWords(parts: string[]): number {
  return parts.join(" ").split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
}
