// lib/admin/exports/excel.ts — génération Excel (.xlsx) partagée, sur le
// modèle validé par Julien le 2026-09-22 : en-tête sombre/crème, ligne
// figée, filtre automatique, colonnes typées, lignes alternées, bordure
// fine, retour à la ligne réservé aux colonnes de texte long.
//
// IMPORTANT (condition posée par Julien à l'installation d'exceljs,
// 2026-09-20) : ce module ne doit JAMAIS servir à LIRE ou analyser un
// fichier Excel fourni par un tiers — uniquement l'API d'ÉCRITURE
// d'exceljs (Workbook.addWorksheet/addRow puis .xlsx.writeBuffer()).
//
// COULEURS : lib/admin/exports/theme.ts uniquement.
//
// DÉFAUT CORRIGÉ (fichier .xlsx invalide / "réparé" par Excel) : ce
// module est une réécriture complète, avec validation indépendante du
// fichier produit (ouverture par un lecteur tiers, hors exceljs) avant
// toute livraison — cf. rapport de mission, étape 5.
import ExcelJS from "exceljs";
import { DARK, CREAM, CREAM_VERY_LIGHT, BORDER, toArgb } from "@/lib/admin/exports/theme";

export type ExcelColumnType = "text" | "longText" | "date" | "datetime" | "amount" | "number";

export interface ExcelColumn<T> {
  header: string;
  key: string;
  type: ExcelColumnType;
  width?: number;
  value: (row: T) => string | number | Date | null;
}

const DEFAULT_WIDTH: Record<ExcelColumnType, number> = {
  text: 22,
  longText: 46,
  date: 13,
  datetime: 17,
  amount: 16,
  number: 12,
};

const NUM_FMT: Partial<Record<ExcelColumnType, string>> = {
  date: "dd/mm/yyyy",
  datetime: "dd/mm/yyyy hh:mm",
  amount: '#,##0" €"',
  number: "#,##0",
};

const HEADER_ROW_HEIGHT = 24;
const DATA_ROW_HEIGHT = 20;

/**
 * Construit un classeur .xlsx à partir de colonnes typées et d'un tableau
 * de lignes. Retourne un Buffer prêt à être renvoyé dans une réponse
 * HTTP. Aucune fonction de lecture/analyse d'un fichier fourni par un
 * tiers n'est utilisée ici (uniquement l'API d'écriture d'exceljs).
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

  const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName), {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? DEFAULT_WIDTH[c.type],
  }));

  const borderStyle = {
    bottom: { style: "thin" as const, color: { argb: toArgb(BORDER) } },
  };

  const headerRow = sheet.getRow(1);
  headerRow.height = HEADER_ROW_HEIGHT;
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: toArgb(CREAM) } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: toArgb(DARK) } };
    cell.alignment = { vertical: "middle" };
    cell.border = borderStyle;
  });

  rows.forEach((row, rowIndex) => {
    const values: Record<string, string | number | Date | null> = {};
    for (const c of columns) values[c.key] = c.value(row);
    const excelRow = sheet.addRow(values);
    excelRow.height = DATA_ROW_HEIGHT;

    const isAlternate = rowIndex % 2 === 1;
    columns.forEach((c, i) => {
      const cell = excelRow.getCell(i + 1);
      const numFmt = NUM_FMT[c.type];
      if (numFmt) cell.numFmt = numFmt;
      cell.border = borderStyle;
      cell.alignment = {
        vertical: "middle",
        wrapText: c.type === "longText",
      };
      if (isAlternate) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: toArgb(CREAM_VERY_LIGHT) } };
      }
    });
  });

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: columns.length },
    };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Noms d'onglet Excel : 31 caractères max, sans \ / ? * [ ] : */
function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
}
