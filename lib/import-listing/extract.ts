// Import d'une annonce collee (nov. 2026). Module pur (ecran et serveur) :
// a partir du contenu colle par Julien (HTML de la page copiee avec Cmd+A
// puis Cmd+C, et texte brut), extrait le texte lisible et la liste ORDONNEE
// des adresses d'images, sans doublons, sans logos, icones ni vignettes.
// Aucun acces reseau ici : seules les adresses presentes dans le contenu
// colle sont retenues, le telechargement se fait ailleurs
// (lib/import-listing/fetch-image.ts), photo par photo.

/** 60 photos au plus par import (adresses collees et fichiers confondus). */
export const MAX_IMPORT_PHOTOS = 60;
/** Largeur ou hauteur annoncee sous laquelle une image est une vignette. */
export const MIN_IMAGE_SIDE = 300;

export type SkippedImage = { url: string; reason: "logo" | "small" | "insecure" | "duplicate" | "limit" };
export type PastedExtraction = { text: string; images: string[]; skipped: SkippedImage[] };

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", euro: "€", sup2: "²" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Texte lisible d'un HTML colle : scripts, styles et SVG retires, blocs separes. */
export function htmlToPlain(html: string): string {
  return decodeEntities(
    String(html ?? "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|li|ul|ol|h[1-6]|tr|table|section|article|header|footer|dd|dt|dl)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Valeur d'un attribut dans le texte d'une balise. */
function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "").trim() || null;
}

/** Plus grande image d'un srcset ("a.jpg 400w, b.jpg 1600w"). */
function largestFromSrcset(srcset: string | null): string | null {
  if (!srcset) return null;
  let best: { url: string; size: number } | null = null;
  for (const part of srcset.split(/,\s+(?=\S)/)) {
    const [url, desc] = part.trim().split(/\s+/);
    if (!url) continue;
    const size = desc ? parseFloat(desc) * (desc.endsWith("x") ? 1000 : 1) : 0;
    if (!best || size > best.size) best = { url, size };
  }
  return best?.url ?? null;
}

// Logos, icones, pictogrammes, vignettes et images techniques (nom de fichier
// ou dossier evocateur).
const LOGO_NAME = /(^|[\/_.\-])(logo|logos|icon|icons|icone|favicon|sprite|avatar|picto|pictogram|badge|flag|drapeau|placeholder|spinner|loader|pixel|tracking|thumb|thumbs|thumbnail|thumbnails|vignette|vignettes|mini|emoji|social|facebook|twitter|instagram|linkedin|whatsapp|google|apple-touch|app-store|play-store|qr|qrcode|watermark)([\/_.\-\d]|$)/i;
// Dimensions demandees dans l'adresse (?w=120, /120x90/, _150x150.jpg).
const SMALL_IN_URL = /(?:[?&](?:w|width|h|height|size|s)=(\d{1,3})(?:&|$))|(?:[\/_\-](\d{2,3})x(\d{2,3})(?:[\/_.\-]|$))/i;

function smallFromUrl(url: string): boolean {
  const m = SMALL_IN_URL.exec(url);
  if (!m) return false;
  const nums = [m[1], m[2], m[3]].filter(Boolean).map(Number);
  return nums.length > 0 && Math.max(...nums) < MIN_IMAGE_SIDE;
}

/** Cle de doublon : adresse sans fragment ; sans parametres si le chemin est celui d'une image. */
export function imageKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (/\.(jpe?g|png|webp|gif|avif|heic|heif|tiff?)$/i.test(u.pathname)) u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

function absolute(url: string, base: string | null): string | null {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return null;
  try {
    return new URL(url.startsWith("//") ? `https:${url}` : url, base ?? undefined).toString();
  } catch {
    return null;
  }
}

type Candidate = { url: string; width: number | null; height: number | null };

function candidatesFromHtml(html: string): Candidate[] {
  const base = attr(/<base\b[^>]*>/i.exec(html)?.[0] ?? "", "href");
  const out: Candidate[] = [];
  const body = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1\s*>/gi, " ");
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const raw =
      largestFromSrcset(attr(tag, "data-srcset")) ??
      attr(tag, "data-src") ??
      attr(tag, "data-lazy-src") ??
      attr(tag, "data-original") ??
      largestFromSrcset(attr(tag, "srcset")) ??
      attr(tag, "src");
    const url = raw ? absolute(raw, base) : null;
    if (!url) continue;
    const w = Number(attr(tag, "width"));
    const h = Number(attr(tag, "height"));
    out.push({ url, width: Number.isFinite(w) && w > 0 ? w : null, height: Number.isFinite(h) && h > 0 ? h : null });
  }
  return out;
}

const IMAGE_URL_IN_TEXT = /(?:https?:)?\/\/[^\s"'<>()]+?\.(?:jpe?g|png|webp|gif|avif|heic|heif)(?:\?[^\s"'<>()]*)?(?=[\s"'<>()]|$)/gi;

function candidatesFromText(text: string): Candidate[] {
  return [...String(text ?? "").matchAll(IMAGE_URL_IN_TEXT)]
    .map((m) => absolute(m[0], null))
    .filter((u): u is string => Boolean(u))
    .map((url) => ({ url, width: null, height: null }));
}

/**
 * Texte et images du contenu colle. Les images viennent des balises img du
 * HTML colle ; sans HTML (ou sans aucune balise img), des adresses d'images
 * ecrites dans le texte. Ordre de l'annonce conserve.
 */
export function extractPasted(input: { html?: string | null; text?: string | null; preferText?: boolean }, max = MAX_IMPORT_PHOTOS): PastedExtraction {
  const html = String(input.html ?? "");
  const plain = String(input.text ?? "");
  const own = plain.replace(/\r\n?/g, "\n").trim();
  const text = (input.preferText && own) || (html.trim() ? htmlToPlain(html) : "") || own;
  let cands = html.trim() ? candidatesFromHtml(html) : [];
  if (!cands.length) cands = candidatesFromText(plain || text);

  const images: string[] = [];
  const skipped: SkippedImage[] = [];
  const seen = new Set<string>();
  for (const c of cands) {
    const key = imageKey(c.url);
    if (seen.has(key)) {
      skipped.push({ url: c.url, reason: "duplicate" });
      continue;
    }
    seen.add(key);
    let path = c.url;
    try {
      const u = new URL(c.url);
      path = u.pathname + u.search;
      if (u.protocol !== "https:") {
        skipped.push({ url: c.url, reason: "insecure" });
        continue;
      }
    } catch {
      continue;
    }
    if (LOGO_NAME.test(path) || /\.(svg|ico)(\?|$)/i.test(path)) {
      skipped.push({ url: c.url, reason: "logo" });
      continue;
    }
    if ((c.width != null && c.width < MIN_IMAGE_SIDE) || (c.height != null && c.height < MIN_IMAGE_SIDE) || smallFromUrl(c.url)) {
      skipped.push({ url: c.url, reason: "small" });
      continue;
    }
    if (images.length >= max) {
      skipped.push({ url: c.url, reason: "limit" });
      continue;
    }
    images.push(c.url);
  }
  return { text, images, skipped };
}

const KEEP_ATTRS = /^(src|srcset|data-src|data-srcset|data-lazy-src|data-original|width|height|href)$/i;

/**
 * HTML colle allege avant l'envoi au serveur (meme contenu utile : texte et
 * images) : scripts, styles, SVG, commentaires et attributs inutiles retires.
 */
export function lightenHtml(html: string): string {
  return String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|template|head|iframe|video|canvas)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<([a-z][a-z0-9-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi, (_m, tag: string, attrs: string, slash: string) => {
      const kept = [...attrs.matchAll(/\s+([^\s=>\/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g)]
        .filter((a) => KEEP_ATTRS.test(a[1]) && a[2] !== undefined)
        .map((a) => ` ${a[1]}=${a[2]}`)
        .join("");
      return `<${tag}${kept}${slash ? " /" : ""}>`;
    })
    .replace(/\s{2,}/g, " ");
}
