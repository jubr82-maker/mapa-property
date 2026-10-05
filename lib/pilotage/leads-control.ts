// Controle des demandes clients (oct. 2026).
// Sources verifiees dans le depot :
//  - leads : premier suivi = premiere entree horodatee de workflow_history
//    (changement de statut ou note, app/admin/leads/actions.ts) ; origine =
//    source / type (formulaire) et origin_channel (canal, colonnes ajoutees
//    par 06_pilotage_tables.sql, absentes avant execution).
//  - estimation_requests : pas d'historique ; premier suivi approche par
//    updated_at quand le statut n'est plus "new" (valeur approchee).
import { supabaseService } from "@/lib/supabase-service";
import { displaySource, type DisplaySource } from "@/lib/pilotage/attribution";
import { LEAD_FOLLOWUP_CRITICAL_HOURS, LEAD_FOLLOWUP_WARN_HOURS } from "@/lib/pilotage/config";

export type FollowUpState = "handled" | "waiting" | "late24" | "late48";

export type ControlledRequest = {
  kind: "lead" | "estimation";
  id: string;
  href: string;
  name: string;
  createdAt: string;
  source: DisplaySource;
  form: string | null;
  campaign: string | null;
  handledAt: string | null;
  handledApprox: boolean;
  delayHours: number | null;
  state: FollowUpState;
};

export type LeadsControl = {
  available: boolean;
  requests: ControlledRequest[];
  medianDelayHours: number | null;
  late24: number;
  late48: number;
  bySource: { key: DisplaySource; value: number }[];
};

type LeadRow = {
  id: string;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  type?: string | null;
  source?: string | null;
  workflow_history?: unknown;
  origin_channel?: string | null;
  utm_campaign?: string | null;
};

type EstimationRow = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  status?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  contact_email?: string | null;
};

const isUnknownColumn = (e: { code?: string } | null) => e?.code === "42703" || e?.code === "PGRST204";

function firstHistoryAt(h: unknown): string | null {
  if (!Array.isArray(h)) return null;
  let first: string | null = null;
  for (const e of h) {
    const at = (e as { at?: unknown })?.at;
    if (typeof at === "string" && (!first || at < first)) first = at;
  }
  return first;
}

export function followUpState(createdAt: string, handledAt: string | null, now = Date.now()): FollowUpState {
  if (handledAt) return "handled";
  const ageH = (now - new Date(createdAt).getTime()) / 3_600_000;
  if (ageH >= LEAD_FOLLOWUP_CRITICAL_HOURS) return "late48";
  if (ageH >= LEAD_FOLLOWUP_WARN_HOURS) return "late24";
  return "waiting";
}

export async function loadLeadsControl(days = 90): Promise<LeadsControl> {
  const svc = supabaseService();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  // Colonnes facultatives selon les migrations appliquees : essais du plus
  // complet au plus simple (meme principe que app/admin/leads/page.tsx).
  const base = "id,created_at,first_name,last_name,email,type,source";
  const selectLeads = (cols: string) =>
    svc.from("leads").select(cols).gte("created_at", since).order("created_at", { ascending: false }).limit(2000) as unknown as Promise<{ data: unknown[] | null; error: { code?: string } | null }>;
  let leads = await selectLeads(`${base},workflow_history,origin_channel,utm_campaign`);
  for (const cols of [`${base},workflow_history`, base]) {
    if (!isUnknownColumn(leads.error)) break;
    leads = await selectLeads(cols);
  }
  const selectEst = (cols: string) =>
    svc.from("estimation_requests").select(cols).gte("created_at", since).order("created_at", { ascending: false }).limit(2000) as unknown as Promise<{ data: unknown[] | null; error: { code?: string } | null }>;
  let est = await selectEst("id,created_at,updated_at,status,first_name,last_name,contact_email");
  if (isUnknownColumn(est.error)) est = await selectEst("id,created_at,updated_at,status,contact_email");
  if (leads.error && est.error) {
    return { available: false, requests: [], medianDelayHours: null, late24: 0, late48: 0, bySource: [] };
  }

  const requests: ControlledRequest[] = [];
  for (const l of (leads.data ?? []) as LeadRow[]) {
    const handledAt = firstHistoryAt(l.workflow_history);
    requests.push({
      kind: "lead",
      id: l.id,
      href: `/admin/leads/${l.id}`,
      name: [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || l.id.slice(0, 8),
      createdAt: l.created_at,
      source: displaySource(l),
      form: l.type ?? l.source ?? null,
      campaign: l.utm_campaign ?? null,
      handledAt,
      handledApprox: false,
      delayHours: handledAt ? (new Date(handledAt).getTime() - new Date(l.created_at).getTime()) / 3_600_000 : null,
      state: followUpState(l.created_at, handledAt),
    });
  }
  for (const e of (est.data ?? []) as EstimationRow[]) {
    // Une estimation sans coordonnees n'attend pas de reponse.
    if (!e.contact_email) continue;
    const handledAt = e.status && e.status !== "new" ? (e.updated_at ?? null) : null;
    requests.push({
      kind: "estimation",
      id: e.id,
      href: `/admin/estimations/${e.id}`,
      name: [e.first_name, e.last_name].filter(Boolean).join(" ") || e.contact_email,
      createdAt: e.created_at,
      source: displaySource({}, "estimation"),
      form: "estimation",
      campaign: null,
      handledAt,
      handledApprox: true,
      delayHours: handledAt ? (new Date(handledAt).getTime() - new Date(e.created_at).getTime()) / 3_600_000 : null,
      state: followUpState(e.created_at, handledAt),
    });
  }
  requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const delays = requests.map((r) => r.delayHours).filter((d): d is number => d !== null && d >= 0).sort((a, b) => a - b);
  const median = delays.length ? delays[Math.floor(delays.length / 2)] : null;
  const counts = new Map<DisplaySource, number>();
  for (const r of requests) counts.set(r.source, (counts.get(r.source) ?? 0) + 1);

  return {
    available: true,
    requests,
    medianDelayHours: median === null ? null : Math.round(median * 10) / 10,
    late24: requests.filter((r) => r.state === "late24").length,
    late48: requests.filter((r) => r.state === "late48").length,
    bySource: Array.from(counts.entries()).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value),
  };
}
