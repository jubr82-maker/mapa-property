// Taux des nouveaux credits immobiliers aux menages au Luxembourg, series
// officielles de la BCE (MIR). Module pur, utilisable cote client et serveur.
// Reutilisation autorisee (politique de reutilisation des statistiques du
// SEBC) a condition de citer la source et de ne pas modifier les chiffres :
// les valeurs sont enregistrees et affichees telles que publiees.

export const ECB_SOURCE = "Statistiques BCE";
export const ECB_API_BASE = "https://data-api.ecb.europa.eu/service/data/MIR/";

/** Cles officielles, dans l'ordre d'affichage du tableau. */
export const OFFICIAL_RATE_KEYS = [
  "variable_1y",
  "fixed_1_5",
  "fixed_5_10",
  "fixed_over_10",
  "fixed_over_1",
  "average",
  "average_new_only",
  "average_renegotiated",
] as const;
export type OfficialRateKey = (typeof OFFICIAL_RATE_KEYS)[number];

/** Serie BCE de chaque cle officielle (dataset MIR). */
export const ECB_SERIES: Record<OfficialRateKey, string> = {
  variable_1y: "M.LU.B.A2C.F.R.A.2250.EUR.N",
  fixed_1_5: "M.LU.B.A2C.I.R.A.2250.EUR.N",
  fixed_5_10: "M.LU.B.A2C.O.R.A.2250.EUR.N",
  fixed_over_10: "M.LU.B.A2C.P.R.A.2250.EUR.N",
  fixed_over_1: "M.LU.B.A2C.K.R.A.2250.EUR.N",
  average: "M.LU.B.A2C.A.R.A.2250.EUR.N",
  average_new_only: "M.LU.B.A2C.A.R.A.2250.EUR.P",
  average_renegotiated: "M.LU.B.A2C.A.R.A.2250.EUR.R",
};

/** Deux requetes legeres couvrent les 8 series (2 dernieres observations). */
export const ECB_REQUEST_URLS: readonly string[] = [
  `${ECB_API_BASE}M.LU.B.A2C.F+I+O+P+K+A.R.A.2250.EUR.N?lastNObservations=2&format=csvdata`,
  `${ECB_API_BASE}M.LU.B.A2C.A.R.A.2250.EUR.P+R?lastNObservations=2&format=csvdata`,
];

export type RatesJson = Partial<Record<OfficialRateKey, number>> & {
  fixed_5?: number;
  fixed_10?: number;
  fixed_15?: number;
  fixed_20?: number;
  fixed_25?: number;
  fixed_30?: number;
  variable?: number;
};

// Valeurs de secours, utilisees seulement si la base ne contient aucune
// ligne "Statistiques BCE". Statistiques BCE, periode 2026-09, verifiees le
// 17/11/2026 sur data-api.ecb.europa.eu (series ECB_SERIES ci-dessus).
export const FALLBACK_MONTH = "2026-09";
export const FALLBACK_OFFICIAL: Record<OfficialRateKey, number> = {
  variable_1y: 3.13,
  fixed_1_5: 3.85,
  fixed_5_10: 3.97,
  fixed_over_10: 4.03,
  fixed_over_1: 4.0,
  average: 3.55,
  average_new_only: 3.56,
  average_renegotiated: 3.44,
};

/**
 * Valeurs officielles + cles lues par le simulateur : variable = F,
 * fixed_5 = I, fixed_10 = O, fixed_15 a fixed_30 = P.
 */
export function buildRatesJson(official: Record<OfficialRateKey, number>): RatesJson {
  return {
    ...official,
    variable: official.variable_1y,
    fixed_5: official.fixed_1_5,
    fixed_10: official.fixed_5_10,
    fixed_15: official.fixed_over_10,
    fixed_20: official.fixed_over_10,
    fixed_25: official.fixed_over_10,
    fixed_30: official.fixed_over_10,
  };
}

export const FALLBACK_RATES: RatesJson = buildRatesJson(FALLBACK_OFFICIAL);

// ---------------------------------------------------------------------------
// Lecture de la reponse BCE (format csvdata)
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/** Observations d'une reponse csvdata : serie (sans le prefixe MIR.) -> periode -> valeur. */
export function parseEcbCsv(text: string): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return result;
  const head = parseCsvLine(lines[0]).map((h) => h.trim().toUpperCase());
  const iKey = head.indexOf("KEY");
  const iPeriod = head.indexOf("TIME_PERIOD");
  const iValue = head.indexOf("OBS_VALUE");
  const dims = ["FREQ", "REF_AREA", "BS_REP_SECTOR", "BS_ITEM", "MATURITY_ORIG", "DATA_TYPE_MIR", "AMOUNT_CAT", "BS_COUNT_SECTOR", "CURRENCY_TRANS", "IR_BUS_COV"].map((d) => head.indexOf(d));
  if (iPeriod < 0 || iValue < 0) return result;
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    let key = iKey >= 0 ? (cells[iKey] ?? "").trim() : "";
    if (!key && dims.every((i) => i >= 0)) key = dims.map((i) => cells[i]).join(".");
    key = key.replace(/^MIR\./, "");
    const period = (cells[iPeriod] ?? "").trim();
    const raw = (cells[iValue] ?? "").trim();
    if (!key || !/^\d{4}-\d{2}$/.test(period) || raw === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (!result.has(key)) result.set(key, new Map());
    result.get(key)!.set(period, value);
  }
  return result;
}

/** Periode la plus recente ou les 8 series sont toutes publiees. */
export function latestCompleteMonth(
  obs: Map<string, Map<string, number>>,
): { month: string; official: Record<OfficialRateKey, number> } | null {
  const periods = new Set<string>();
  for (const m of obs.values()) for (const p of m.keys()) periods.add(p);
  for (const p of [...periods].sort().reverse()) {
    const official = {} as Record<OfficialRateKey, number>;
    let complete = true;
    for (const k of OFFICIAL_RATE_KEYS) {
      const v = obs.get(ECB_SERIES[k])?.get(p);
      if (typeof v !== "number") {
        complete = false;
        break;
      }
      official[k] = v;
    }
    if (complete) return { month: p, official };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Taux utilises par le site
// ---------------------------------------------------------------------------

export type RatesRow = {
  rates?: RatesJson | null;
  reference_month?: string | null;
  source?: string | null;
} | null;

/** Ligne BCE la plus recente, ou les valeurs de secours si la base est vide. */
export function effectiveRates(row: RatesRow): { rates: RatesJson; month: string; isFallback: boolean } {
  const r = row?.rates;
  if (row && row.source === ECB_SOURCE && row.reference_month && r && typeof r.fixed_over_10 === "number") {
    return { rates: r, month: row.reference_month, isFallback: false };
  }
  return { rates: FALLBACK_RATES, month: FALLBACK_MONTH, isFallback: true };
}

/** Base de calcul du taux selon la duree (libelle affiche sous le taux). */
export type RateBasis = "variable" | "fixed_1_5" | "interpolated" | "fixed_5_10" | "fixed_over_10";

export function rateBasis(years: number, type: "fixed" | "variable"): RateBasis {
  if (type === "variable") return "variable";
  if (years <= 5) return "fixed_1_5";
  if (years < 10) return "interpolated";
  if (years === 10) return "fixed_5_10";
  return "fixed_over_10";
}

/** "2026-09" -> "septembre 2026" / "September 2026" / "September 2026". */
export function formatRateMonth(monthIso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthIso);
  if (!match) return monthIso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  try {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  } catch {
    return monthIso;
  }
}

/**
 * Valeur officielle affichee sans modification : meme chiffre, au moins deux
 * decimales comme la publication BCE (4 -> 4,00), separateur de la langue.
 */
export function formatOfficialRate(value: number, locale: string): string {
  const s = String(value);
  const [int, frac = ""] = s.split(".");
  const out = `${int}.${frac.padEnd(2, "0")}`;
  return locale === "en" ? out : out.replace(".", ",");
}

/** Nombre de mois entre le mois publie et le mois courant (UTC). */
export function rateAgeMonths(monthIso: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthIso);
  if (!match) return null;
  return now.getUTCFullYear() * 12 + now.getUTCMonth() - (Number(match[1]) * 12 + Number(match[2]) - 1);
}

/** Alerte admin : dernier mois enregistre de plus de 3 mois. */
export function isRateStale(monthIso: string | null | undefined, now = new Date()): boolean {
  if (!monthIso) return true;
  const age = rateAgeMonths(monthIso, now);
  return age === null || age > 3;
}
