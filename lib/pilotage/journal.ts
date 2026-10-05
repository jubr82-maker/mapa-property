// Journal de l'admin (oct. 2026) : reunit les journaux EXISTANTS, colonnes
// verifiees dans le depot :
//  - admin_auth_log : created_at, event, email, success, reason, ip
//    (connexions, facteur utilise : code "mfa" ou Passkey "passkey_login")
//  - bo_audit_log : created_at, actor_email, action, target_table,
//    target_id, diff (lib/pilotage/audit.ts)
//  - offmarket_audit_log : created_at, action, details, property_id,
//    request_id, user_id (app/admin/offmarket/actions.ts)
import { supabaseService } from "@/lib/supabase-service";

export type JournalEntry = {
  at: string;
  source: "auth" | "admin" | "offmarket";
  event: string;
  actor: string | null;
  success: boolean | null;
  detail: Record<string, unknown> | string | null;
  ip: string | null;
};

export async function loadJournal(days = 30, limit = 300): Promise<{ available: Record<JournalEntry["source"], boolean>; entries: JournalEntry[] }> {
  const svc = supabaseService();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const [auth, bo, om] = await Promise.all([
    svc.from("admin_auth_log").select("created_at,event,email,success,reason,ip").gte("created_at", since).order("created_at", { ascending: false }).limit(limit),
    svc.from("bo_audit_log").select("created_at,actor_email,action,target_table,target_id,diff,ip").gte("created_at", since).order("created_at", { ascending: false }).limit(limit),
    svc.from("offmarket_audit_log").select("created_at,action,details").gte("created_at", since).order("created_at", { ascending: false }).limit(limit),
  ]);
  const entries: JournalEntry[] = [];
  for (const r of (auth.data ?? []) as { created_at: string; event: string; email: string | null; success: boolean; reason: string | null; ip: string | null }[]) {
    entries.push({ at: r.created_at, source: "auth", event: r.event, actor: r.email, success: r.success, detail: r.reason, ip: r.ip });
  }
  for (const r of (bo.data ?? []) as { created_at: string; actor_email: string; action: string; target_table: string | null; target_id: string | null; diff: Record<string, unknown> | null; ip: string | null }[]) {
    entries.push({ at: r.created_at, source: "admin", event: r.action, actor: r.actor_email, success: true, detail: r.diff, ip: r.ip });
  }
  for (const r of (om.data ?? []) as { created_at: string; action: string; details: Record<string, unknown> | null }[]) {
    entries.push({ at: r.created_at, source: "offmarket", event: r.action, actor: null, success: true, detail: r.details, ip: null });
  }
  entries.sort((a, b) => b.at.localeCompare(a.at));
  return {
    available: { auth: !auth.error, admin: !bo.error, offmarket: !om.error },
    entries: entries.slice(0, limit),
  };
}

/** Alertes de securite des N derniers jours, pour le tableau de bord. */
export function securitySignals(entries: JournalEntry[], hours = 24) {
  const since = Date.now() - hours * 3_600_000;
  const recent = entries.filter((e) => new Date(e.at).getTime() >= since);
  return {
    failedLogins: recent.filter((e) => e.source === "auth" && e.success === false && ["login", "mfa", "passkey_login"].includes(e.event)).length,
    newDevices: recent.filter((e) => e.source === "auth" && e.success && ["factor_add", "passkey_add"].includes(e.event)).length,
    deletions: recent.filter((e) => e.source === "admin" && e.event === "property_deleted").length,
  };
}
