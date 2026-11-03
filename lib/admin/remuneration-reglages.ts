// Reglages des agents et de l'employeur (nov. 2026), tables de
// supabase/sql/33_remuneration_reglages.sql. Donnees reservees aux comptes
// admin des ventes realisees (requireSalesAdmin, RLS is_mapa_admin).
//
// Repli : tables absentes (fichier SQL pas encore execute) ou encore vides
// (aucun enregistrement depuis la page de reglages) : reglages par defaut,
// Julien seul agent, part 80 %, mutualite 0,23 %, facteur accident 1.

import type { SupabaseClient } from "@supabase/supabase-js";

export const SSM_LEVELS = ["non_qualifie", "qualifie"] as const;
export type SsmLevel = (typeof SSM_LEVELS)[number];

export const TAX_CLASSES = [1, 2] as const;
export type TaxClass = (typeof TAX_CLASSES)[number];

/** Taux de mutualite des employeurs (%), classes 1 a 4. */
export const MUTUALITE_RATES = [0.23, 0.95, 1.56, 2.66] as const;
export type MutualiteRate = (typeof MUTUALITE_RATES)[number];

/** Facteur bonus-malus de l'assurance accident (AAA). */
export const ACCIDENT_FACTORS = [0.85, 1, 1.1, 1.3, 1.5] as const;
export type AccidentFactor = (typeof ACCIDENT_FACTORS)[number];

export const DEFAULT_AGENT_SHARE_PCT = 80;

export type SalesAgent = {
  key: string;
  /** Nom enregistre ; null = libelle traduit admin_sales.agent.<key>. */
  displayName: string | null;
  active: boolean;
  sharePct: number;
  paysEmployerCharges: boolean;
  taxClass: TaxClass;
  travelDeduction: number;
  ssmLevel: SsmLevel;
  currentNet: number | null;
  reserveStart: string | null;
};

export type EmployerSettings = { mutualiteRate: MutualiteRate; accidentFactor: AccidentFactor };

export const DEFAULT_AGENT: SalesAgent = {
  key: "julien",
  displayName: null,
  active: true,
  sharePct: DEFAULT_AGENT_SHARE_PCT,
  paysEmployerCharges: true,
  taxClass: 1,
  travelDeduction: 0,
  ssmLevel: "non_qualifie",
  currentNet: null,
  reserveStart: null,
};

export const DEFAULT_EMPLOYER: EmployerSettings = { mutualiteRate: 0.23, accidentFactor: 1 };

/** "unavailable" : tables absentes ; "defaults" : tables vides ; "saved" : reglages enregistres. */
export type SettingsSource = "saved" | "defaults" | "unavailable";

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const oneOf = <T extends number>(list: readonly T[], v: unknown): T | null => {
  const n = num(v);
  return n === null ? null : (list.find((x) => Math.abs(x - n) < 1e-9) ?? null);
};

/** Ligne lue en base vers reglages ; toute valeur hors regles prend la valeur par defaut. */
export function agentFromRow(row: Record<string, unknown>): SalesAgent | null {
  const key = typeof row.agent_key === "string" ? row.agent_key : "";
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(key)) return null;
  const share = num(row.part_agent_pct);
  const travel = num(row.frais_deplacement_annuels);
  const net = num(row.net_mensuel_actuel);
  const name = typeof row.display_name === "string" && row.display_name.trim() ? row.display_name.trim() : null;
  const start = typeof row.debut_suivi_reserve === "string" && /^\d{4}-\d{2}-\d{2}/.test(row.debut_suivi_reserve) ? row.debut_suivi_reserve.slice(0, 10) : null;
  return {
    key,
    displayName: name,
    active: row.active !== false,
    sharePct: share !== null && share >= 0 && share <= 100 ? share : DEFAULT_AGENT_SHARE_PCT,
    paysEmployerCharges: row.paie_charges_patronales !== false,
    taxClass: oneOf(TAX_CLASSES, row.classe_impot) ?? 1,
    travelDeduction: travel !== null && travel >= 0 ? travel : 0,
    ssmLevel: row.niveau_ssm === "qualifie" ? "qualifie" : "non_qualifie",
    currentNet: net !== null && net >= 0 ? net : null,
    reserveStart: start,
  };
}

export function employerFromRow(row: Record<string, unknown>): EmployerSettings {
  return {
    mutualiteRate: oneOf(MUTUALITE_RATES, row.mutualite_taux) ?? DEFAULT_EMPLOYER.mutualiteRate,
    accidentFactor: oneOf(ACCIDENT_FACTORS, row.facteur_accident) ?? DEFAULT_EMPLOYER.accidentFactor,
  };
}

/** Agents enregistres (tous, actifs ou non), ou l'agent par defaut. */
export async function loadSalesAgents(supabase: SupabaseClient): Promise<{ agents: SalesAgent[]; source: SettingsSource }> {
  const { data, error } = await supabase.from("mapa_sales_agents").select("*").order("agent_key");
  if (error) return { agents: [DEFAULT_AGENT], source: "unavailable" };
  const agents = ((data ?? []) as Record<string, unknown>[]).map(agentFromRow).filter((a): a is SalesAgent => a !== null);
  return agents.length ? { agents, source: "saved" } : { agents: [DEFAULT_AGENT], source: "defaults" };
}

export async function loadEmployerSettings(supabase: SupabaseClient): Promise<{ employer: EmployerSettings; source: SettingsSource }> {
  const { data, error } = await supabase.from("mapa_employer_settings").select("*").eq("id", 1).maybeSingle();
  if (error) return { employer: DEFAULT_EMPLOYER, source: "unavailable" };
  return data ? { employer: employerFromRow(data as Record<string, unknown>), source: "saved" } : { employer: DEFAULT_EMPLOYER, source: "defaults" };
}

/**
 * Agent d'une vente : sa valeur si c'est un agent des reglages, sinon
 * l'agent par defaut (ancienne valeur encore en base, a reattribuer par
 * supabase/manual/execution/13_ventes_agent_julien.sql).
 */
export function saleAgentKey(agent: string, knownKeys: readonly string[]): string {
  return knownKeys.includes(agent) ? agent : DEFAULT_AGENT.key;
}

/**
 * Agents que la colonne agent des ventes accepte aujourd'hui (contrainte en
 * base, oct. 2026 : Julien Brebion seul). Un nouvel agent demandera un
 * fichier SQL dedie pour cette contrainte, puis son ajout ici.
 */
export const SALE_AGENT_KEYS: readonly string[] = ["julien"];

export type SettingsError =
  | "agent_invalid"
  | "name_invalid"
  | "share_invalid"
  | "tax_class_invalid"
  | "travel_invalid"
  | "ssm_invalid"
  | "net_invalid"
  | "reserve_start_invalid"
  | "mutualite_invalid"
  | "accident_invalid";

const twoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
const amount = (v: unknown, max: number): number | null | "invalid" => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max || !twoDecimals(v)) return "invalid";
  return v;
};

/** Controle serveur des reglages d'un agent saisis dans la page de reglages ; ligne a enregistrer. */
export function parseAgentInput(body: Record<string, unknown>): { row?: Record<string, unknown>; error?: SettingsError } {
  const key = body.key;
  if (typeof key !== "string" || !SALE_AGENT_KEYS.includes(key)) return { error: "agent_invalid" };
  const name = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (name.length < 1 || name.length > 80) return { error: "name_invalid" };
  const share = amount(body.sharePct, 100);
  if (share === null || share === "invalid") return { error: "share_invalid" };
  if (!(TAX_CLASSES as readonly unknown[]).includes(body.taxClass)) return { error: "tax_class_invalid" };
  const travel = amount(body.travelDeduction, 100000);
  if (travel === "invalid") return { error: "travel_invalid" };
  if (!(SSM_LEVELS as readonly unknown[]).includes(body.ssmLevel)) return { error: "ssm_invalid" };
  const net = amount(body.currentNet, 1000000);
  if (net === "invalid") return { error: "net_invalid" };
  const start = body.reserveStart;
  let reserveStart: string | null = null;
  if (start !== null && start !== undefined && start !== "") {
    if (typeof start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start) || new Date(`${start}T00:00:00Z`).toISOString().slice(0, 10) !== start) {
      return { error: "reserve_start_invalid" };
    }
    reserveStart = start;
  }
  return {
    row: {
      agent_key: key,
      display_name: name,
      active: body.active !== false,
      part_agent_pct: share,
      paie_charges_patronales: body.paysEmployerCharges !== false,
      classe_impot: body.taxClass,
      frais_deplacement_annuels: travel ?? 0,
      niveau_ssm: body.ssmLevel,
      net_mensuel_actuel: net,
      debut_suivi_reserve: reserveStart,
    },
  };
}

/** Controle serveur des reglages employeur ; ligne unique (id = 1). */
export function parseEmployerInput(body: Record<string, unknown>): { row?: Record<string, unknown>; error?: SettingsError } {
  const m = oneOf(MUTUALITE_RATES, body.mutualiteRate);
  if (m === null || typeof body.mutualiteRate !== "number") return { error: "mutualite_invalid" };
  const f = oneOf(ACCIDENT_FACTORS, body.accidentFactor);
  if (f === null || typeof body.accidentFactor !== "number") return { error: "accident_invalid" };
  return { row: { id: 1, mutualite_taux: m, facteur_accident: f } };
}

/** Tables de reglages absentes (fichier SQL pas encore execute). */
export function isSettingsTableMissing(error: { code?: string } | null | undefined): boolean {
  return !!error && (error.code === "42P01" || error.code === "PGRST205");
}
