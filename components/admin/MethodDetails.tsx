"use client";

import { useTranslations } from "next-intl";

// Rendu structure cle->valeur du `details` d'une
// methode d'estimation. Remplace l'ancien <pre>{JSON.stringify}</pre>.
//
// Robustesse : tout champ absent du SCHEMA tombe sur un rendu fallback
// (cle humanisee + valeur brute) -> aucun crash sur details inattendu.

type Format =
  | "currency"          // 763 210 EUR
  | "coef"              // x1.050
  | "surface"           // 115 m2
  | "percent_decimal"   // 0.035 -> 3.50 %
  | "integer"
  | "decimal"
  | "text";

interface FieldSchema {
  /** Clé de traduction (namespace admin_estimations, "details.*"). */
  label: string;
  format: Format;
}

type SchemaEntry = FieldSchema | "coefficients_block";

const SCHEMAS: Record<string, Record<string, SchemaEntry>> = {
  observatoire: {
    // Variante appartement (method:"observatoire_c7")
    method: { label: "internalMethod", format: "text" },
    base_per_m2: { label: "basePerM2", format: "currency" },
    surface: { label: "livingSurface", format: "surface" },
    coef_cpe: { label: "coefEnergyCert", format: "coef" },
    coef_etat: { label: "coefState", format: "coef" },
    coef_etage: { label: "coefFloor", format: "coef" },
    coef_atypique: { label: "coefAtypical", format: "coef" },
    coef_vefa: { label: "coefVefa", format: "coef" },
    coef_surface: { label: "coefSurface", format: "coef" },
    annexes: { label: "annexesBonus", format: "currency" },
    // Variante maison (method:"hedonic_terrain_bati")
    bati_value: { label: "buildingValue", format: "currency" },
    land_value: { label: "landValue", format: "currency" },
    annexes_value: { label: "annexesValue", format: "currency" },
    land_zone: { label: "landZone", format: "integer" },
    range_position: { label: "rangePosition", format: "decimal" },
    market_coef: { label: "marketCoef", format: "coef" },
    market_coef_source: { label: "marketCoefSource", format: "text" },
    // Variante appartement simplifiée (method:"apartment_per_sqm")
    baseline_per_m2: { label: "basePerM2", format: "currency" },
    surface_coef: { label: "coefSurface", format: "coef" },
    // Fallback no-baseline
    reason: { label: "note", format: "text" },
  },
  hedonic: {
    baseline_per_m2: { label: "baselineEffective", format: "currency" },
    baseline_per_m2_raw: { label: "baselineRaw", format: "currency" },
    baseline_source: { label: "baselineSource", format: "text" },
    baseline_reference: { label: "marketReference", format: "text" },
    coefficients: "coefficients_block",
    adjusted_per_m2: { label: "adjustedPerM2", format: "currency" },
    bonus_terrace_eur: { label: "terraceBonus", format: "currency" },
    bonus_parking_eur: { label: "parkingBonus", format: "currency" },
    works_added_value_eur: { label: "worksAddedValue", format: "currency" },
  },
  statec_reference: {
    baseline_per_m2: { label: "baselineEffective", format: "currency" },
    baseline_per_m2_raw: { label: "baselineRaw", format: "currency" },
    baseline_source: { label: "baselineSource", format: "text" },
    baseline_reference: { label: "marketReference", format: "text" },
    state_coef: { label: "coefState", format: "coef" },
    energy_coef: { label: "coefEnergy", format: "coef" },
    year_coef: { label: "coefYear", format: "coef" },
    surface_degressive_coef: { label: "coefSurface", format: "coef" },
    bonus_parking_eur: { label: "parkingBonus", format: "currency" },
    works_added_value_eur: { label: "worksAddedValue", format: "currency" },
    adjusted_per_m2: { label: "adjustedPerM2", format: "currency" },
  },
  income_capitalization: {
    rent_per_m2_month: { label: "rentPerM2Month", format: "decimal" },
    annual_rent: { label: "annualRent", format: "currency" },
    yield_used: { label: "yieldUsed", format: "percent_decimal" },
    reasoning: { label: "formula", format: "text" },
    legal_max_rent_month: { label: "legalMaxRent", format: "currency" },
    legal_rent_cap_note: { label: "legalRentNote", format: "text" },
  },
  depreciated_replacement: {
    land_per_m2: { label: "landPerM2", format: "currency" },
    land_surface: { label: "landSurface", format: "surface" },
    land_value: { label: "landValue", format: "currency" },
    construction_cost_new: { label: "constructionCostNew", format: "currency" },
    depreciation_factor: { label: "depreciationFactor", format: "decimal" },
    depreciated_construction: { label: "depreciatedConstruction", format: "currency" },
  },
  sales_comparison: {
    reason: { label: "status", format: "text" },
    method: { label: "internalMethod", format: "text" },
    n_comparables_raw: { label: "comparablesFound", format: "integer" },
    n_comparables_used: { label: "comparablesUsed", format: "integer" },
    median_ppsqm: { label: "medianPerM2", format: "currency" },
    outlier_method: { label: "outlierMethod", format: "text" },
    surface: { label: "livingSurface", format: "surface" },
  },
};

// Coefficients connus (libellés : namespace admin_estimations, "coef.*").
const COEF_KEYS = [
  "state",
  "energy",
  "year",
  "type",
  "floor",
  "lift_bonus",
  "exposure_bonus",
  "view_bonus",
  "surface_degressive",
];

function fmt(value: unknown, format: Format): string {
  if (value == null || value === "") return "";
  const n = Number(value);
  switch (format) {
    case "currency":
      if (!Number.isFinite(n)) return String(value);
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(n);
    case "coef":
      if (!Number.isFinite(n)) return String(value);
      return `×${n.toFixed(3)}`;
    case "surface":
      if (!Number.isFinite(n)) return String(value);
      return `${n.toLocaleString("fr-FR")} m²`;
    case "percent_decimal":
      if (!Number.isFinite(n)) return String(value);
      return `${(n * 100).toFixed(2)} %`;
    case "integer":
      if (!Number.isFinite(n)) return String(value);
      return n.toString();
    case "decimal":
      if (!Number.isFinite(n)) return String(value);
      return n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
    case "text":
    default:
      return String(value);
  }
}

function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface Row {
  label: string;
  value: string;
  indent?: boolean;
}

interface Props {
  methodKey: string;
  details: Record<string, unknown>;
}

export function MethodDetails({ methodKey, details }: Props) {
  const t = useTranslations("admin_estimations");
  const schema = SCHEMAS[methodKey] ?? {};
  const rows: Row[] = [];

  for (const [key, raw] of Object.entries(details)) {
    const entry = schema[key];
    if (entry === "coefficients_block") {
      if (raw && typeof raw === "object") {
        for (const [coefKey, coefValue] of Object.entries(
          raw as Record<string, unknown>,
        )) {
          rows.push({
            label: COEF_KEYS.includes(coefKey) ? t(`coef.${coefKey}`) : humanize(coefKey),
            value: fmt(coefValue, "coef"),
            indent: true,
          });
        }
      }
    } else if (entry) {
      // Codes internes (variante de méthode, filtrage, source) : affichés
      // sous forme lisible quand un libellé existe.
      const code = typeof raw === "string" ? raw.replace(/\./g, "_") : "";
      const value =
        code && entry.format === "text" && t.has(`methodCode.${code}`)
          ? t(`methodCode.${code}`)
          : fmt(raw, entry.format);
      rows.push({ label: t(`details.${entry.label}`), value });
    } else {
      const fallbackFormat: Format = typeof raw === "number" ? "decimal" : "text";
      rows.push({ label: humanize(key), value: fmt(raw, fallbackFormat) });
    }
  }

  if (rows.length === 0) {
    return (
      <p className="mt-2 text-xs italic text-ink/60">{t("details.empty")}</p>
    );
  }

  return (
    <table className="mt-3 w-full border-collapse text-xs">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-ink/5 last:border-b-0">
            <td
              className={`py-1.5 pr-4 font-mono uppercase tracking-widest text-[10px] text-ink/60 ${
                r.indent ? "pl-4" : ""
              }`}
            >
              {r.label}
            </td>
            <td className="py-1.5 text-right font-medium text-ink">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
