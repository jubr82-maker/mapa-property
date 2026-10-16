// Images du texte d'un article sans texte alternatif (oct. 2026) : l'editeur
// du blog les insere avec alt="" ; a l'affichage, elles recoivent le titre
// de l'article dans la langue de la page (rien d'invente). Un alt deja
// renseigne n'est jamais remplace. Aucun changement visuel.

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function fillEmptyImageAlts(html: string, title: string): string {
  const alt = escapeAttr(title.trim());
  if (!alt) return html;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const m = /\salt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag);
    if (m && (m[2] ?? m[3] ?? "").trim()) return tag;
    if (m) return tag.replace(m[0], ` alt="${alt}"`);
    return tag.replace(/^<img\b/i, `<img alt="${alt}"`);
  });
}
