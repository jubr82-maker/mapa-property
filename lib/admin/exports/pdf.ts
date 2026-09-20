// lib/admin/exports/pdf.ts — generation PDF partagee pour les exports
// admin de fiches individuelles (lead / mandat / estimation). pdfkit
// (MIT), pur Node, sans Chromium headless — compatible fonctions
// serverless Vercel (region arn1).
//
// Mise en page volontairement sobre (texte + filets, logo mono en tete,
// pas de couleur porteuse d'information) pour rester lisible a
// l'impression noir et blanc. Pagination + mentions legales en pied de
// page sur CHAQUE page (bufferedPageRange + switchToPage).
import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import path from "node:path";

const INK = "#1A1F2A";
const INK_MUTED = "#5B6472";
const GOLD = "#9E7B2A";
const PAGE_MARGIN = 50;

// Logo mono (fond blanc/impression N&B) — cf. public/logo-mapa-property-mono.png.
// Lu une seule fois par cold start de la fonction serverless.
let cachedLogo: Buffer | null | undefined;
function getLogoBuffer(): Buffer | null {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    cachedLogo = readFileSync(
      path.join(process.cwd(), "public", "logo-mapa-property-mono.png"),
    );
  } catch {
    // Fiche PDF toujours generee meme si le logo est introuvable
    // (environnement de build inhabituel) — jamais bloquant.
    cachedLogo = null;
  }
  return cachedLogo;
}

export interface PdfFicheField {
  label: string;
  value: string;
}

export interface PdfFicheSection {
  heading: string;
  fields: PdfFicheField[];
}

export interface PdfFicheOptions {
  /** Ex. "Fiche lead", "Fiche mandat", "Fiche estimation". */
  documentTitle: string;
  /** Ex. reference/identifiant technique affiche sous le titre. */
  reference?: string;
  sections: PdfFicheSection[];
}

const FOOTER_LEGAL =
  "MAPA Property, une marque de MAPA Synergy Sàrl. Document interne, ne pas diffuser.";

export function buildFichePdf(options: PdfFicheOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: options.documentTitle,
        Author: "MAPA Property",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const logo = getLogoBuffer();
    if (logo) {
      try {
        doc.image(logo, PAGE_MARGIN, PAGE_MARGIN, { width: 120 });
      } catch {
        // Format image inattendu : on continue sans logo, jamais bloquant.
      }
    }

    const headerRight = logo ? PAGE_MARGIN + 140 : PAGE_MARGIN;
    doc
      .fillColor(INK)
      .fontSize(20)
      .text(options.documentTitle, headerRight, PAGE_MARGIN + 4, {
        width: 545 - headerRight,
      });
    if (options.reference) {
      doc
        .fillColor(INK_MUTED)
        .fontSize(10)
        .text(options.reference, headerRight, doc.y + 2);
    }
    doc
      .fillColor(INK_MUTED)
      .fontSize(9)
      .text(
        `Édité le ${new Date().toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`,
        headerRight,
        doc.y + 2,
      );

    doc.moveDown(2);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(595 - PAGE_MARGIN, doc.y)
      .strokeColor(GOLD)
      .lineWidth(1)
      .stroke();
    doc.moveDown(1.2);

    for (const section of options.sections) {
      // Saut de page si le bloc ne tient manifestement plus (marge de
      // securite : entete de section + au moins 1 ligne).
      if (doc.y > 720) doc.addPage();

      doc.fillColor(INK).fontSize(13).text(section.heading);
      doc
        .moveTo(PAGE_MARGIN, doc.y + 2)
        .lineTo(PAGE_MARGIN + 60, doc.y + 2)
        .strokeColor(GOLD)
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.6);

      for (const field of section.fields) {
        if (doc.y > 760) doc.addPage();
        doc
          .fontSize(10)
          .fillColor(INK_MUTED)
          .text(field.label, PAGE_MARGIN, doc.y, { continued: true, width: 495 })
          .fillColor(INK)
          .text(`  ${field.value || "—"}`);
        doc.moveDown(0.25);
      }
      doc.moveDown(0.9);
    }

    // Pied de page (mentions legales + pagination) sur CHAQUE page,
    // ajoute en dernier via bufferedPageRange pour couvrir les pages
    // creees par les sauts de page ci-dessus.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.height - PAGE_MARGIN + 10;
      doc
        .fontSize(7)
        .fillColor(INK_MUTED)
        .text(FOOTER_LEGAL, PAGE_MARGIN, bottom, {
          width: 595 - PAGE_MARGIN * 2,
          align: "center",
        })
        .text(`Page ${i - range.start + 1} / ${range.count}`, PAGE_MARGIN, bottom + 10, {
          width: 595 - PAGE_MARGIN * 2,
          align: "center",
        });
    }

    doc.end();
  });
}
