// Controle quotidien (nov. 2026) : acces a la base (tables du SQL 39).
// Tant que le SQL 39 n'est pas execute, rien ne plante : controleDbReady()
// renvoie false et les passages s'arretent avec le detail "db_not_ready".
import { supabaseService } from "@/lib/supabase-service";
import { categoryOf, isMissingRelation, type CheckKey, type Finding } from "@/lib/pilotage/controle-core";

export type Kind = "site" | "google";
export type RunState = "running" | "paused" | "done" | "failed" | "no_key" | "quota";
export type RunRow = {
  id: number;
  kind: Kind;
  trigger: string;
  started_at: string;
  updated_at: string;
  finished_at: string | null;
  state: RunState;
  counters: Record<string, number>;
  cursor: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  detail: string | null;
};
export type ResultRow = { url: string; check_key: CheckKey; category: string; explanation: string; details: Record<string, unknown>; run_id: number };

const LOCK_NAME = "controle";
/** Un passage interrompu depuis plus longtemps est abandonne (les taches tournent toutes les 24 h). */
const RESUME_MAX_AGE_MS = 50 * 3600_000;

export async function controleDbReady(): Promise<boolean> {
  try {
    const { error } = await supabaseService().from("controle_runs").select("id").limit(1);
    if (error) {
      if (error.code && !isMissingRelation(error.code)) console.error("[controle] base", error.code);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function tryLock(holder: string, seconds: number): Promise<boolean> {
  const { data, error } = await supabaseService().rpc("controle_try_lock", { p_name: LOCK_NAME, p_holder: holder, p_seconds: seconds });
  if (error) throw new Error(`lock_${error.code ?? "error"}`);
  return data === true;
}

export async function releaseLock(holder: string): Promise<void> {
  await supabaseService().rpc("controle_release_lock", { p_name: LOCK_NAME, p_holder: holder });
}

export async function lockHeld(): Promise<boolean> {
  const { data } = await supabaseService().from("controle_lock").select("locked_until").eq("name", LOCK_NAME).maybeSingle();
  return Boolean(data && new Date((data as { locked_until: string }).locked_until).getTime() > Date.now());
}

/** Inspections accordees pour le jour (atomique en base). */
export async function takeGoogleQuota(day: string, want: number, stopAt: number): Promise<number> {
  const { data, error } = await supabaseService().rpc("controle_google_quota_take", { p_day: day, p_want: want, p_limit: stopAt });
  if (error) throw new Error(`quota_${error.code ?? "error"}`);
  return typeof data === "number" ? data : 0;
}

export async function googleQuotaUsed(day: string): Promise<number> {
  const { data } = await supabaseService().from("controle_google_quota").select("used").eq("day", day).maybeSingle();
  return (data as { used?: number } | null)?.used ?? 0;
}

const RUN_COLUMNS = "id,kind,trigger,started_at,updated_at,finished_at,state,counters,cursor,summary,detail";

/** Passage en cours (a reprendre) ou nouveau passage. */
export async function openRun(kind: Kind, trigger: string, forceNew: boolean): Promise<RunRow> {
  const svc = supabaseService();
  const { data: open } = await svc.from("controle_runs").select(RUN_COLUMNS).eq("kind", kind).in("state", ["running", "paused", "quota"]).order("started_at", { ascending: false }).limit(1);
  const current = (open?.[0] as RunRow | undefined) ?? null;
  if (current) {
    const fresh = Date.now() - new Date(current.started_at).getTime() < RESUME_MAX_AGE_MS;
    // Limite Google du jour atteinte : le passage reprend des que le
    // compteur du jour le permet (le lendemain), meme apres 20 heures.
    if (!forceNew && (fresh || current.state === "quota")) return current;
    await svc.from("controle_runs").update({ state: "failed", finished_at: new Date().toISOString(), detail: forceNew ? "remplace" : "abandonne", cursor: null }).eq("id", current.id);
  }
  const { data, error } = await svc.from("controle_runs").insert({ kind, trigger, state: "running" }).select(RUN_COLUMNS).single();
  if (error || !data) throw new Error(`run_${error?.code ?? "insert"}`);
  return data as RunRow;
}

export async function saveRun(id: number, patch: Partial<Pick<RunRow, "state" | "counters" | "cursor" | "summary" | "detail" | "finished_at">>): Promise<void> {
  await supabaseService().from("controle_runs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
}

/** Enregistre des constats (explication en francais deja calculee). */
export async function insertFindings(runId: number, findings: Finding[], explain: (f: Finding) => string): Promise<void> {
  const rows = findings.map((f) => ({
    run_id: runId,
    url: f.url.slice(0, 2000),
    check_key: f.key,
    category: categoryOf(f.key),
    explanation: explain(f).slice(0, 1000),
    details: { ...(f.details ?? {}), ...(f.params ? { params: f.params } : {}) },
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabaseService().from("controle_results").insert(rows.slice(i, i + 500));
    if (error) throw new Error(`results_${error.code ?? "insert"}`);
  }
}

export async function loadRuns(kind: Kind, limit = 60): Promise<RunRow[]> {
  const { data } = await supabaseService().from("controle_runs").select(RUN_COLUMNS).eq("kind", kind).order("started_at", { ascending: false }).limit(limit);
  return (data ?? []) as RunRow[];
}

export async function loadResults(runId: number): Promise<ResultRow[]> {
  const out: ResultRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseService().from("controle_results").select("run_id,url,check_key,category,explanation,details").eq("run_id", runId).order("id").range(from, from + 999);
    if (error || !data?.length) break;
    out.push(...(data as ResultRow[]));
    if (data.length < 1000) break;
  }
  return out;
}

/** Dernier passage termine avant `beforeId` (comparaison avec la veille). */
export async function previousDoneRun(kind: Kind, beforeId: number): Promise<RunRow | null> {
  const { data } = await supabaseService().from("controle_runs").select(RUN_COLUMNS).eq("kind", kind).eq("state", "done").lt("id", beforeId).order("id", { ascending: false }).limit(1);
  return (data?.[0] as RunRow | undefined) ?? null;
}
