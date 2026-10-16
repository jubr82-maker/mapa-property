// Journal des actions de l'admin (oct. 2026). Table EXISTANTE du depot :
// public.bo_audit_log (migration 20260510_night_run.sql) avec ses colonnes
// reelles : actor_email, action, target_table, target_id, diff, ip,
// user_agent. Ecriture service_role uniquement, apres la garde admin de
// l'appelant. Best effort : n'echoue jamais, ne bloque jamais l'action.
// Jamais de donnee de prospect dans diff : identifiants, valeurs metier
// (prix, statut) et noms de fichiers seulement.
import { headers } from "next/headers";
import { supabaseService } from "@/lib/supabase-service";

export type AdminAuditAction =
  | "property_price_changed"
  | "property_published"
  | "property_unpublished"
  | "property_archived"
  | "property_restored"
  | "property_deleted"
  | "property_created"
  | "document_added"
  | "document_deleted"
  | "settings_content_changed"
  | "settings_design_changed"
  | "performance_measured"
  | "backup_run"
  | "estimation_value_opinion"
  | "listing_template_changed"
  | "property_search_created"
  | "property_search_updated"
  | "property_search_status"
  | "property_search_deleted"
  | "faq_saved"
  | "faq_deleted"
  | "faq_reordered";

export async function logAdminAction(entry: {
  actorEmail: string | null | undefined;
  action: AdminAuditAction;
  targetTable?: string | null;
  targetId?: string | null;
  diff?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
      userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
    } catch {
      // hors contexte de requete (tache planifiee)
    }
    const { error } = await supabaseService().from("bo_audit_log").insert({
      actor_email: (entry.actorEmail ?? "systeme").trim().toLowerCase().slice(0, 200),
      action: entry.action,
      target_table: entry.targetTable ?? null,
      target_id: entry.targetId ?? null,
      diff: entry.diff ?? null,
      ip,
      user_agent: userAgent,
    });
    if (error) console.warn("[admin-audit] insertion impossible", { code: error.code });
  } catch {
    console.warn("[admin-audit] journal indisponible");
  }
}
