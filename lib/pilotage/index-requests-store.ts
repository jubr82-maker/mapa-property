// Memoire des demandes d'indexation (nov. 2026), table public.index_requests
// (SQL 43). Table absente : rien ne plante, aucune demande memorisee et la
// case affiche « base pas encore prete ».
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRelation } from "@/lib/pilotage/controle-core";
import type { IndexRequest } from "@/lib/pilotage/index-requests";

export async function loadIndexRequests(supabase: SupabaseClient): Promise<{ ready: boolean; requests: IndexRequest[] }> {
  try {
    const { data, error } = await supabase.from("index_requests").select("url, requested_on").limit(2000);
    if (error) {
      if (!isMissingRelation(error.code) && error.code !== "PGRST205") console.error("[index_requests] lecture", { code: error.code });
      return { ready: false, requests: [] };
    }
    return {
      ready: true,
      requests: ((data ?? []) as { url: string; requested_on: string }[]).map((r) => ({ url: r.url, requestedOn: String(r.requested_on).slice(0, 10) })),
    };
  } catch {
    return { ready: false, requests: [] };
  }
}

/** Cochee : date du jour enregistree ; decochee : demande oubliee. */
export async function setIndexRequest(supabase: SupabaseClient, url: string, requested: boolean, today: string): Promise<"ok" | "not_ready" | "error"> {
  const res = requested
    ? await supabase.from("index_requests").upsert({ url, requested_on: today, updated_at: new Date().toISOString() }, { onConflict: "url" })
    : await supabase.from("index_requests").delete().eq("url", url);
  if (!res.error) return "ok";
  if (isMissingRelation(res.error.code) || res.error.code === "PGRST205") return "not_ready";
  console.error("[index_requests] ecriture", { code: res.error.code });
  return "error";
}
