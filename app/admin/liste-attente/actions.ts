"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/admin/require-admin";

// ============================================================================
// Workflow admin generique sur la table `leads`, filtre type = 'waitlist'.
// Aligne EXACTEMENT sur app/admin/leads/actions.ts et app/admin/arcova/actions.ts.
// La liste d'attente partage la table `leads` avec les autres types de leads
// (cf. app/api/liste-attente/route.ts, insert type: "waitlist"). Le filtre
// type = 'waitlist' sur chaque lecture et ecriture evite qu'un id errone
// touche une ligne d'un autre type.
// ============================================================================

const TABLE = "leads";
const ROUTE = "/admin/liste-attente";
const TYPE = "waitlist";

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

export async function updateWorkflowStatus(
  id: string,
  newStatus: string,
  reason?: string,
) {
  const admin = await requireAdmin();
  if (!admin.ok) throw new Error("unauthorized");
  const sb = supabaseService();

  const { data: current } = await sb
    .from(TABLE)
    .select("workflow_status, workflow_history")
    .eq("id", id)
    .eq("type", TYPE)
    .maybeSingle();

  const history: HistoryEntry[] = Array.isArray(
    (current as { workflow_history?: unknown } | null)?.workflow_history,
  )
    ? ((current as { workflow_history: HistoryEntry[] }).workflow_history)
    : [];

  history.push({
    at: new Date().toISOString(),
    from:
      (current as { workflow_status?: string } | null)?.workflow_status ??
      "unknown",
    to: newStatus,
    reason: reason ?? null,
  });

  const { data: updated, error } = await sb
    .from(TABLE)
    .update({ workflow_status: newStatus, workflow_history: history })
    .eq("id", id)
    .eq("type", TYPE)
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) throw new Error("inscription introuvable, aucune ligne modifiee");

  revalidatePath(ROUTE);
  revalidatePath(`${ROUTE}/${id}`);
}

export async function addAdminNote(id: string, noteText: string) {
  const trimmed = noteText.trim();
  if (!trimmed) return;

  const admin = await requireAdmin();
  if (!admin.ok) throw new Error("unauthorized");
  const sb = supabaseService();

  const { data: current } = await sb
    .from(TABLE)
    .select("workflow_history")
    .eq("id", id)
    .eq("type", TYPE)
    .maybeSingle();

  const history: HistoryEntry[] = Array.isArray(
    (current as { workflow_history?: unknown } | null)?.workflow_history,
  )
    ? ((current as { workflow_history: HistoryEntry[] }).workflow_history)
    : [];

  history.push({ at: new Date().toISOString(), note: trimmed });

  const { data: updated, error } = await sb
    .from(TABLE)
    .update({ workflow_history: history, admin_notes: trimmed })
    .eq("id", id)
    .eq("type", TYPE)
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) throw new Error("inscription introuvable, aucune ligne modifiee");

  revalidatePath(`${ROUTE}/${id}`);
}

export async function setNextFollowUp(id: string, date: string | null) {
  const admin = await requireAdmin();
  if (!admin.ok) throw new Error("unauthorized");
  const sb = supabaseService();
  const { data, error } = await sb
    .from(TABLE)
    .update({ next_follow_up: date })
    .eq("id", id)
    .eq("type", TYPE)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("inscription introuvable, aucune ligne modifiee");
  revalidatePath(`${ROUTE}/${id}`);
  revalidatePath(ROUTE);
}
