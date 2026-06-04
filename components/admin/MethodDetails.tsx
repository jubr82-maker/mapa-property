"use client";

// Sprint 6-methodes Lot 2 — rendu structure cle->valeur du `details` d'une
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
  label: string;
  format: Format;
}

type SchemaEntry = FieldSchema | "coefficients_block";

const SCHEMAS: Record<string, Record<string, SchemaEntry>> = {
  observatoire: {
    // Variante appartement (method:"observatoire_c7")
    method: { label: "Méthode interne", format: "text" },
    base_per_m2: { label: "Prix de base au m²", format: "currency" },
    surface: { label: "Surface habitable", format: "surface" },
    coef_cpe: { label: "Coefficient CPE", format: "coef" },
    coef_etat: { label: "Coefficient état", format: "coef" },
    coef_etage: { label: "Coefficient étage", format: "coef" },
    coef_atypique: { label: "Coefficient atypique", format: "coef" },
    coef_vefa: { label: "Coefficient VEFA (neuf)", format: "coef" },
    coef_surface: { label: "Coefficient dégressivité surface", format: "coef" },
    annexes: { label: "Bonus annexes", format: "currency" },
    // Variante maison (method:"hedonic_terrain_bati")
    bati_value: { label: "Valeur bâti", format: "currency" },
    land_value: { label: "Valeur terrain", format: "currency" },
    annexes_value: { label: "Valeur annexes", format: "currency" },
    land_zone: { label: "Zone terrain (1-4)", format: "integer" },
    range_position: { label: "Position dans la fourchette", format: "decimal" },
    // Fallback no-baseline
    reason: { label: "Note", format: "text" },
  },
  hedonic: {
    baseline_per_m2: { label: "Prix de base au m² (effectif)", format: "currency" },
    baseline_per_m2_raw: { label: "Prix de base au m² (brut)", format: "currency" },
    baseline_source: { label: "Source baseline", format: "text" },
    baseline_reference: { label: "Référence marché", format: "text" },
    coefficients: "coefficients_block",
    adjusted_per_m2: { label: "Prix au m² ajusté", format: "currency" },
    bonus_terrace_eur: { label: "Bonus terrasse", format: "currency" },
    bonus_parking_eur: { label: "Bonus parking", format: "currency" },
    works_added_value_eur: { label: "Plus-value travaux", format: "currency" },
  },
  statec_reference: {
    baseline_per_m2: { label: "Prix de base au m² (effectif)", format: "currency" },
    baseline_per_m2_raw: { label: "Prix de base au m² (brut)", format: "currency" },
    baseline_source: { label: "Source baseline", format: "text" },
    baseline_reference: { label: "Référence marché", format: "text" },
    state_coef: { label: "Coefficient état", format: "coef" },
    energy_coef: { label: "Coefficient énergie", format: "coef" },
    year_coef: { label: "Coefficient année", format: "coef" },
    bonus_parking_eur: { label: "Bonus parking", format: "currency" },
    works_added_value_eur: { label: "Plus-value travaux", format: "currency" },
    adjusted_per_m2: { label: "Prix au m² ajusté", format: "currency" },
  },
  income_capitalization: {
    rent_per_m2_month: { label: "Loyer estimé €/m²/mois", format: "decimal" },
    annual_rent: { label: "Loyer annuel", format: "currency" },
    yield_used: { label: "Rendement utilisé", format: "percent_decimal" },
    reasoning: { label: "Formule", format: "text" },
    legal_max_rent_month: { label: "Plafond légal mensuel (5%)", format: "currency" },
    legal_rent_cap_note: { label: "Note plafond", format: "text" },
  },
  depreciated_replacement: {
    land_per_m2: { label: "Prix terrain €/m²", format: "currency" },
    land_surface: { label: "Surface terrain", format: "surface" },
    land_value: { label: "Valeur terrain", format: "currency" },
    construction_cost_new: { label: "Coût construction neuf", format: "currency" },
    depreciation_factor: { label: "Facteur dépréciation", format: "decimal" },
    depreciated_construction: { label: "Coût construction déprécié", format: "currency" },
  },
  sales_comparison: {
    reason: { label: "Statut", format: "text" },
  },
};

const COEF_LABELS: Record<string, string> = {
  state: "État",
  energy: "Énergie",
  year: "Année",
  type: "Type",
  floor: "Étage",
  lift_bonus: "Ascenseur",
  exposure_bonus: "Exposition",
  view_bonus: "Vue",
};

function fmt(value: unknown, format: Format): string {
  if (value == null || value === "") return "—";
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
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
            label: COEF_LABELS[coefKey] ?? humanize(coefKey),
            value: fmt(coefValue, "coef"),
            indent: true,
          });
        }
      }
    } else if (entry) {
      rows.push({ label: entry.label, value: fmt(raw, entry.format) });
    } else {
      const fallbackFormat: Format = typeof raw === "number" ? "decimal" : "text";
      rows.push({ label: humanize(key), value: fmt(raw, fallbackFormat) });
    }
  }

  if (rows.length === 0) {
    return (
      <p className="mt-2 text-xs italic text-ink/60">Aucun détail disponible.</p>
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
