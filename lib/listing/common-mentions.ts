// Mentions communes des annonces (fin standard : exclusivite, "Pour toute
// demande", signature, estimation, service multilingue, diffusion,
// reproduction interdite). Module pur, sans texte : les reperes viennent
// des messages (listing_model.seo.common_start, FR/EN/DE, variantes
// anciennes d'Apimo comprises).
//
// Oct. 2026 : la fin affichee est toujours celle du modele (Parametres >
// Modeles d'annonces) ; la fin ecrite a la main dans la description est
// reperee ici pour ne pas l'afficher deux fois. Rien n'est modifie en base.

/** Comparaison des reperes : casse et apostrophes typographiques ignorees. */
const norm = (s: string) => s.replace(/[’‘]/g, "'").toLowerCase();

function startsWithMarker(rest: string, markers: string[]): boolean {
  const r = norm(rest.replace(/^[\s*_]+/, ""));
  return markers.some((m) => m && r.startsWith(norm(m)));
}

// Balises qui terminent une ligne (comme un retour a la ligne).
const BLOCK_TAG = /^<\/?(p|br|div|li|ul|ol|h[1-6])\b/i;
// Une fin ecrite a la main n'est reconnue que dans les 70 % finaux du texte :
// un repere en debut d'annonce ("Pour toute demande de visite...") reste.
const MIN_BODY_RATIO = 0.3;

/**
 * Corps de l'annonce et fin ecrite a la main, separes au premier repere
 * place en debut de ligne (paragraphe, <br>, retour a la ligne) ou en debut
 * de phrase. body + common === texte d'origine.
 */
export function splitCommonMentions(html: string, markers: string[]): { body: string; common: string } {
  const src = String(html ?? "");
  if (!src || !markers.length) return { body: src, common: "" };
  // Texte visible avec, pour chaque caractere, sa position dans la source.
  let plain = "";
  const at: number[] = [];
  for (let i = 0; i < src.length; ) {
    if (src[i] === "<") {
      const end = src.indexOf(">", i);
      if (end > i) {
        if (BLOCK_TAG.test(src.slice(i, end + 1))) {
          plain += "\n";
          at.push(i);
        }
        i = end + 1;
        continue;
      }
    }
    plain += src[i];
    at.push(i);
    i++;
  }
  const total = plain.trim().length;
  if (!total) return { body: src, common: "" };
  for (let k = 0; k < plain.length; k++) {
    if (!/\S/.test(plain[k]) || plain[k] === "*" || plain[k] === "_") continue;
    // Debut de ligne, ou debut de phrase (". ", "! ", "? " avant le repere).
    let j = k - 1;
    let space = false;
    while (j >= 0 && /[ \t *_]/.test(plain[j])) {
      if (plain[j] !== "*" && plain[j] !== "_") space = true;
      j--;
    }
    const lineStart = j < 0 || plain[j] === "\n";
    const sentenceStart = space && j >= 0 && /[.!?]/.test(plain[j]);
    if (!lineStart && !sentenceStart) continue;
    if (!startsWithMarker(plain.slice(k, k + 120), markers)) continue;
    if (plain.slice(0, k).trim().length < total * MIN_BODY_RATIO) continue;
    // Coupe avant les balises ouvrantes et les espaces qui precedent le repere.
    let cut = at[k];
    for (;;) {
      const head = src.slice(0, cut);
      const m = head.match(/(<(p|strong|b|em|i|span|div)\b[^>]*>|\*\*|[ \t])$/i);
      if (!m) break;
      cut -= m[0].length;
    }
    return { body: src.slice(0, cut), common: src.slice(cut) };
  }
  return { body: src, common: "" };
}

/** Fin d'un texte genere par le modele : depuis la premiere ligne qui commence par un repere. */
export function templateEnding(text: string, markers: string[]): string {
  const lines = String(text ?? "").split("\n");
  const i = lines.findIndex((l) => startsWithMarker(l, markers));
  return i < 0 ? "" : lines.slice(i).join("\n").trim();
}
