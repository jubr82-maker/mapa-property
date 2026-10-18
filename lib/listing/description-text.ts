// Descriptions de biens et d'off-market (oct. 2026) : le texte en base reste
// tel quel (import Apimo, saisie admin) ; seul l'affichage est structure.
//
// Entree : texte brut Apimo (souvent une seule ligne, listes " - **Label**: "
// collees, hashtags Instagram en fin) ou HTML de l'editeur admin.
// Sortie : blocs types (intertitre, paragraphe, liste) faits de segments de
// texte, gras ou italique. Aucun HTML n'est jamais rendu tel quel : les
// composants affichent les segments comme du texte (React echappe tout).
// Variante texte court (resume, meta, donnees structurees) : jamais de **,
// de # ni de tiret de liste.

import { decodeEntities } from "@/lib/meta-text";

export type Run = { text: string; bold?: boolean; italic?: boolean };
export type DescBlock =
  | { kind: "heading"; text: string }
  | { kind: "p"; runs: Run[] }
  | { kind: "ul"; items: Run[][] };

// Marqueurs internes : intertitre HTML (<h1>..<h6>) et italique (<em>, <i>).
const H = "\u0003";
const I = "\u0001";

const HTML_TAG = /<\/?(p|br|div|li|ul|ol|strong|b|em|i|h[1-6]|span)\b[^>]*>/i;
// Element de liste : marque suivie d'une espace, ou tiret colle a un mot ("-sous-sol").
const BULLET = /^(?:[-–—•*]\s+|[-–—•](?=\p{L}))(.*)$/u;
// Ligne faite seulement de tirets ou d'etoiles (separateur visuel).
const SEPARATOR = /^[-–—⸺⸻_*•·=~\s]+$/;
// Phrase d'introduction de liste ("Il se compose de :", "Les diagnostics
// confirment :") : reste une phrase, jamais un intertitre.
const LEAD_IN_END = new Set("de du des d’ d' par pour avec sur dans à en est sont comprend comprennent confirment suivant suivants suivante suivantes notamment of by with for in on include includes including are is von mit für bei aus umfasst sind ist folgende folgenden".split(" "));
const LEAD_IN_START = /^(il|elle|ils|elles|on|nous|vous|it|we|you|they|er|sie|es|wir)\s/i;
// Separateur de liste colle dans une ligne : " - " devant un element qui
// commence par une majuscule, un chiffre ou du gras.
const INLINE_BULLET = /\s+[-–—•]\s+(?=\*\*|[\p{Lu}\d])/gu;
const HASHTAG = /(?<![\p{L}\p{N}_&])#[\p{L}\p{N}_]+/gu;
const SENTENCE_BREAK = /(?<=[.!?…])\s+(?=[\p{Lu}«"(\d*])/u;
// "Label : suite" en debut de ligne (ancien rendu : label en gras).
const LABEL_LINE = /^([A-Za-zÀ-ÿ'’\- ]{3,60}?)\s*:\s*(.*)$/;
const LONG_PARAGRAPH = 500;

function htmlToLines(html: string): string {
  return html
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<h[1-6]\b[^>]*>/gi, `\n${H}`)
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>|<br\s*\/?>/gi, "\n")
    .replace(/<\/?(strong|b)\b[^>]*>/gi, "**")
    .replace(/<\/?(em|i)\b[^>]*>/gi, I)
    .replace(/<[^>]*>/g, "");
}

const bare = (s: string) => s.replace(/\*\*/g, "").replace(new RegExp(I, "g"), "").trim();

/** Ligne courte terminee par ":" qui peut servir d'intertitre. */
function asHeading(s: string): string | null {
  const t = bare(s).replace(/\s*:$/, "");
  if (!bare(s).endsWith(":") || !t || t.length > 60 || t.split(/\s+/).length > 8) return null;
  if (!/^[\p{Lu}\d]/u.test(t) || /[:.!?]/.test(t)) return null;
  const words = t.toLowerCase().split(/\s+/);
  if (LEAD_IN_START.test(t) || words.includes("se") || LEAD_IN_END.has(words[words.length - 1])) return null;
  return t;
}

type Line = { kind: "heading" | "item" | "p" | "gap"; text: string; glued?: boolean };

function toLines(raw: string): Line[] {
  let text = raw.replace(/\r\n?/g, "\n");
  if (HTML_TAG.test(text)) text = htmlToLines(text);
  text = decodeEntities(text).replace(/\u00a0/g, " ").replace(HASHTAG, "");

  const lines: Line[] = [];
  for (let src of text.split("\n")) {
    src = src.replace(/[ \t]+/g, " ").trim();
    if (!src || SEPARATOR.test(src)) {
      if (lines.length && lines[lines.length - 1].kind !== "gap") lines.push({ kind: "gap", text: "" });
      continue;
    }
    if (src.startsWith(H)) {
      const t = bare(src.slice(1)).replace(/\s*:$/, "");
      if (t) lines.push({ kind: "heading", text: t });
      continue;
    }
    // Listes collees : on coupe seulement s'il y a au moins deux elements
    // (un tiret isole dans une phrase n'est pas une liste).
    const starts = BULLET.test(src) ? 1 : 0;
    const inline = src.match(INLINE_BULLET)?.length ?? 0;
    const glued = starts + inline >= 2 && inline > 0;
    const parts = glued ? src.replace(INLINE_BULLET, "\n- ").split("\n") : [src];
    for (const part of parts) {
      const m = part.match(BULLET);
      const kind: Line["kind"] = m && !part.startsWith("**") ? "item" : "p";
      const body = kind === "item" ? m![1].trim() : part.trim();
      if (!body) continue;
      // Intertitre colle en fin de ligne : "... sur la ville. Details de la Residence:"
      if (bare(body).endsWith(":")) {
        const cut = body.split(SENTENCE_BREAK);
        const head = asHeading(cut[cut.length - 1]);
        if (head && cut.length > 1) {
          lines.push({ kind, text: cut.slice(0, -1).join(" "), glued });
          lines.push({ kind: "heading", text: head });
          continue;
        }
        if (head && kind === "p") {
          lines.push({ kind: "heading", text: head });
          continue;
        }
      }
      lines.push({ kind, text: body, glued });
    }
  }

  // Ligne vide entre deux elements : fin de liste, sauf si toute la liste
  // est aeree ainsi (une ligne vide entre chaque element).
  const grouped: Line[] = [];
  for (let i = 0; i < lines.length; ) {
    if (lines[i].kind !== "item") {
      grouped.push(lines[i++]);
      continue;
    }
    const run: Line[] = [];
    const gapAfter: boolean[] = [];
    while (i < lines.length) {
      if (lines[i].kind === "item") run.push(lines[i++]);
      else if (lines[i].kind === "gap" && lines[i + 1]?.kind === "item") {
        gapAfter[run.length - 1] = true;
        i++;
      } else break;
    }
    const airy = run.length > 1 && run.slice(0, -1).every((_, k) => gapAfter[k]);
    run.forEach((l, k) => {
      grouped.push(l);
      if (gapAfter[k] && !airy) grouped.push({ kind: "gap", text: "" });
    });
  }
  // Element isole (pas de voisin dans la liste) : simple paragraphe.
  grouped.forEach((l, i) => {
    if (l.kind === "item" && grouped[i - 1]?.kind !== "item" && grouped[i + 1]?.kind !== "item") l.kind = "p";
  });

  // Liste collee : le texte qui suit le dernier element y reste attache
  // ("... des spectacles. Ne manquez pas ..."). On le sort en paragraphe.
  const out: Line[] = [];
  grouped.forEach((l, i) => {
    const lastOfList = l.kind === "item" && l.glued && grouped[i + 1]?.kind !== "item" && grouped[i - 1]?.kind === "item";
    const cut = lastOfList ? l.text.split(SENTENCE_BREAK) : [];
    if (cut.length > 1) {
      out.push({ kind: "item", text: cut[0] });
      out.push({ kind: "p", text: cut.slice(1).join(" ") });
    } else out.push(l);
  });
  while (out.length && (out[out.length - 1].kind === "heading" || out[out.length - 1].kind === "gap")) out.pop();
  // Fin de texte qui annoncait les hashtags ("... organiser une visite:").
  const last = out[out.length - 1];
  if (last) last.text = last.text.replace(/\s*:\s*(\*\*)?\s*$/, "$1.");
  return out.filter((l) => l.kind === "gap" || bare(l.text));
}

/** Segments gras / italique ; marques non appariees retirees. */
function toRuns(s: string): Run[] {
  const boldParts = s.split("**");
  const boldOk = boldParts.length % 2 === 1;
  const runs: Run[] = [];
  boldParts.forEach((bp, bi) => {
    const italParts = bp.split(I);
    const italOk = italParts.length % 2 === 1;
    italParts.forEach((ip, ii) => {
      if (!ip) return;
      const run: Run = { text: ip };
      if (boldOk && bi % 2 === 1) run.bold = true;
      if (italOk && ii % 2 === 1) run.italic = true;
      const prev = runs[runs.length - 1];
      if (prev && !!prev.bold === !!run.bold && !!prev.italic === !!run.italic) prev.text += ip;
      else runs.push(run);
    });
  });
  if (runs.length) {
    runs[0].text = runs[0].text.replace(/^\s+/, "");
    runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, "");
  }
  return runs.filter((r) => r.text);
}

/** Paragraphe : "Label : suite" garde son label en gras (ancien rendu). */
function paragraphRuns(s: string): Run[] {
  if (!s.includes("**")) {
    const m = s.match(LABEL_LINE);
    if (m && m[2] && /^[A-ZÀ-Ý]/.test(m[1].trim())) {
      return [{ text: `${m[1].trim()} :`, bold: true }, ...toRuns(` ${m[2]}`).map((r, i) => (i === 0 ? { ...r, text: ` ${r.text}` } : r))];
    }
  }
  return toRuns(s);
}

/** Decoupe un long paragraphe sur des fins de phrase (environ 350 caracteres). */
function splitLong(s: string): string[] {
  if (s.length <= LONG_PARAGRAPH) return [s];
  const out: string[] = [];
  let cur = "";
  for (const sentence of s.split(SENTENCE_BREAK)) {
    cur = cur ? `${cur} ${sentence}` : sentence;
    if (cur.length >= 350) {
      out.push(cur);
      cur = "";
    }
  }
  if (cur) {
    if (out.length && cur.length < 120) out[out.length - 1] += ` ${cur}`;
    else out.push(cur);
  }
  return out;
}

export function descriptionBlocks(raw: string | null | undefined): DescBlock[] {
  if (!raw || !raw.trim()) return [];
  const blocks: DescBlock[] = [];
  let gap = false;
  for (const l of toLines(raw)) {
    if (l.kind === "gap") gap = true;
    else if (l.kind === "heading") blocks.push({ kind: "heading", text: l.text });
    else if (l.kind === "item") {
      const prev = blocks[blocks.length - 1];
      const runs = toRuns(l.text);
      if (!runs.length) continue;
      if (prev?.kind === "ul" && !gap) prev.items.push(runs);
      else blocks.push({ kind: "ul", items: [runs] });
    } else {
      for (const part of splitLong(l.text)) {
        const runs = paragraphRuns(part);
        if (runs.length) blocks.push({ kind: "p", runs });
      }
    }
    if (l.kind !== "gap") gap = false;
  }
  return blocks;
}

const runsText = (runs: Run[]) => runs.map((r) => r.text).join("").replace(/\s+/g, " ").trim();

/**
 * Texte court sur une ligne : paragraphes et elements de liste mis bout a
 * bout ("element; element."), intertitres omis.
 */
export function descriptionPlainText(raw: string | null | undefined): string {
  return descriptionBlocks(raw)
    .map((b) => {
      if (b.kind === "heading") return "";
      if (b.kind === "p") return runsText(b.runs);
      return b.items.map((it) => runsText(it).replace(/[\s.;,]+$/, "")).join("; ") + ".";
    })
    .filter(Boolean)
    .join(" ");
}

/** Resume du haut de fiche : paragraphes avant la premiere liste ou le premier intertitre. */
export function descriptionSummary(raw: string | null | undefined): string {
  const blocks = descriptionBlocks(raw);
  const lead: string[] = [];
  for (const b of blocks) {
    if (b.kind !== "p") break;
    lead.push(runsText(b.runs));
  }
  return lead.length ? lead.join(" ") : descriptionPlainText(raw);
}

/** Coupe sur une fin de mot, avec points de suspension si le texte est tronque. */
export function clipText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-]+$/, "")}…`;
}

/** Texte court deja sur une ligne (atout, description Google) : sans ** ni hashtag. */
export function cleanInline(s: string): string {
  return s.replace(/\*\*/g, "").replace(HASHTAG, "").replace(/\s+/g, " ").trim();
}
