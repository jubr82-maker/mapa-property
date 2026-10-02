// Texte des balises meta (description, og:description, title) : jamais de
// HTML, jamais d'entite, espaces normalises, coupe propre (SEO oct. 2026).

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  laquo: "«",
  raquo: "»",
  hellip: "…",
  ndash: "-",
  mdash: "-",
  euro: "€",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  agrave: "à",
  acirc: "â",
  ccedil: "ç",
  ocirc: "ô",
  ucirc: "û",
  icirc: "î",
  iuml: "ï",
  euml: "ë",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  szlig: "ß",
  deg: "°",
  sup2: "²",
};

/** Retire balises et entites HTML, normalise les espaces. */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return (
    html
      // Fin de bloc = separation de mots ("</p><p>" ne colle pas deux phrases).
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&([a-z0-9]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? " ")
      // Chevrons issus du decodage (&lt;) : jamais dans une meta.
      .replace(/[<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Texte de meta description : sans HTML, au plus `max` caracteres, coupe sur
 * une fin de mot avec points de suspension si le texte est tronque.
 */
export function metaDescription(html: string | null | undefined, max = 155): string {
  const text = htmlToPlainText(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(
    /[\s,;:.\-]+$/,
    "",
  );
  return `${base}…`;
}

const BRAND_SUFFIX_RE = /\s*[|,\-\u2013\u2014:]\s*mapa\s+property\s*$/i;

/**
 * Title de page avec UN SEUL suffixe ", MAPA Property". Retire tout suffixe
 * de marque deja present dans la source ("| Mapa Property", ", MAPA
 * Property"...), quelle que soit sa casse.
 */
export function brandedTitle(raw: string | null | undefined): string {
  let base = htmlToPlainText(raw);
  while (BRAND_SUFFIX_RE.test(base)) base = base.replace(BRAND_SUFFIX_RE, "");
  return base ? `${base}, MAPA Property` : "MAPA Property";
}
