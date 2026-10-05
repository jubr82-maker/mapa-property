// Compteurs de l'activite commerciale sur une periode (oct. 2026). Tables
// et colonnes deja lues par l'admin : leads (type, source), estimation_requests,
// offmarket_requests, arcova_waitlist (created_at).
import { supabaseService } from "@/lib/supabase-service";

export type ActivityCounts = Record<
  "leads" | "nda" | "waitlist" | "chatbot" | "estimations" | "offmarketRequests" | "arcova",
  number | null
>;

export async function loadActivityCounts(days = 30): Promise<ActivityCounts> {
  const svc = supabaseService();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const r = await q;
    return r.error ? null : (r.count ?? 0);
  };
  const head = { count: "exact" as const, head: true };
  const [leads, nda, waitlist, chatbot, estimations, offmarketRequests, arcova] = await Promise.all([
    count(svc.from("leads").select("id", head).gte("created_at", since)),
    count(svc.from("leads").select("id", head).gte("created_at", since).eq("type", "offmarket_request")),
    count(svc.from("leads").select("id", head).gte("created_at", since).like("source", "waitlist%")),
    count(svc.from("leads").select("id", head).gte("created_at", since).like("source", "chatbot%")),
    count(svc.from("estimation_requests").select("id", head).gte("created_at", since)),
    count(svc.from("offmarket_requests").select("id", head).gte("created_at", since)),
    count(svc.from("arcova_waitlist").select("id", head).gte("created_at", since)),
  ]);
  return { leads, nda, waitlist, chatbot, estimations, offmarketRequests, arcova };
}
