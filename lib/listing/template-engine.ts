// Moteur des modeles d'annonces (oct. 2026). Module pur, sans texte : les
// modeles viennent des messages (namespace listing_model) ou de la table
// listing_templates (page Parametres > Modeles d'annonces).
//
// Syntaxe d'un modele :
//   {{cle}}              valeur du champ (vide si le champ n'est pas rempli)
//   [[ ... ]]            segment facultatif : il disparait, avec tout ce
//                        qu'il contient (ponctuation comprise), des qu'une
//                        {{cle}} qu'il contient est vide. Imbrication permise.
//   {{#cle}}...{{/cle}}  bloc garde si la cle est remplie (ou le drapeau vrai)
//   {{^cle}}...{{/cle}}  bloc garde si la cle est vide (ou le drapeau faux)
// Une ligne videe par un segment ou un bloc disparait entierement ; les
// lignes vides voulues (separation des paragraphes) restent, jamais plus
// d'une a la suite. La premiere lettre de chaque ligne et de chaque phrase
// est mise en majuscule (apres un segment retire en debut de phrase).

export type TemplateValues = Record<string, string | null | undefined>;
export type TemplateFlags = Record<string, boolean>;

// Marque d'un retrait : la ligne qui ne contient plus qu'elle disparait.
const GONE = "\u0000";
// Marque d'un segment garde (retiree a la fin).
const KEPT = "\u0001";
const KEY_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/** Une valeur ne peut jamais injecter de syntaxe de modele. */
function clean(v: string | null | undefined): string {
  return String(v ?? "")
    .replace(/\{\{|\}\}|\[\[|\]\]/g, "")
    .replace(/[\u0000\u0001]/g, "")
    .trim();
}

function filled(key: string, values: TemplateValues, flags: TemplateFlags): boolean {
  if (key in flags) return flags[key];
  return clean(values[key]).length > 0;
}

function applyBlocks(tpl: string, values: TemplateValues, flags: TemplateFlags): string {
  const re = /\{\{([#^])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/;
  let out = tpl;
  for (let guard = 0; guard < 500; guard++) {
    const m = re.exec(out);
    if (!m) break;
    const on = filled(m[2], values, flags);
    const keep = m[1] === "#" ? on : !on;
    out = out.slice(0, m.index) + (keep ? m[3] : GONE) + out.slice(m.index + m[0].length);
  }
  return out;
}

function applySegments(tpl: string, values: TemplateValues): string {
  // Segment le plus interieur d'abord.
  // "[[" le plus a droite d'une suite ("[[[[" : la seconde paire).
  const re = /\[\[(?!\[)((?:(?!\[\[|\]\])[\s\S])*)\]\]/;
  let out = tpl;
  for (let guard = 0; guard < 2000; guard++) {
    const m = re.exec(out);
    if (!m) break;
    let empty = false;
    let own = 0;
    const body = m[1].replace(KEY_RE, (_, k: string) => {
      own++;
      const v = clean(values[k]);
      if (!v) empty = true;
      return v;
    });
    // Segment sans repere propre (un titre de liste et ses lignes) : garde
    // seulement si l'un de ses segments interieurs est garde.
    if (own === 0 && (body.includes(GONE) || body.includes(KEPT)) && !body.includes(KEPT)) empty = true;
    out = out.slice(0, m.index) + (empty ? GONE : KEPT + body) + out.slice(m.index + m[0].length);
  }
  return out;
}

/** Majuscule en debut de ligne (apres "- ") et apres une fin de phrase. */
export function capitalizeSentences(text: string): string {
  const up = (s: string) => s.toLocaleUpperCase("fr");
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/^(\s*(?:-\s+)?)(\p{Ll})/u, (_, pre: string, c: string) => pre + up(c))
        .replace(/([.?]\s+)(\p{Ll})/gu, (all, pre: string, c: string, offset: number, whole: string) => {
          // Abreviations courantes : pas de majuscule apres "env." ou "ca.".
          const before = whole.slice(Math.max(0, offset - 4), offset);
          if (/\b(env|ca|nr|bzw|z\.b)$/i.test(before)) return all;
          return pre + up(c);
        }),
    )
    .join("\n");
}

/** Remplit un modele. Retour : texte brut (lignes "- " pour les listes). */
export function renderTemplate(tpl: string, values: TemplateValues, flags: TemplateFlags = {}): string {
  let out = applyBlocks(String(tpl ?? "").replace(/\r\n?/g, "\n"), values, flags);
  out = applySegments(out, values);
  out = out.replace(KEY_RE, (_, k: string) => clean(values[k]) || GONE);

  const lines = out.split("\n");
  const kept: string[] = [];
  for (const raw of lines) {
    const hadGone = raw.includes(GONE);
    const line = raw
      .replace(/[\u0000\u0001]/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/ +([,.])/g, "$1")
      .replace(/^[ \t]+|[ \t]+$/g, "");
    // Ligne videe par un retrait, ou reduite a une ponctuation orpheline.
    if (hadGone && (line === "" || /^[-,.;:]+$/.test(line))) continue;
    kept.push(line);
  }
  const text = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
  return capitalizeSentences(text);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Texte brut vers le HTML de l'editeur de l'admin (<p>, <br>). */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("");
}

/** HTML de l'editeur vers texte brut (controle de redaction). */
export function htmlToText(html: string): string {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?(p|div|li|ul|ol|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Repere {{cle}} presents dans un modele (page Parametres). */
export function templateKeys(tpl: string): string[] {
  const keys = new Set<string>();
  for (const m of String(tpl ?? "").matchAll(/\{\{\s*[#^/]?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g)) keys.add(m[1]);
  return [...keys];
}
