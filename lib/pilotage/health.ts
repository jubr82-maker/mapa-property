// Sante des formulaires, des e-mails et de la tache planifiee (oct. 2026).
import { supabaseService } from "@/lib/supabase-service";
import type { FormOutcome } from "@/lib/pilotage/form-events";

export type FormDay = { date: string; form: string } & Record<FormOutcome, number>;

export type FormHealth = {
  available: boolean;
  rows: FormDay[];
  today: Record<FormOutcome, number>;
};

const OUTCOMES: FormOutcome[] = ["ok", "captcha", "rate_limited", "db_error", "invalid", "error"];
const zero = () => Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<FormOutcome, number>;

/** Jour civil a Luxembourg (AAAA-MM-JJ) d'un horodatage. */
export function luxDay(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Luxembourg" }).format(new Date(iso));
}

export async function loadFormHealth(days = 14): Promise<FormHealth> {
  const { data, error } = await supabaseService()
    .from("form_events")
    .select("created_at,form,outcome")
    .gte("created_at", new Date(Date.now() - days * 86400_000).toISOString())
    .limit(20_000);
  if (error) return { available: false, rows: [], today: zero() };
  const map = new Map<string, FormDay>();
  const todayKey = luxDay(new Date());
  const today = zero();
  for (const r of (data ?? []) as { created_at: string; form: string; outcome: FormOutcome }[]) {
    const date = luxDay(r.created_at);
    const k = `${date}|${r.form}`;
    const row = map.get(k) ?? ({ date, form: r.form, ...zero() } as FormDay);
    if (OUTCOMES.includes(r.outcome)) row[r.outcome] += 1;
    map.set(k, row);
    if (date === todayKey && OUTCOMES.includes(r.outcome)) today[r.outcome] += 1;
  }
  const rows = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date) || a.form.localeCompare(b.form));
  return { available: true, rows, today };
}

export type EmailLogRow = {
  created_at: string;
  recipient_masked: string | null;
  kind: string;
  success: boolean;
  failure_reason: string | null;
};

export async function loadEmailLog(limit = 100): Promise<{ available: boolean; rows: EmailLogRow[]; failuresToday: number }> {
  const { data, error } = await supabaseService()
    .from("email_log")
    .select("created_at,recipient_masked,kind,success,failure_reason")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { available: false, rows: [], failuresToday: 0 };
  const rows = (data ?? []) as EmailLogRow[];
  const todayKey = luxDay(new Date());
  return { available: true, rows, failuresToday: rows.filter((r) => !r.success && luxDay(r.created_at) === todayKey).length };
}

export type CronRun = { created_at: string; task: string; ok: boolean; detail: string | null };

export async function loadCronRuns(limit = 60): Promise<{ available: boolean; rows: CronRun[] }> {
  const { data, error } = await supabaseService()
    .from("cron_runs")
    .select("created_at,task,ok,detail")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { available: !error, rows: (data ?? []) as CronRun[] };
}

export async function recordCronRun(task: string, ok: boolean, detail: string): Promise<void> {
  try {
    await supabaseService().from("cron_runs").insert({ task, ok, detail: detail.slice(0, 300) });
  } catch {
    console.warn("[cron-runs] journal indisponible");
  }
}
