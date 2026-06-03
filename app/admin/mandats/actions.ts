"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

// ============================================================================
// Workflow admin générique sur la table `mandats` (renommée depuis
// mandats_recherche, sprint MANDATS-A — migration 20260603_mandats_unified).
// Aligné EXACTEMENT sur app/admin/leads/actions.ts.
// ============================================================================

const TABLE = "mandats";
const ROUTE = "/admin/mandats";

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
  const sb = await createSupabaseServerClient();

  const { data: current } = await sb
    .from(TABLE)
    .select("workflow_status, workflow_history")
    .eq("id", id)
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

  const { error } = await sb
    .from(TABLE)
    .update({ workflow_status: newStatus, workflow_history: history })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(ROUTE);
  revalidatePath(`${ROUTE}/${id}`);
}

export async function addAdminNote(id: string, noteText: string) {
  const trimmed = noteText.trim();
  if (!trimmed) return;

  const sb = await createSupabaseServerClient();

  const { data: current } = await sb
    .from(TABLE)
    .select("workflow_history")
    .eq("id", id)
    .maybeSingle();

  const history: HistoryEntry[] = Array.isArray(
    (current as { workflow_history?: unknown } | null)?.workflow_history,
  )
    ? ((current as { workflow_history: HistoryEntry[] }).workflow_history)
    : [];

  history.push({ at: new Date().toISOString(), note: trimmed });

  const { error } = await sb
    .from(TABLE)
    .update({ workflow_history: history, admin_notes: trimmed })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`${ROUTE}/${id}`);
}

export async function setNextFollowUp(id: string, date: string | null) {
  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from(TABLE)
    .update({ next_follow_up: date })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`${ROUTE}/${id}`);
  revalidatePath(ROUTE);
}
