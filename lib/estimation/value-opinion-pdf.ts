// Avis de valeur MAPA Property, PDF (oct. 2026). Genere cote serveur par
// pdfkit (deja installe, pur Node, deja utilise par les exports de l'admin
// sur Vercel : polices du site embarquees depuis public/fonts, polices
// standard fournies en JavaScript, aucune lecture de fichier systeme).
//
// Module pur : recoit la ligne d'estimation, la langue (fr, en, de) et les
// messages next-intl de cette langue ; ne lit ni la base ni la session.
// Teste par pnpm test:security (trois langues, aucun terme interdit).
//
// Contenu, environ neuf pages : couverture ; objet et limites ;
// description ; contexte de marche (titre "Donnees marche Luxembourg,
// [date]" seulement) ; methodes (principe, valeur, poids reel) ; synthese ;
// hypotheses et reserves ; mentions legales (DisclaimerLegal) ; signature
// (Julien Brebion seul). Le document dit clairement qu'il n'est pas une
// expertise. Noir et or, logo reel, polices du site.
//
// Chiffres : construits a la main avec une espace ASCII (jamais
// Intl.NumberFormat, dont l'espace fine insecable manque aux polices
// standard PDF, cf. lib/admin/exports/format.ts).
import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import { resolveFonts, type ResolvedFonts } from "@/lib/admin/exports/pdf";
import { VO_BLACK, VO_GOLD, VO_GREY, VO_LINE } from "@/lib/admin/exports/theme";
import { estimationInputEntries, formatInputNumber, realMethodShares, type NumberFormatters } from "@/lib/estimation/display";
import { advisorContactLines } from "@/lib/contact/reveal-lines";
import { annexLayout, EMPTY_ANNEXES, type AnnexLayout, type AnnexMeta } from "@/lib/estimation/value-opinion-annex-layout";

export type ValueOpinionLang = "fr" | "en" | "de";
export const VALUE_OPINION_LANGS: ValueOpinionLang[] = ["fr", "en", "de"];

export const VALUE_OPINION_METHODS = [
  "observatoire",
  "sales_comparison",
  "hedonic",
  "income_capitalization",
  "depreciated_replacement",
  "statec_reference",
] as const;

type MethodOut = { applicable?: boolean; price?: number | null; details?: Record<string, unknown> };

export interface ValueOpinionEstimation {
  id: string;
  created_at: string;
  contact_name: string | null;
  inputs: Record<string, unknown> | null;
  client_output: { price_low: number; price_mid: number; price_high: number; confidence: string } | null;
  internal_output: {
    methods?: Record<string, MethodOut>;
    weights_used?: Record<string, number>;
    std_deviation_pct?: number;
    computed_at?: string;
    inputs_snapshot?: Record<string, unknown>;
  } | null;
}

// Champs du dossier jamais repris dans l'avis : coordonnees et consentements
// (donnees personnelles), donnees de marche (page dediee), techniques.
const HIDDEN_INPUTS = new Set([
  "email", "phone", "name", "contactEmail", "contactPhone", "contactName", "rgpdConsent", "consent",
  "locale", "comparablesPpsqm", "rentData", "rentPerM2Month", "yieldRate", "attribution", "honeypot",
  "turnstileToken", "country",
]);
const ENUM_GROUP_BY_INPUT: Record<string, string> = {
  type: "propertyType",
  state: "state",
  condition: "state",
  floorType: "floorType",
  atypicalType: "atypicalType",
  view: "view",
};

// ---------- Nombres et dates (espace ASCII, trois langues) ----------
function group(intPart: string, sep: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}
function decimalStr(n: number, digits: number, lang: ValueOpinionLang): string {
  // Zeros retires seulement apres le separateur decimal (770000 reste 770000).
  let fixed = Math.abs(n).toFixed(digits);
  if (fixed.includes(".")) fixed = fixed.replace(/0+$/, "").replace(/\.$/, "");
  const [i, d] = fixed.split(".");
  const sep = lang === "en" ? "," : lang === "de" ? "." : " ";
  const dec = lang === "en" ? "." : ",";
  return `${n < 0 ? "-" : ""}${group(i, sep)}${d ? dec + d : ""}`;
}
export function voPrice(n: number, lang: ValueOpinionLang): string {
  const v = decimalStr(Math.round(n), 0, lang);
  return lang === "en" ? `€${v}` : `${v} €`;
}
export function voPercent(fraction: number, lang: ValueOpinionLang, digits = 1): string {
  const v = decimalStr(fraction * 100, digits, lang);
  return lang === "en" ? `${v}%` : `${v} %`;
}

function formatters(lang: ValueOpinionLang, est: (k: string) => string): NumberFormatters {
  return {
    price: (n) => voPrice(n, lang),
    decimal: (n, d) => decimalStr(n, d, lang),
    percent: (f) => voPercent(f, lang, 2),
    money: (n) => (lang === "en" ? `€${decimalStr(n, 2, lang)}` : `${decimalStr(n, 2, lang)} €`),
    units: { sqm: est("units.sqm"), perSqm: est("units.perSqm"), perSqmMonth: est("units.perSqmMonth") },
  };
}

const LOCALE_TAG: Record<ValueOpinionLang, string> = { fr: "fr-LU", en: "en-GB", de: "de-LU" };
function dateParts(d: Date, lang: ValueOpinionLang, withDay: boolean): string {
  const parts = new Intl.DateTimeFormat(LOCALE_TAG[lang], {
    timeZone: "Europe/Luxembourg",
    day: withDay ? "numeric" : undefined,
    month: "long",
    year: "numeric",
  }).formatToParts(d);
  // Recomposee avec des espaces ASCII.
  return parts.map((p) => (p.type === "literal" ? p.value.replace(/\s/g, " ") : p.value)).join("");
}

// ---------- Mise en page ----------
// Mise en page resserree (oct. 2026, retour de Julien) : marges reduites,
// sections enchainees ; une section ne commence sur une nouvelle page que
// si son titre et au moins trois lignes ne tiennent pas dans l'espace
// restant (jamais de titre orphelin en bas de page). En-tete (logo, filet
// or) pose automatiquement sur chaque nouvelle page ; couverture a part.
const PAGE = { w: 595.28, h: 841.89, m: 46 };
const TOP = 76;
const BOTTOM_MARGIN = 54;
const BOTTOM = PAGE.h - BOTTOM_MARGIN;
const SECTION_GAP = 18;
const TITLE_MIN_FOLLOW = 58;
// Logo officiel sur fond clair (fourni par Julien, oct. 2026) : PNG rogne de
// ses seules marges transparentes et reduit a 1600 px de large, sans autre
// retouche (pdfkit ne lit pas le SVG). Couverture : 320 pt de large, soit
// 360 points par pouce ; en-tete : 20 pt de haut. Reference par CHEMIN :
// pdfkit ne l'embarque qu'une fois pour toutes les pages.
const LOGO_PATH = path.join(process.cwd(), "public", "logos", "mapa-logo-fond-clair-1600.png");
const LOGO_ASPECT = 1600 / 336;
const COVER_LOGO_WIDTH = 320;

/** Trace pour les tests : chaque texte ecrit, avec sa page et sa position. */
export type TraceEvent = { page: number; y: number; bottom: number; kind: "title" | "text" | "footer" | "annex" | "row"; text: string; group?: number };

type Ctx = {
  doc: PDFKit.PDFDocument;
  fonts: ResolvedFonts;
  logo: string | null;
  page: number;
  kind: TraceEvent["kind"];
  /** Numero du tableau en cours (trace des lignes). */
  group: number;
};

function logoPath(): string | null {
  try {
    return existsSync(LOGO_PATH) ? LOGO_PATH : null;
  } catch {
    return null;
  }
}

function pageHeader(ctx: Ctx) {
  const { doc } = ctx;
  if (ctx.logo) doc.image(ctx.logo, PAGE.m, 26, { height: 20 });
  doc.moveTo(PAGE.m, 56).lineTo(PAGE.w - PAGE.m, 56).lineWidth(0.8).strokeColor(VO_GOLD).stroke();
  doc.x = PAGE.m;
  doc.y = TOP;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.doc.y + needed > BOTTOM) ctx.doc.addPage();
}

/** Titre de section, enchaine ; nouvelle page seulement si necessaire. */
function section(ctx: Ctx, title: string) {
  const { doc, fonts } = ctx;
  doc.font(fonts.title).fontSize(19);
  const h = doc.heightOfString(title, { width: PAGE.w - 2 * PAGE.m });
  if (doc.y > TOP + 1) doc.y += SECTION_GAP;
  if (doc.y + h + 10 + TITLE_MIN_FOLLOW > BOTTOM) doc.addPage();
  ctx.kind = "title";
  doc.font(fonts.title).fontSize(19).fillColor(VO_BLACK).text(title, PAGE.m, doc.y, { width: PAGE.w - 2 * PAGE.m });
  ctx.kind = "text";
  const y = doc.y + 3;
  doc.moveTo(PAGE.m, y).lineTo(PAGE.m + 36, y).lineWidth(1.4).strokeColor(VO_GOLD).stroke();
  doc.y = y + 9;
}

function paragraph(ctx: Ctx, text: string, opts: { size?: number; color?: string; bold?: boolean; gap?: number } = {}) {
  const { doc, fonts } = ctx;
  doc.font(opts.bold ? fonts.bodyBold : fonts.body).fontSize(opts.size ?? 10).fillColor(opts.color ?? VO_BLACK);
  // Deux lignes au moins sur la page, sinon la suivante.
  ensureSpace(ctx, Math.min(doc.heightOfString(text, { width: PAGE.w - 2 * PAGE.m, lineGap: 2.2 }), 28));
  doc.text(text, PAGE.m, doc.y, { width: PAGE.w - 2 * PAGE.m, lineGap: 2.2, align: "left" });
  doc.moveDown(opts.gap ?? 0.55);
}

/**
 * Tableau libelle / valeur. Ne se coupe jamais en laissant une seule ligne
 * isolee en bas d'une page ou en haut de la suivante.
 */
function rows(ctx: Ctx, items: [string, string][]) {
  const { doc, fonts } = ctx;
  const labelW = 210;
  const valueX = PAGE.m + labelW + 12;
  const valueW = PAGE.w - PAGE.m - valueX;
  doc.font(fonts.body).fontSize(9.5);
  const hs = items.map(([label, value]) => Math.max(doc.heightOfString(label, { width: labelW }), doc.heightOfString(value, { width: valueW })) + 8);
  ctx.group += 1;
  const drawRow = (i: number) => {
    const [label, value] = items[i];
    const h = hs[i];
    const y = doc.y;
    ctx.kind = "row";
    doc.font(fonts.body).fontSize(9.5).fillColor(VO_GREY).text(label, PAGE.m, y + 4, { width: labelW });
    doc.font(fonts.bodyBold).fontSize(9.5).fillColor(VO_BLACK).text(value, valueX, y + 4, { width: valueW });
    ctx.kind = "text";
    doc.moveTo(PAGE.m, y + h).lineTo(PAGE.w - PAGE.m, y + h).lineWidth(0.5).strokeColor(VO_LINE).stroke();
    doc.y = y + h;
  };
  const n = items.length;
  let i = 0;
  while (i < n) {
    let y = doc.y;
    let k = i;
    while (k < n && y + hs[k] <= BOTTOM) {
      y += hs[k];
      k++;
    }
    if (k >= n) {
      for (let j = i; j < n; j++) drawRow(j);
      break;
    }
    let fit = k - i;
    if (fit === 1 && n - i > 1) fit = 0; // une seule ligne en bas de page
    else if (n - k === 1 && fit >= 2) fit -= 1; // une seule ligne en haut de la suivante
    if (fit === 0 && doc.y <= TOP + 1) fit = 1; // ligne plus haute qu'une page
    for (let j = i; j < i + fit; j++) drawRow(j);
    i += fit;
    doc.addPage();
  }
  doc.moveDown(0.5);
}

function footers(ctx: Ctx, footer: string, pageLabel: (n: number, total: number) => string, extraPages = 0) {
  const { doc, fonts } = ctx;
  const range = doc.bufferedPageRange();
  // Total : pages de ce document et pages des PDF joints, ajoutees en fin
  // de document par le navigateur (sans pied de page).
  const total = range.count + extraPages;
  ctx.kind = "footer";
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    ctx.page = i + 1;
    // Marge basse a zero le temps du pied de page : sinon pdfkit, qui
    // ecrit sous la marge, ajouterait une page vide.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = PAGE.h - 34;
    doc.moveTo(PAGE.m, y - 7).lineTo(PAGE.w - PAGE.m, y - 7).lineWidth(0.5).strokeColor(VO_GOLD).stroke();
    doc.font(fonts.body).fontSize(7.5).fillColor(VO_GREY);
    doc.text(footer, PAGE.m, y, { width: 380, lineBreak: false });
    doc.text(pageLabel(i + 1, total), PAGE.w - PAGE.m - 120, y, { width: 120, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
}

/** Pages d'annexes : sommaire, cadres des photos et des plans, legendes. */
function drawAnnexFrames(ctx: Ctx, a: AnnexMeta, layout: AnnexLayout, vo: (k: string, v?: Record<string, string | number>) => string) {
  const { doc, fonts } = ctx;
  const title = (t: string) => {
    ctx.kind = "annex";
    doc.font(fonts.title).fontSize(19).fillColor(VO_BLACK).text(t, PAGE.m, TOP, { width: PAGE.w - 2 * PAGE.m });
    const y = doc.y + 3;
    doc.moveTo(PAGE.m, y).lineTo(PAGE.m + 36, y).lineWidth(1.4).strokeColor(VO_GOLD).stroke();
    ctx.kind = "text";
  };
  // Sommaire : lignes a hauteur fixe (meme decoupage que annexLayout).
  const lines: { text: string; bold: boolean }[] = [];
  if (a.photos.length) lines.push({ text: vo("annex_photos_line", { count: a.photos.length }), bold: true });
  if (a.plans.length) {
    lines.push({ text: vo("annex_plans"), bold: true });
    a.plans.forEach((p, i) => lines.push({ text: `·  ${p.caption || vo("annex_plan_default", { n: i + 1 })}`, bold: false }));
  }
  if (a.documents.length) {
    lines.push({ text: vo("annex_documents"), bold: true });
    a.documents.forEach((d) => lines.push({ text: `·  ${vo(`annex_kind_${d.kind}`)} : ${d.name} (${vo("annex_pages", { count: d.pages })})`, bold: false }));
  }
  for (let p = 0; p < layout.summaryPages; p++) {
    doc.addPage();
    title(vo("annex_title"));
    doc.font(fonts.body).fontSize(9.5).fillColor(VO_GREY).text(vo("annex_intro"), PAGE.m, TOP + 40, { width: PAGE.w - 2 * PAGE.m });
    lines.slice(p * 26, (p + 1) * 26).forEach((l, k) => {
      doc.font(l.bold ? fonts.bodyBold : fonts.body).fontSize(10).fillColor(VO_BLACK)
        .text(l.text, PAGE.m, TOP + 72 + k * 24, { width: PAGE.w - 2 * PAGE.m, height: 20, ellipsis: true, lineBreak: false });
    });
  }
  // Photos et plans : cadres et legendes, page par page.
  for (let p = layout.summaryPages; p < layout.framePages; p++) {
    doc.addPage();
    const slots = layout.slots.filter((s) => s.page === p);
    const isPhoto = slots[0]?.kind === "photo";
    title(isPhoto ? vo("annex_photos") : vo("annex_plans"));
    for (const s of slots) {
      doc.rect(s.rect.x, s.rect.y, s.rect.w, s.rect.h).lineWidth(0.5).strokeColor(VO_LINE).stroke();
      const caption = s.kind === "photo" ? a.photos[s.index].caption : a.plans[s.index].caption || vo("annex_plan_default", { n: s.index + 1 });
      if (caption) {
        doc.font(fonts.body).fontSize(8.5).fillColor(VO_GREY)
          .text(caption, s.rect.x, s.captionY, { width: s.rect.w, height: 20, ellipsis: true, lineBreak: true });
      }
    }
  }
}

/**
 * Genere l'avis de valeur. `messages` : messages next-intl complets de la
 * langue (namespaces value_opinion, admin_estimations, disclaimer).
 */
export function buildValueOpinionPdf(
  e: ValueOpinionEstimation,
  lang: ValueOpinionLang,
  messages: Record<string, unknown>,
  now: Date = new Date(),
  /** Tests : recoit chaque texte ecrit dans le document. */
  collect?: string[],
  /** Tests : page, position et nature de chaque texte. */
  trace?: TraceEvent[],
  /** Metadonnees des annexes (aucun fichier : lib/estimation/value-opinion-annex-layout). */
  annexes: AnnexMeta = EMPTY_ANNEXES,
): Promise<Buffer> {
  const vo = createTranslator({ locale: lang, messages, namespace: "value_opinion" as never }) as unknown as (k: string, v?: Record<string, string | number>) => string;
  const estT = createTranslator({ locale: lang, messages, namespace: "admin_estimations" as never }) as unknown as ((k: string, v?: Record<string, string | number>) => string) & { has: (k: string) => boolean };
  const est = (k: string) => estT(k);
  const f = formatters(lang, est);

  const inputs = (e.internal_output?.inputs_snapshot ?? e.inputs ?? {}) as Record<string, unknown>;
  const methods = (e.internal_output?.methods ?? {}) as Record<string, MethodOut>;
  const weights = e.internal_output?.weights_used ?? {};
  const shares = realMethodShares(methods, weights);
  const out = e.client_output;
  const issued = dateParts(now, lang, true);
  const marketDate = dateParts(new Date(e.internal_output?.computed_at ?? e.created_at), lang, false);
  const empty = vo("empty");

  const enumValue = (k: string, v: unknown): string => {
    if (v === null || v === undefined || v === "") return empty;
    if (typeof v === "boolean") return v ? vo("yes") : vo("no");
    const g = ENUM_GROUP_BY_INPUT[k];
    if (g && typeof v === "string" && estT.has(`${g}.${v}`)) return estT(`${g}.${v}`);
    if (typeof v === "number" && Number.isFinite(v)) return formatInputNumber(k, v, f);
    if (Array.isArray(v)) return v.length === 0 ? empty : estT("inputs.itemsCount", { count: v.length });
    if (typeof v === "object") return empty;
    return String(v);
  };
  const label = (k: string) => (estT.has(`inputs.${k}`) ? estT(`inputs.${k}`) : k);
  const typeLabel = enumValue("type", inputs.type);
  const commune = typeof inputs.commune === "string" && inputs.commune ? inputs.commune : empty;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: TOP, bottom: BOTTOM_MARGIN, left: PAGE.m, right: PAGE.m },
      bufferPages: true,
      info: { Title: vo("title"), Author: "MAPA Property", Subject: vo("subtitle") },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const ctx: Ctx = { doc, fonts: resolveFonts(doc), logo: logoPath(), page: 1, kind: "text", group: 0 };
    const { fonts } = ctx;
    if (collect || trace) {
      const original = doc.text.bind(doc) as (...a: unknown[]) => PDFKit.PDFDocument;
      (doc as unknown as { text: (...a: unknown[]) => PDFKit.PDFDocument }).text = (...a: unknown[]) => {
        const isText = typeof a[0] === "string" || typeof a[0] === "number";
        const y = doc.y;
        const page = ctx.page;
        const res = original(...a);
        if (isText) {
          collect?.push(String(a[0]));
          // Page de fin d'ecriture (un texte long peut passer a la suivante).
          trace?.push({ page: ctx.page, y: page === ctx.page ? y : TOP, bottom: doc.y, kind: ctx.kind, text: String(a[0]), group: ctx.kind === "row" ? ctx.group : undefined });
        }
        return res;
      };
    }
    // Nouvelle page (hors couverture) : en-tete pose automatiquement, y
    // compris quand un texte long deborde.
    doc.on("pageAdded", () => {
      ctx.page += 1;
      pageHeader(ctx);
    });

    // 1. Couverture.
    if (ctx.logo) {
      const w = COVER_LOGO_WIDTH;
      doc.image(ctx.logo, (PAGE.w - w) / 2, 150, { width: w, height: w / LOGO_ASPECT });
    }
    doc.moveTo(PAGE.m + 80, 260).lineTo(PAGE.w - PAGE.m - 80, 260).lineWidth(1.2).strokeColor(VO_GOLD).stroke();
    doc.font(fonts.title).fontSize(34).fillColor(VO_BLACK).text(vo("title"), PAGE.m, 290, { width: PAGE.w - 2 * PAGE.m, align: "center" });
    doc.moveDown(0.4);
    doc.font(fonts.body).fontSize(12.5).fillColor(VO_GREY).text(vo("subtitle"), { width: PAGE.w - 2 * PAGE.m, align: "center" });
    doc.moveDown(2.2);
    doc.font(fonts.bodyBold).fontSize(14).fillColor(VO_BLACK).text(vo("property_line", { type: typeLabel, commune }), { width: PAGE.w - 2 * PAGE.m, align: "center" });
    doc.moveDown(1.6);
    doc.font(fonts.body).fontSize(10.5).fillColor(VO_BLACK);
    if (e.contact_name) doc.text(vo("prepared_for", { name: e.contact_name }), { width: PAGE.w - 2 * PAGE.m, align: "center" });
    doc.text(vo("issued_on", { date: issued }), { width: PAGE.w - 2 * PAGE.m, align: "center" });
    doc.text(vo("reference", { ref: e.id.slice(0, 8).toUpperCase() }), { width: PAGE.w - 2 * PAGE.m, align: "center" });
    // Mention "pas une expertise" : une seule ligne discrete.
    doc.font(fonts.body).fontSize(8.5).fillColor(VO_GREY)
      .text(vo("not_expertise_short"), PAGE.m, BOTTOM - 22, { width: PAGE.w - 2 * PAGE.m, align: "center", lineBreak: false });

    // Contenu : sections enchainees a partir de la page 2.
    doc.addPage();

    // 2. Objet et limites.
    section(ctx, vo("s_scope"));
    for (const k of ["scope_p1", "scope_p2", "scope_p3", "scope_p4"]) paragraph(ctx, vo(k));

    // 3. Description.
    section(ctx, vo("s_description"));
    paragraph(ctx, vo("description_intro"), { color: VO_GREY });
    const desc = estimationInputEntries(inputs)
      .filter(([k]) => !HIDDEN_INPUTS.has(k) && !k.toLowerCase().startsWith("contact"))
      .filter(([, v]) => !(v === null || v === undefined || v === ""))
      .map(([k, v]) => [label(k), enumValue(k, v)] as [string, string]);
    rows(ctx, desc);

    // 4. Contexte de marche.
    const marketTitle = vo("s_market", { date: marketDate });
    section(ctx, marketTitle);
    const d = (m: string) => (methods[m]?.details ?? {}) as Record<string, unknown>;
    const num = (...vals: unknown[]) => vals.map(Number).find((x) => Number.isFinite(x) && x > 0);
    const rentData = (inputs.rentData ?? {}) as { rentPerM2Month?: unknown; yieldRate?: unknown };
    const market: [string, string][] = [];
    const ref = num(d("observatoire").base_per_m2, d("observatoire").baseline_per_m2, d("hedonic").baseline_per_m2, d("statec_reference").baseline_per_m2);
    if (ref) market.push([vo("market_reference"), formatInputNumber("comparablesPpsqm", ref, f)]);
    const adj = num(d("hedonic").adjusted_per_m2, d("statec_reference").adjusted_per_m2);
    if (adj) market.push([vo("market_adjusted"), formatInputNumber("comparablesPpsqm", adj, f)]);
    const rent = num(rentData.rentPerM2Month, d("income_capitalization").rent_per_m2_month);
    if (rent) market.push([vo("market_rent"), formatInputNumber("rentPerM2Month", rent, f)]);
    const yld = num(rentData.yieldRate, d("income_capitalization").yield_used);
    if (yld) market.push([vo("market_yield"), formatInputNumber("yieldRate", yld, f)]);
    const nComp = num(d("sales_comparison").n_comparables_used);
    if (nComp) market.push([vo("market_comparables"), String(Math.round(nComp))]);
    const med = num(d("sales_comparison").median_ppsqm);
    if (med) market.push([vo("market_comparables_median"), formatInputNumber("comparablesPpsqm", med, f)]);
    if (market.length) rows(ctx, market);
    else paragraph(ctx, vo("market_none"), { color: VO_GREY });

    // 5. Methodes : principe, valeur, poids reel.
    section(ctx, vo("s_methods"));
    paragraph(ctx, vo("methods_intro"), { color: VO_GREY });
    const present = VALUE_OPINION_METHODS.filter((k) => methods[k]);
    rows(
      ctx,
      present.map((k) => {
        const m = methods[k];
        const value = m.applicable && m.price != null ? voPrice(m.price, lang) : vo("not_applicable");
        return [estT(`method.${k}`), `${value}  ·  ${vo("col_weight")} ${voPercent(shares[k] ?? 0, lang, 0)}`] as [string, string];
      }),
    );
    for (const k of present) {
      ensureSpace(ctx, 60);
      paragraph(ctx, estT(`method.${k}`), { bold: true, gap: 0.2 });
      paragraph(ctx, vo(`p_${k}`), { size: 10, color: VO_GREY });
    }

    // 6. Synthese.
    section(ctx, vo("s_synthesis"));
    if (out) {
      ensureSpace(ctx, 60);
      doc.font(fonts.body).fontSize(10).fillColor(VO_GREY).text(vo("synthesis_value"), PAGE.m, doc.y);
      doc.font(fonts.title).fontSize(32).fillColor(VO_GOLD).text(voPrice(out.price_mid, lang), PAGE.m, doc.y + 2);
      doc.moveDown(0.5);
      const surface = num(inputs.surfaceLiving, inputs.livingSurface);
      const weighted = present.reduce((s, k) => s + (methods[k].applicable && methods[k].price != null ? (methods[k].price as number) * (shares[k] ?? 0) : 0), 0);
      const synth: [string, string][] = [
        [vo("synthesis_range"), vo("synthesis_range_value", { low: voPrice(out.price_low, lang), high: voPrice(out.price_high, lang) })],
      ];
      if (surface) synth.push([vo("synthesis_per_sqm"), formatInputNumber("comparablesPpsqm", out.price_mid / surface, f)]);
      if (weighted > 0) synth.push([vo("synthesis_weighted"), voPrice(weighted, lang)]);
      const spread = Number(e.internal_output?.std_deviation_pct);
      if (Number.isFinite(spread)) synth.push([vo("synthesis_spread"), voPercent(spread / 100, lang, 1)]);
      if (out.confidence && estT.has(`confidence.${out.confidence}`)) synth.push([vo("synthesis_confidence"), estT(`confidence.${out.confidence}`)]);
      rows(ctx, synth);
    }
    paragraph(ctx, vo("synthesis_text"), { color: VO_GREY });

    // 7. Hypotheses et reserves.
    section(ctx, vo("s_assumptions"));
    for (const k of ["a1", "a2", "a3", "a4", "a5", "a6"]) paragraph(ctx, `·  ${vo(k)}`);

    // 8. Mentions legales (DisclaimerLegal, version complete).
    section(ctx, vo("s_legal"));
    // Texte de DisclaimerLegal adapte au document (et non au site).
    paragraph(ctx, vo("legal_title"), { bold: true });
    for (const k of ["legal_p1", "legal_p2", "legal_p3"]) paragraph(ctx, vo(k));
    paragraph(ctx, vo("not_expertise"), { color: VO_GREY });

    // 9. Signature : Julien Brebion seul, avec telephone et e-mail
    // (document remis au client ; la regle anti-collecte vise le HTML du
    // site). Coordonnees issues de la source unique lib/contact/reveal-lines.
    // Bloc entier sur une meme page.
    const contact = advisorContactLines();
    section(ctx, vo("s_signature"));
    ensureSpace(ctx, 190);
    paragraph(ctx, vo("signature_intro", { date: issued }), { color: VO_GREY, gap: 0.9 });
    paragraph(ctx, vo("signer_name"), { bold: true, size: 13, gap: 0.15 });
    paragraph(ctx, vo("signer_title"), { gap: 0.6 });
    paragraph(ctx, vo("signer_phone", { phone: contact.phone }), { gap: 0.15 });
    paragraph(ctx, vo("signer_email", { email: contact.email }), { gap: 0.6 });
    paragraph(ctx, vo("brand_line"), { gap: 0.15 });
    paragraph(ctx, vo("address"), { gap: 0.4 });
    const y = doc.y + 34;
    doc.moveTo(PAGE.m, y).lineTo(PAGE.m + 220, y).lineWidth(0.8).strokeColor(VO_GOLD).stroke();
    doc.font(fonts.body).fontSize(9).fillColor(VO_GREY).text(vo("signature_label"), PAGE.m, y + 6);

    // 10. Annexes : pages dessinees ici (sommaire, photos, plans) ; images,
    // pages de plan et documents PDF ajoutes ensuite par le navigateur.
    const layout = annexLayout(annexes);
    if (layout.framePages > 0) drawAnnexFrames(ctx, annexes, layout, vo);

    footers(ctx, vo("footer"), (n, total) => vo("page", { n, total }), layout.documentPages);
    doc.end();
  });
}
