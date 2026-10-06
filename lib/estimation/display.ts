// Affichage des fiches d'estimation (oct. 2026), commun a la fiche de
// l'admin et a l'avis de valeur PDF. Module pur.
//
// Defauts corriges (PROUVE par le code de app/admin/estimations/[id]) :
//  - un objet ou un tableau saisi etait converti en texte brut :
//    rentData.yieldRate s'affichait 0.03 au lieu de 3 %, et
//    comparablesPpsqm 7710.843... au lieu d'un prix au m² ;
//  - les alias d'un meme champ (terrace, terraceSurface, terraceArea)
//    portent le meme libelle "Terrasse (m²)" : il apparaissait deux fois.

/** Alias d'un meme champ : seule la premiere valeur renseignee est gardee. */
export const INPUT_ALIASES: string[][] = [
  ["terraceArea", "terrace", "terraceSurface"],
  ["surfaceLiving", "livingSurface"],
  ["surfaceLand", "landSurface"],
  ["parkingIndoor", "parkingInterior"],
  ["parkingOutdoor", "parkingExterior"],
  ["yearBuilt", "year"],
];

export type InputKind = "surface" | "perSqm" | "perSqmMonth" | "percent" | "count" | "year" | "plain";

const KIND_BY_KEY: Record<string, InputKind> = {
  surfaceLiving: "surface",
  livingSurface: "surface",
  surfaceLand: "surface",
  landSurface: "surface",
  terrace: "surface",
  terraceArea: "surface",
  terraceSurface: "surface",
  balconyArea: "surface",
  gardenArea: "surface",
  basementFinishedSqm: "surface",
  comparablesPpsqm: "perSqm",
  rentPerM2Month: "perSqmMonth",
  yieldRate: "percent",
  bedrooms: "count",
  parkingInterior: "count",
  parkingExterior: "count",
  parkingIndoor: "count",
  parkingOutdoor: "count",
  floor: "count",
  totalFloors: "count",
  yearBuilt: "year",
  year: "year",
};

export function inputKind(key: string): InputKind {
  return KIND_BY_KEY[key] ?? "plain";
}

const empty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Entrees a afficher, dans l'ordre d'origine : alias dedoublonnes, objet
 * rentData decompose en ses deux valeurs (loyer au m², rendement).
 */
export function estimationInputEntries(inputs: Record<string, unknown>): [string, unknown][] {
  const out: [string, unknown][] = [];
  const seenGroup = new Set<number>();
  for (const [key, value] of Object.entries(inputs ?? {})) {
    const g = INPUT_ALIASES.findIndex((grp) => grp.includes(key));
    if (g >= 0) {
      if (seenGroup.has(g)) continue;
      const first = INPUT_ALIASES[g].map((k) => inputs[k]).find((v) => !empty(v));
      seenGroup.add(g);
      out.push([INPUT_ALIASES[g][0], first ?? value]);
      continue;
    }
    if (key === "rentData" && value && typeof value === "object" && !Array.isArray(value)) {
      const rd = value as { rentPerM2Month?: unknown; yieldRate?: unknown };
      out.push(["rentPerM2Month", rd.rentPerM2Month ?? null]);
      out.push(["yieldRate", rd.yieldRate ?? null]);
      continue;
    }
    out.push([key, value]);
  }
  return out;
}

export type NumberFormatters = {
  /** Montant en euros sans decimale. */
  price: (n: number) => string;
  /** Nombre avec decimales eventuelles (sans unite). */
  decimal: (n: number, maxDigits: number) => string;
  /** Fraction en pourcentage (0.03 -> "3 %"). */
  percent: (fraction: number) => string;
  /** Montant en euros avec decimales (loyer au m²). */
  money: (n: number) => string;
  /** Unites traduites. */
  units: { sqm: string; perSqm: string; perSqmMonth: string };
};

/** Valeur numerique formatee selon la nature du champ. */
export function formatInputNumber(key: string, n: number, f: NumberFormatters): string {
  switch (inputKind(key)) {
    case "surface":
      return `${f.decimal(n, 2)} ${f.units.sqm}`;
    case "perSqm":
      return `${f.price(n)}${f.units.perSqm}`;
    case "perSqmMonth":
      return `${f.money(n)}${f.units.perSqmMonth}`;
    case "percent":
      // Rendement stocke en fraction (0.0349) ; une valeur deja en
      // pourcentage (3.49) est ramenee en fraction.
      return f.percent(n > 1 ? n / 100 : n);
    case "count":
    case "year":
      return String(Math.round(n));
    default:
      return f.decimal(n, 2);
  }
}

type MethodLike = { applicable?: boolean; price?: number | null };

/**
 * Poids reels des methodes : poids enregistre ramene a la somme des
 * methodes applicables et chiffrees (une methode non applicable pese 0).
 */
export function realMethodShares(methods: Record<string, MethodLike>, weights: Record<string, number>): Record<string, number> {
  const usable = Object.keys(methods).filter((k) => methods[k]?.applicable && methods[k]?.price != null && (weights[k] ?? 0) > 0);
  const total = usable.reduce((s, k) => s + (weights[k] ?? 0), 0);
  const out: Record<string, number> = {};
  for (const k of Object.keys(methods)) out[k] = total > 0 && usable.includes(k) ? (weights[k] ?? 0) / total : 0;
  return out;
}
