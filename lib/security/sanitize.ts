// Assainissement des contenus injectes dans le HTML (audit de securite,
// oct. 2026). OWASP ASVS 5.2.1 (assainir le HTML non fiable) et 5.3.x
// (encodage de sortie adapte au contexte).
import sanitizeHtml from "sanitize-html";

/**
 * Corps d'article (blog) : mise en forme conservee (titres, listes, liens,
 * images, tableaux, citations, code), tout le reste retire : scripts,
 * iframes, formulaires, attributs d'evenement (on*), styles, liens
 * javascript: ou data:.
 */
export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
      "ul", "ol", "li", "blockquote", "q", "cite", "code", "pre",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
      "span", "div",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      "*": ["class"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    // Image sans adresse affichable (vide, relative comme "assets/x.jpg"
    // du site v28) : retiree plutot qu'affichee cassee.
    exclusiveFilter: (frame) =>
      frame.tag === "img" && !/^(https:\/\/|\/(?!\/))/i.test(String(frame.attribs.src ?? "")),
    transformTags: {
      // Lien externe : jamais d'acces a window.opener.
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
      // Image a chargement differe (adresse dans data-src, src vide ou
      // absent) : l'adresse est reprise dans src, puis filtree comme toute
      // autre (https uniquement). Sinon l'image restait vide.
      img: (tagName, attribs) => {
        const lazy = attribs["data-src"];
        const src = attribs.src && !attribs.src.startsWith("data:") ? attribs.src : lazy || attribs.src;
        return { tagName, attribs: { ...attribs, ...(src ? { src } : {}), loading: "lazy" } };
      },
    },
  });
}

/**
 * JSON-LD dans <script type="application/ld+json"> : JSON.stringify
 * n'echappe pas "</script>" ; on encode < > & et les separateurs de ligne
 * Unicode pour qu'aucune donnee ne puisse fermer la balise.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Nom de variable CSS sur : lettres, chiffres, tirets uniquement. */
const CSS_VAR_NAME = /^--[a-z0-9-]{1,40}$/i;
/** Valeur de couleur CSS sure : hexa, rgb(a), hsl(a) ou nom simple. */
const CSS_COLOR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)|[a-z]{3,20})$/i;

/**
 * Surcharges de couleurs du CMS injectees dans un <style> : seules les
 * paires nom/valeur de couleur valides passent (aucune sortie de la regle
 * CSS, aucune fermeture de balise possible).
 */
export function sanitizeCssColorOverrides(overrides: Record<string, string>): string {
  return Object.entries(overrides)
    .filter(([k, v]) => CSS_VAR_NAME.test(k) && typeof v === "string" && CSS_COLOR.test(v.trim()))
    .map(([k, v]) => `${k}:${v.trim()};`)
    .join("");
}

/**
 * Chemin interne sur pour une navigation declenchee par une donnee externe
 * (reponse du chatbot) : commence par un seul "/", sans "//", sans "\",
 * sans caractere de controle. Sinon null.
 */
export function safeInternalPath(target: unknown): string | null {
  if (typeof target !== "string" || target.length > 500) return null;
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  if (/[\\\u0000-\u001f]/.test(target)) return null;
  return target;
}
