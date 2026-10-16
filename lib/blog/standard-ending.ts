// Fin d'article standard (oct. 2026) : rubrique "La position de Mapa
// Property" et signature, communes a tous les articles, modifiables a un
// seul endroit (admin, Blog, Fin d'article standard ; table
// blog_standard_ending, SQL 27). Ajoutees a l'affichage :
// - la rubrique juste avant le titre "Conclusion" (sinon avant la citation
//   finale, sinon a la fin), seulement si l'article l'affiche (reglage
//   "Fin standard") et n'a pas deja sa propre rubrique du meme titre ;
// - la signature avant le paragraphe "Sources", sauf si l'article contient
//   encore une signature ecrite a la main.
// La citation de conclusion et les sources restent propres a chaque
// article. Rendu identique a la fin ecrite a la main de l'article Steinfort.
export type EndingLang = "fr" | "en" | "de";

export type StandardEnding = Record<`${"heading" | "text_commune" | "text_general" | "signature"}_${EndingLang}`, string | null>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lastMatchIndex = (html: string, re: RegExp): number => {
  let idx = -1;
  for (const m of html.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))) idx = m.index ?? idx;
  return idx;
};

/** Rubrique standard de l'article (HTML), ou "" si rien a afficher. */
export function standardSectionHtml(ending: StandardEnding | null, lang: EndingLang, commune: string | null | undefined): string {
  if (!ending) return "";
  const heading = (ending[`heading_${lang}`] ?? "").trim();
  const c = (commune ?? "").trim();
  const body = ((c ? ending[`text_commune_${lang}`] : ending[`text_general_${lang}`]) ?? "").trim();
  if (!heading || !body) return "";
  return `<h2>${esc(heading)}</h2>\n${body.replace(/\{commune\}/g, esc(c))}\n`;
}

export function applyStandardEnding(
  html: string,
  ending: StandardEnding | null,
  opts: { lang: EndingLang; show: boolean; commune?: string | null },
): string {
  if (!ending) return html;
  let out = html;
  const heading = (ending[`heading_${opts.lang}`] ?? "").trim();
  const hasOwnSection = heading
    ? new RegExp(`<h2[^>]*>\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "(?:'|&#39;|&#x27;|’)")}\\s*</h2>`, "i").test(out)
    : true;
  const section = opts.show && !hasOwnSection ? standardSectionHtml(ending, opts.lang, opts.commune) : "";
  if (section) {
    let at = lastMatchIndex(out, /<h2[^>]*>\s*(Conclusion|Fazit)\s*<\/h2>/i);
    if (at < 0) at = lastMatchIndex(out, /<blockquote\b/i);
    out = at < 0 ? `${out}\n${section}` : `${out.slice(0, at)}${section}${out.slice(at)}`;
  }
  const signature = (ending[`signature_${opts.lang}`] ?? "").trim();
  const handSigned = /<p[^>]*>\s*<em>\s*Julien Brebion\b/i.test(out);
  if (signature && !handSigned) {
    const sig = `<p><em>${esc(signature)}</em></p>\n`;
    const at = lastMatchIndex(out, /<p[^>]*>\s*<strong>\s*(Sources|Quellen)\b/i);
    out = at < 0 ? `${out}\n${sig}` : `${out.slice(0, at)}${sig}${out.slice(at)}`;
  }
  return out;
}
