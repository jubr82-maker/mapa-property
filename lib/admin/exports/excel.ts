// lib/admin/exports/excel.ts — generation Excel (.xlsx) partagee pour les
// exports admin (listes leads/mandats/offmarket-requests/liste-attente/
// estimations).
//
// IMPORTANT (condition posee par Julien a l'installation d'exceljs,
// 2026-09-20) : ce module ne doit JAMAIS servir a LIRE ou analyser un
// fichier Excel fourni par un tiers — uniquement l'API d'ECRITURE
// d'exceljs (Workbook.addWorksheet/addRow puis .xlsx.writeBuffer()).
// N'importer/utiliser aucune fonction de lecture (workbook.xlsx.load /
// .readFile) dans ce fichier ni ailleurs dans le projet.
//
// exceljs (MIT) n'a plus de rythme de maintenance tres actif — a
// reevaluer periodiquement (cf. rapport de mission du 2026-09-20). Une
// seule alerte pnpm audit le concerne, sur sa dependance transitive
// "uuid" (GHSA-w5hq-g745-h8pq, moderate) : bug de generation d'UUID sur
// un usage avance (buffer explicite trop court), sans rapport avec la
// lecture ou l'ecriture de fichiers xlsx — non exploitable via l'usage
// de ce module.
import ExcelJS from "exceljs";

export type ExcelColumnFormat = "date" | "currency" | "text";

export interface ExcelColumn<T> {
  header: string;
  key: string;
  width?: number;
  format?: ExcelColumnFormat;
  value: (row: T) => string | number | Date | null;
}

const HEADER_FILL = "FF3D4F63"; // bleu nuit MAPA
const HEADER_FONT = "FFF5EFE1"; // creme MAPA

/**
 * Construit un classeur .xlsx a partir de colonnes typees et d'un tableau
 * de lignes. Ligne d'en-tete figee (freeze pane) + mise en forme (gras,
 * fond bleu nuit), format de cellule jj/mm/aaaa pour les dates et
 * "#,##0 €" pour les montants. Retourne un Buffer pret a etre renvoye
 * dans une reponse HTTP.
 */
export async function buildExcelWorkbook<T>(args: {
  sheetName: string;
  columns: ExcelColumn<T>[];
  rows: T[];
}): Promise<Buffer> {
  const { sheetName, columns, rows } = args;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MAPA Property";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 22,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle" };
  });

  for (const row of rows) {
    const values: Record<string, string | number | Date | null> = {};
    for (const c of columns) values[c.key] = c.value(row);
    const excelRow = sheet.addRow(values);
    columns.forEach((c, i) => {
      const cell = excelRow.getCell(i + 1);
      if (c.format === "date") cell.numFmt = "jj/mm/aaaa";
      if (c.format === "currency") cell.numFmt = '#,##0 "€"';
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
