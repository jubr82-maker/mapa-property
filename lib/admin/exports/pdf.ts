// lib/admin/exports/pdf.ts — générateur PDF partagé pour les fiches admin
// (lead / mandat / estimation / demande off-market), sur le modèle validé
// par Julien le 2026-09-22. pdfkit (MIT), pur Node, sans Chromium headless
// — compatible fonctions serverless Vercel (région arn1).
//
// COULEURS : lib/admin/exports/theme.ts uniquement — aucune couleur codée
// en dur dans ce fichier.
//
// POLICES : l'admin charge Big Shoulders / Archivo / JetBrains Mono via
// next/font/google (app/admin/layout.tsx:3,11-29) — polices Google web,
// aucun fichier .ttf/.otf n'est présent dans ce dépôt, et aucun ne doit
// être téléchargé sans décision explicite (cf. rapport de mission :
// fichiers à ajouter, avec licence, pour un rendu exact). En attendant :
// les 14 polices standard PDF, les plus proches disponibles :
//   - titres (Big Shoulders, condensée)     -> Helvetica-Bold (pas de
//     condensée dans les polices standard PDF — substitut le plus proche,
//     limitation assumée et documentée)
//   - texte courant (Archivo)                -> Helvetica
//   - petites capitales / références / dates
//     à chasse fixe (JetBrains Mono)          -> Courier / Courier-Bold
//
// DÉFAUT CORRIGÉ (espace insécable étroite dans les montants) : tout le
// texte affiché ici passe par lib/admin/exports/format.ts, qui construit
// les nombres à la main avec une espace ASCII normale — jamais
// Intl.NumberFormat / toLocaleString.
import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DARK, GOLD, GOLD_DARK, CREAM, CREAM_VERY_LIGHT } from "@/lib/admin/exports/theme";

const FONT_TITLE = "Helvetica-Bold";
const FONT_BODY = "Helvetica";
const FONT_BODY_BOLD = "Helvetica-Bold";
const FONT_MONO = "Courier";
const FONT_MONO_BOLD = "Courier-Bold";

const PAGE_MARGIN = 50;
const BANNER_HEIGHT_FIRST = 104;
const BANNER_HEIGHT_CONT = 76;
const BANNER_RULE_WIDTH = 3;
const VALUE_COLUMN_X = 238; // point d'alignement des valeurs, cf. maquette validée
const FOOTER_ZONE = 66; // espace réservé en bas de page pour le pied de page

// Logo MAPA Property doré, seul fichier exploitable trouvé dans le dépôt
// pour "logo doré" — PROUVÉ public/logos/mapa-logo-gold-h96.png (PNG
// RGBA 156×96, vérifié à l'installation). Lu une seule fois par cold
// start de la fonction serverless.
const LOGO_PATH = path.join(process.cwd(), "public", "logos", "mapa-logo-gold-h96.png");
const LOGO_ASPECT = 156 / 96;
let cachedLogo: Buffer | null | undefined;
function getLogoBuffer(): Buffer | null {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    cachedLogo = readFileSync(LOGO_PATH);
  } catch {
    cachedLogo = null; // jamais bloquant : fiche générée sans logo si absent
  }
  return cachedLogo;
}

export interface PdfKpi {
  label: string;
  value: string;
}

export interface PdfTableRow {
  label: string;
  value: string;
}

export interface PdfTableSection {
  kind: "table";
  heading: string;
  rows: PdfTableRow[];
}

export interface PdfTimelineEntry {
  /** Déjà formatée (ex. via fmtDateShort) — ce module ne formate pas les dates. */
  date: string;
  text: string;
}

export interface PdfTimelineSection {
  kind: "timeline";
  heading: string;
  entries: PdfTimelineEntry[];
}

export interface PdfFreeTextSection {
  kind: "freetext";
  heading: string;
  text: string;
}

export type PdfSection = PdfTableSection | PdfTimelineSection | PdfFreeTextSection;

export interface PdfDocumentOptions {
  documentTitle: string;
  subtitle?: string;
  reference: string;
  kpis: PdfKpi[];
  sections: PdfSection[];
}

const FOOTER_LINE_1 = "MAPA Property, une marque de MAPA Synergy Sàrl.";
const FOOTER_LINE_2 = "Document interne, ne pas diffuser.";

interface Ctx {
  doc: PDFKit.PDFDocument;
  title: string;
  subtitle?: string;
  reference: string;
}

// ---------- Primitive : bandeau ----------
function drawBanner(ctx: Ctx, continuation: boolean): void {
  const { doc, title, subtitle, reference } = ctx;
  const width = doc.page.width;
  const height = continuation ? BANNER_HEIGHT_CONT : BANNER_HEIGHT_FIRST;

  doc.rect(0, 0, width, height).fill(DARK);
  doc.rect(0, height - BANNER_RULE_WIDTH, width, BANNER_RULE_WIDTH).fill(GOLD);

  const logo = getLogoBuffer();
  let textX = PAGE_MARGIN;
  const logoH = continuation ? 26 : 44;
  const logoW = logoH * LOGO_ASPECT;
  if (logo) {
    const logoY = (height - BANNER_RULE_WIDTH - logoH) / 2;
    try {
      doc.image(logo, PAGE_MARGIN, logoY, { height: logoH });
      textX = PAGE_MARGIN + logoW + 16;
    } catch {
      // format image inattendu : on continue sans logo
    }
  }

  const refWidth = 160;
  const refX = width - PAGE_MARGIN - refWidth;
  const titleMaxWidth = refX - textX - 16;

  if (continuation) {
    const contTitle = `${title} (suite)`;
    const size = fittedFontSize(doc, FONT_TITLE, contTitle, titleMaxWidth, 15, 9);
    doc
      .font(FONT_TITLE)
      .fontSize(size)
      .fillColor(CREAM)
      .text(contTitle, textX, height / 2 - size / 2, { width: titleMaxWidth, lineBreak: false });
    doc
      .font(FONT_MONO)
      .fontSize(8)
      .fillColor(GOLD)
      .text(reference, refX, height / 2 - 4, { width: refWidth, align: "right", lineBreak: false });
  } else {
    const size = fittedFontSize(doc, FONT_TITLE, title, titleMaxWidth, 26, 15);
    doc
      .font(FONT_TITLE)
      .fontSize(size)
      .fillColor(CREAM)
      .text(title, textX, 30, { width: titleMaxWidth, lineBreak: false });
    if (subtitle) {
      doc
        .font(FONT_BODY)
        .fontSize(10)
        .fillColor(GOLD)
        .text(subtitle, textX, 62, { width: titleMaxWidth, lineBreak: false });
    }
    doc
      .font(FONT_MONO)
      .fontSize(9)
      .fillColor(GOLD)
      .text(reference, refX, 34, { width: refWidth, align: "right", lineBreak: false });
    doc
      .font(FONT_BODY)
      .fontSize(8)
      .fillColor(GOLD)
      .text(`Édité le ${editionDateShort()}`, refX, 50, { width: refWidth, align: "right", lineBreak: false });
  }

  doc.x = PAGE_MARGIN;
  doc.y = height + 22;
}

/** Réduction automatique de la taille de police pour tenir sur une seule
 * ligne (titre du bandeau) — même principe que les cartouches (drawKpis). */
function fittedFontSize(
  doc: PDFKit.PDFDocument,
  font: string,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
): number {
  doc.font(font);
  let size = startSize;
  while (size > minSize) {
    doc.fontSize(size);
    if (doc.widthOfString(text) <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function editionDateShort(): string {
  const now = new Date();
  const p2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${p2(now.getDate())}/${p2(now.getMonth() + 1)}/${now.getFullYear()}`;
}

function newPage(ctx: Ctx): void {
  ctx.doc.addPage();
  drawBanner(ctx, true);
}

function ensureSpace(ctx: Ctx, neededHeight: number): void {
  const bottom = ctx.doc.page.height - FOOTER_ZONE;
  if (ctx.doc.y + neededHeight > bottom) {
    newPage(ctx);
  }
}

// ---------- Primitive : cartouches (3 chiffres clés) ----------
function drawKpis(ctx: Ctx, kpis: PdfKpi[]): void {
  if (kpis.length === 0) return;
  const { doc } = ctx;
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const gap = 14;
  const cardWidth = (contentWidth - gap * (kpis.length - 1)) / kpis.length;
  const cardHeight = 68;
  const top = doc.y;

  kpis.forEach((kpi, i) => {
    const x = PAGE_MARGIN + i * (cardWidth + gap);
    doc
      .roundedRect(x, top, cardWidth, cardHeight, 8)
      .fill(CREAM);

    doc
      .font(FONT_MONO_BOLD)
      .fontSize(8.5)
      .fillColor(GOLD_DARK)
      .text(kpi.label.toUpperCase(), x + 14, top + 12, {
        width: cardWidth - 28,
        characterSpacing: 1,
        lineBreak: false,
      });

    // Réduction automatique de la taille si la valeur déborde.
    let fontSize = 22;
    const maxWidth = cardWidth - 28;
    doc.font(FONT_TITLE);
    while (fontSize > 10) {
      doc.fontSize(fontSize);
      if (doc.widthOfString(kpi.value) <= maxWidth) break;
      fontSize -= 1;
    }
    doc
      .fontSize(fontSize)
      .fillColor(DARK)
      .text(kpi.value, x + 14, top + 30, { width: maxWidth, lineBreak: false });
  });

  doc.x = PAGE_MARGIN;
  doc.y = top + cardHeight + 26;
}

// ---------- Primitive : titre de section + filet doré ----------
function drawSectionHeading(ctx: Ctx, heading: string): void {
  const { doc } = ctx;
  const width = doc.page.width - PAGE_MARGIN * 2;
  doc
    .font(FONT_MONO_BOLD)
    .fontSize(10)
    .fillColor(DARK)
    .text(heading.toUpperCase(), PAGE_MARGIN, doc.y, { characterSpacing: 1.2, lineBreak: false });
  const ruleY = doc.y + 4;
  doc.rect(PAGE_MARGIN, ruleY, width, 1.5).fill(GOLD);
  doc.y = ruleY + 12;
  doc.x = PAGE_MARGIN;
}

// ---------- Primitive : tableau à 2 colonnes, alterné ----------
const ROW_V_PADDING = 7;
const LABEL_COLUMN_WIDTH = VALUE_COLUMN_X - PAGE_MARGIN - 10;

function measureRowHeight(doc: PDFKit.PDFDocument, row: PdfTableRow): number {
  const valueWidth = doc.page.width - PAGE_MARGIN - VALUE_COLUMN_X;
  const labelH = doc.font(FONT_BODY_BOLD).fontSize(9.5).heightOfString(row.label, { width: LABEL_COLUMN_WIDTH });
  const valueH = doc.font(FONT_BODY).fontSize(9.5).heightOfString(row.value || "—", { width: valueWidth });
  return Math.max(labelH, valueH) + ROW_V_PADDING * 2;
}

function drawTableRow(ctx: Ctx, row: PdfTableRow, index: number): void {
  const { doc } = ctx;
  const width = doc.page.width - PAGE_MARGIN * 2;
  const valueWidth = doc.page.width - PAGE_MARGIN - VALUE_COLUMN_X;
  const rowHeight = measureRowHeight(doc, row);
  const top = doc.y;

  if (index % 2 === 1) {
    doc.rect(PAGE_MARGIN, top, width, rowHeight).fill(CREAM_VERY_LIGHT);
  }

  doc
    .font(FONT_BODY_BOLD)
    .fontSize(9.5)
    .fillColor(DARK)
    .text(row.label, PAGE_MARGIN, top + ROW_V_PADDING, { width: LABEL_COLUMN_WIDTH });
  doc
    .font(FONT_BODY)
    .fontSize(9.5)
    .fillColor(DARK)
    .text(row.value || "—", VALUE_COLUMN_X, top + ROW_V_PADDING, { width: valueWidth, align: "right" });

  doc.x = PAGE_MARGIN;
  doc.y = top + rowHeight;
}

function drawTableSection(ctx: Ctx, section: PdfTableSection): void {
  const { doc } = ctx;
  const headingHeight = 12 + 12; // taille approx. titre + filet + marge (cf. drawSectionHeading)
  const totalRowsHeight = section.rows.reduce((acc, r) => acc + measureRowHeight(doc, r), 0);

  // La section entière tient-elle au moins pour son en-tête + 1 ligne ?
  // Si non, on la fait basculer intégralement en page suivante.
  if (section.rows.length > 0) {
    ensureSpace(ctx, headingHeight + measureRowHeight(doc, section.rows[0]));
  } else {
    ensureSpace(ctx, headingHeight);
  }
  void totalRowsHeight;

  drawSectionHeading(ctx, section.heading);

  section.rows.forEach((row, i) => {
    // Garde-fou par ligne : jamais une ligne coupée entre deux pages,
    // même si la section entière dépasse une page.
    ensureSpace(ctx, measureRowHeight(doc, row));
    drawTableRow(ctx, row, i);
  });

  doc.y += 14;
}

// ---------- Primitive : frise (historique) ----------
function measureTimelineEntryHeight(doc: PDFKit.PDFDocument, entry: PdfTimelineEntry, textWidth: number): number {
  const h = doc.font(FONT_BODY).fontSize(9.5).heightOfString(entry.text, { width: textWidth });
  return Math.max(h, 12) + 10;
}

function drawTimelineSection(ctx: Ctx, section: PdfTimelineSection): void {
  const { doc } = ctx;
  const dateColWidth = 90;
  const bulletX = PAGE_MARGIN;
  const dateX = PAGE_MARGIN + 10;
  const textX = PAGE_MARGIN + 10 + dateColWidth;
  const textWidth = doc.page.width - PAGE_MARGIN - textX;

  if (section.entries.length === 0) return;

  ensureSpace(ctx, 24 + measureTimelineEntryHeight(doc, section.entries[0], textWidth));
  drawSectionHeading(ctx, section.heading);

  for (const entry of section.entries) {
    const rowHeight = measureTimelineEntryHeight(doc, entry, textWidth);
    ensureSpace(ctx, rowHeight);
    const top = doc.y;

    doc.circle(bulletX + 2, top + 6, 2.5).fill(GOLD);
    doc
      .font(FONT_MONO)
      .fontSize(9)
      .fillColor(GOLD_DARK)
      .text(entry.date, dateX, top, { width: dateColWidth - 8, lineBreak: false });
    doc
      .font(FONT_BODY)
      .fontSize(9.5)
      .fillColor(DARK)
      .text(entry.text, textX, top, { width: textWidth });

    doc.x = PAGE_MARGIN;
    doc.y = top + rowHeight;
  }

  doc.y += 14;
}

// ---------- Primitive : bloc de texte libre ----------
function drawFreeTextSection(ctx: Ctx, section: PdfFreeTextSection): void {
  const { doc } = ctx;
  const width = doc.page.width - PAGE_MARGIN * 2;
  const text = section.text || "—";
  const textHeight = doc.font(FONT_BODY).fontSize(9.5).heightOfString(text, { width });
  const pageContentHeight = doc.page.height - FOOTER_ZONE - (BANNER_HEIGHT_CONT + 22);

  ensureSpace(ctx, 24 + Math.min(textHeight, pageContentHeight));
  drawSectionHeading(ctx, section.heading);

  doc.font(FONT_BODY).fontSize(9.5).fillColor(DARK).text(text, PAGE_MARGIN, doc.y, { width });
  doc.x = PAGE_MARGIN;
  doc.y += 14;
}

// ---------- Primitive : pied de page (chaque page) ----------
function drawFooter(doc: PDFKit.PDFDocument, reference: string, pageLabel: string): void {
  const width = doc.page.width - PAGE_MARGIN * 2;
  const y = doc.page.height - FOOTER_ZONE + 10;
  doc.rect(PAGE_MARGIN, y, width, 1).fill(GOLD);
  doc
    .font(FONT_BODY)
    .fontSize(7.5)
    .fillColor(DARK)
    .text(FOOTER_LINE_1, PAGE_MARGIN, y + 8, { width, align: "center" })
    .text(FOOTER_LINE_2, PAGE_MARGIN, y + 19, { width, align: "center" });
  doc
    .font(FONT_MONO)
    .fontSize(7)
    .fillColor(GOLD_DARK)
    .text(`${reference} — édité le ${editionDateShort()} — ${pageLabel}`, PAGE_MARGIN, y + 32, {
      width,
      align: "center",
    });
}

export function buildFichePdf(options: PdfDocumentOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: PAGE_MARGIN, right: PAGE_MARGIN },
      bufferPages: true,
      info: { Title: options.documentTitle, Author: "MAPA Property" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ctx: Ctx = { doc, title: options.documentTitle, subtitle: options.subtitle, reference: options.reference };

    drawBanner(ctx, false);
    drawKpis(ctx, options.kpis);

    for (const section of options.sections) {
      if (section.kind === "table") drawTableSection(ctx, section);
      else if (section.kind === "timeline") drawTimelineSection(ctx, section);
      else drawFreeTextSection(ctx, section);
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      drawFooter(doc, options.reference, `Page ${i - range.start + 1} / ${range.count}`);
    }

    doc.end();
  });
}
