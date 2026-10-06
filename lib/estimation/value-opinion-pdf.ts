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
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import { resolveFonts, type ResolvedFonts } from "@/lib/admin/exports/pdf";
import { VO_BLACK, VO_GOLD, VO_GREY, VO_LINE } from "@/lib/admin/exports/theme";
import { estimationInputEntries, formatInputNumber, realMethodShares, type NumberFormatters } from "@/lib/estimation/display";

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
const PAGE = { w: 595.28, h: 841.89, m: 56 };
const FOOTER_H = 40;
const LOGO_PATH = path.join(process.cwd(), "public", "logo_mapa_jour.png");
const LOGO_ASPECT = 2000 / 458;

type Ctx = { doc: PDFKit.PDFDocument; fonts: ResolvedFonts; logo: Buffer | null };

function logoBuffer(): Buffer | null {
  try {
    return existsSync(LOGO_PATH) ? readFileSync(LOGO_PATH) : null;
  } catch {
    return null;
  }
}

function pageHeader(ctx: Ctx, title: string) {
  const { doc, fonts } = ctx;
  if (ctx.logo) doc.image(ctx.logo, PAGE.m, 34, { height: 22 });
  doc.moveTo(PAGE.m, 66).lineTo(PAGE.w - PAGE.m, 66).lineWidth(1).strokeColor(VO_GOLD).stroke();
  doc.font(fonts.title).fontSize(26).fillColor(VO_BLACK).text(title, PAGE.m, 86, { width: PAGE.w - 2 * PAGE.m });
  doc.moveDown(0.6);
}

function newSection(ctx: Ctx, title: string) {
  ctx.doc.addPage();
  pageHeader(ctx, title);
}

function ensureSpace(ctx: Ctx, needed: number, title: string) {
  if (ctx.doc.y + needed > PAGE.h - PAGE.m - FOOTER_H) newSection(ctx, title);
}

function paragraph(ctx: Ctx, text: string, opts: { size?: number; color?: string; bold?: boolean; gap?: number } = {}) {
  const { doc, fonts } = ctx;
  doc.font(opts.bold ? fonts.bodyBold : fonts.body).fontSize(opts.size ?? 10.5).fillColor(opts.color ?? VO_BLACK)
    .text(text, PAGE.m, doc.y, { width: PAGE.w - 2 * PAGE.m, lineGap: 2.5, align: "left" });
  doc.moveDown(opts.gap ?? 0.7);
}

function rows(ctx: Ctx, items: [string, string][], title: string) {
  const { doc, fonts } = ctx;
  const labelW = 220;
  const valueX = PAGE.m + labelW + 12;
  const valueW = PAGE.w - PAGE.m - valueX;
  for (const [label, value] of items) {
    doc.font(fonts.body).fontSize(10);
    const h = Math.max(doc.heightOfString(label, { width: labelW }), doc.heightOfString(value, { width: valueW })) + 10;
    ensureSpace(ctx, h, title);
    const y = doc.y;
    doc.font(fonts.body).fontSize(10).fillColor(VO_GREY).text(label, PAGE.m, y + 5, { width: labelW });
    doc.font(fonts.bodyBold).fontSize(10).fillColor(VO_BLACK).text(value, valueX, y + 5, { width: valueW });
    doc.moveTo(PAGE.m, y + h).lineTo(PAGE.w - PAGE.m, y + h).lineWidth(0.5).strokeColor(VO_LINE).stroke();
    doc.y = y + h;
  }
  doc.moveDown(0.8);
}

function notice(ctx: Ctx, text: string) {
  const { doc, fonts } = ctx;
  const w = PAGE.w - 2 * PAGE.m - 14;
  doc.font(fonts.body).fontSize(9.5);
  const h = doc.heightOfString(text, { width: w, lineGap: 2 }) + 16;
  const y = doc.y;
  doc.rect(PAGE.m, y, 3, h).fill(VO_GOLD);
  doc.fillColor(VO_BLACK).text(text, PAGE.m + 14, y + 8, { width: w, lineGap: 2 });
  doc.y = y + h + 10;
}

function footers(ctx: Ctx, footer: string, pageLabel: (n: number, total: number) => string) {
  const { doc, fonts } = ctx;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Marge basse a zero le temps du pied de page : sinon pdfkit, qui
    // ecrit sous la marge, ajouterait une page vide.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = PAGE.h - PAGE.m + 6;
    doc.moveTo(PAGE.m, y - 8).lineTo(PAGE.w - PAGE.m, y - 8).lineWidth(0.5).strokeColor(VO_GOLD).stroke();
    doc.font(fonts.body).fontSize(8).fillColor(VO_GREY);
    doc.text(footer, PAGE.m, y, { width: 380, lineBreak: false });
    doc.text(pageLabel(i + 1, range.count), PAGE.w - PAGE.m - 120, y, { width: 120, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottom;
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
): Promise<Buffer> {
  const vo = createTranslator({ locale: lang, messages, namespace: "value_opinion" as never }) as unknown as (k: string, v?: Record<string, string | number>) => string;
  const estT = createTranslator({ locale: lang, messages, namespace: "admin_estimations" as never }) as unknown as ((k: string, v?: Record<string, string | number>) => string) & { has: (k: string) => boolean };
  const disc = createTranslator({ locale: lang, messages, namespace: "disclaimer" as never }) as unknown as (k: string) => string;
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
      margins: { top: PAGE.m, bottom: PAGE.m, left: PAGE.m, right: PAGE.m },
      bufferPages: true,
      info: { Title: vo("title"), Author: "MAPA Property", Subject: vo("subtitle") },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    if (collect) {
      const original = doc.text.bind(doc) as (...a: unknown[]) => PDFKit.PDFDocument;
      (doc as unknown as { text: (...a: unknown[]) => PDFKit.PDFDocument }).text = (...a: unknown[]) => {
        if (typeof a[0] === "string" || typeof a[0] === "number") collect.push(String(a[0]));
        return original(...a);
      };
    }
    const ctx: Ctx = { doc, fonts: resolveFonts(doc), logo: logoBuffer() };
    const { fonts } = ctx;

    // 1. Couverture.
    if (ctx.logo) {
      const w = 300;
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
    doc.y = PAGE.h - PAGE.m - FOOTER_H - 90;
    notice(ctx, vo("not_expertise"));

    // 2. Objet et limites.
    newSection(ctx, vo("s_scope"));
    for (const k of ["scope_p1", "scope_p2", "scope_p3", "scope_p4"]) paragraph(ctx, vo(k));
    notice(ctx, vo("not_expertise"));

    // 3. Description.
    newSection(ctx, vo("s_description"));
    paragraph(ctx, vo("description_intro"), { color: VO_GREY });
    const desc = estimationInputEntries(inputs)
      .filter(([k]) => !HIDDEN_INPUTS.has(k) && !k.toLowerCase().startsWith("contact"))
      .filter(([, v]) => !(v === null || v === undefined || v === ""))
      .map(([k, v]) => [label(k), enumValue(k, v)] as [string, string]);
    rows(ctx, desc, vo("s_description"));

    // 4. Contexte de marche.
    const marketTitle = vo("s_market", { date: marketDate });
    newSection(ctx, marketTitle);
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
    if (market.length) rows(ctx, market, marketTitle);
    else paragraph(ctx, vo("market_none"), { color: VO_GREY });

    // 5. Methodes : principe, valeur, poids reel.
    newSection(ctx, vo("s_methods"));
    paragraph(ctx, vo("methods_intro"), { color: VO_GREY });
    const present = VALUE_OPINION_METHODS.filter((k) => methods[k]);
    rows(
      ctx,
      present.map((k) => {
        const m = methods[k];
        const value = m.applicable && m.price != null ? voPrice(m.price, lang) : vo("not_applicable");
        return [estT(`method.${k}`), `${value}  ·  ${vo("col_weight")} ${voPercent(shares[k] ?? 0, lang, 0)}`] as [string, string];
      }),
      vo("s_methods"),
    );
    for (const k of present) {
      ensureSpace(ctx, 70, vo("s_methods"));
      paragraph(ctx, estT(`method.${k}`), { bold: true, gap: 0.2 });
      paragraph(ctx, vo(`p_${k}`), { size: 10, color: VO_GREY });
    }

    // 6. Synthese.
    newSection(ctx, vo("s_synthesis"));
    if (out) {
      doc.font(fonts.body).fontSize(11).fillColor(VO_GREY).text(vo("synthesis_value"), PAGE.m, doc.y);
      doc.font(fonts.title).fontSize(36).fillColor(VO_GOLD).text(voPrice(out.price_mid, lang), PAGE.m, doc.y + 2);
      doc.moveDown(0.8);
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
      rows(ctx, synth, vo("s_synthesis"));
    }
    paragraph(ctx, vo("synthesis_text"), { color: VO_GREY });

    // 7. Hypotheses et reserves.
    newSection(ctx, vo("s_assumptions"));
    for (const k of ["a1", "a2", "a3", "a4", "a5", "a6"]) paragraph(ctx, `·  ${vo(k)}`);

    // 8. Mentions legales (DisclaimerLegal, version complete).
    newSection(ctx, vo("s_legal"));
    paragraph(ctx, disc("full.title"), { bold: true });
    for (const k of ["full.p1", "full.p2", "full.p3"]) paragraph(ctx, disc(k));
    notice(ctx, vo("not_expertise"));

    // 9. Signature : Julien Brebion seul.
    newSection(ctx, vo("s_signature"));
    paragraph(ctx, vo("signature_intro", { date: issued }), { color: VO_GREY, gap: 1.2 });
    paragraph(ctx, vo("signer_name"), { bold: true, size: 14, gap: 0.2 });
    paragraph(ctx, vo("signer_title"), { gap: 1 });
    paragraph(ctx, vo("brand_line"), { gap: 0.2 });
    paragraph(ctx, vo("address"), { gap: 2 });
    const y = doc.y + 40;
    doc.moveTo(PAGE.m, y).lineTo(PAGE.m + 220, y).lineWidth(0.8).strokeColor(VO_GOLD).stroke();
    doc.font(fonts.body).fontSize(9).fillColor(VO_GREY).text(vo("signature_label"), PAGE.m, y + 6);

    footers(ctx, vo("footer"), (n, total) => vo("page", { n, total }));
    doc.end();
  });
}
