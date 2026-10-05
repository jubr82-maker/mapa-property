"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

// Messages d'erreur affiches a l'ecran (namespace "admin_arcova").
function actionT() {
  return getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_arcova" });
}

// Erreur Supabase : detail dans les journaux serveur, message traduit a l'ecran.
async function saveError(scope: string, error: { message: string }): Promise<Error> {
  console.error(`[admin/arcova] ${scope}`, error.message);
  return new Error((await actionT())("error_save"));
}

// ============================================================================
// Suivi admin generique sur la table `arcova_waitlist`.
// Aligne exactement sur app/admin/leads/actions.ts. Si les colonnes de
// suivi manquent, l'erreur est journalisee et un message traduit s'affiche.
// ============================================================================

const TABLE = "arcova_waitlist";
const ROUTE = "/admin/arcova";

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
  if (!admin.ok) throw new Error((await actionT())("error_unauthorized"));
  const sb = supabaseService();

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

  const { data: updated, error } = await sb
    .from(TABLE)
    .update({ workflow_status: newStatus, workflow_history: history })
    .eq("id", id)
    .select("id");

  if (error) throw await saveError("update", error);
  if (!updated || updated.length === 0) throw new Error((await actionT())("error_not_found"));

  revalidatePath(ROUTE);
  revalidatePath(`${ROUTE}/${id}`);
}

export async function addAdminNote(id: string, noteText: string) {
  const trimmed = noteText.trim();
  if (!trimmed) return;

  const admin = await requireAdmin();
  if (!admin.ok) throw new Error((await actionT())("error_unauthorized"));
  const sb = supabaseService();

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

  const { data: updated, error } = await sb
    .from(TABLE)
    .update({ workflow_history: history, admin_notes: trimmed })
    .eq("id", id)
    .select("id");

  if (error) throw await saveError("update", error);
  if (!updated || updated.length === 0) throw new Error((await actionT())("error_not_found"));

  revalidatePath(`${ROUTE}/${id}`);
}

export async function setNextFollowUp(id: string, date: string | null) {
  const admin = await requireAdmin();
  if (!admin.ok) throw new Error((await actionT())("error_unauthorized"));
  const sb = supabaseService();
  const { data, error } = await sb
    .from(TABLE)
    .update({ next_follow_up: date })
    .eq("id", id)
    .select("id");
  if (error) throw await saveError("update", error);
  if (!data || data.length === 0) throw new Error((await actionT())("error_not_found"));
  revalidatePath(`${ROUTE}/${id}`);
  revalidatePath(ROUTE);
}
