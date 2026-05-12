"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

// ---------- Existant (compat ascendante avec LeadsTable historique) ----------

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads");
}

export async function updateLeadNotes(id: string, notes: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("leads")
    .update({ notes })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads");
}

// ---------- Nouveau workflow (migration 20260512) ----------

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

/**
 * Met à jour le statut workflow d'un lead et trace le changement dans
 * `workflow_history`. Dégrade gracieusement si la migration n'est pas
 * appliquée : remonte l'erreur Supabase telle quelle pour que l'UI affiche
 * le message.
 */
export async function updateWorkflowStatus(
  leadId: string,
  newStatus: string,
  reason?: string,
) {
  const sb = await createSupabaseServerClient();

  // Lecture défensive : si les colonnes n'existent pas, on récupère null
  const { data: lead } = await sb
    .from("leads")
    .select("workflow_status, workflow_history")
    .eq("id", leadId)
    .maybeSingle();

  const history: HistoryEntry[] = Array.isArray(
    (lead as { workflow_history?: unknown } | null)?.workflow_history,
  )
    ? ((lead as { workflow_history: HistoryEntry[] }).workflow_history)
    : [];

  history.push({
    at: new Date().toISOString(),
    from:
      (lead as { workflow_status?: string } | null)?.workflow_status ?? "unknown",
    to: newStatus,
    reason: reason ?? null,
  });

  const { error } = await sb
    .from("leads")
    .update({ workflow_status: newStatus, workflow_history: history })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

/**
 * Ajoute une note libre à `workflow_history` (entrée { at, note }).
 * Persiste également la dernière note dans `admin_notes` pour l'affichage
 * rapide dans la table.
 */
export async function addAdminNote(leadId: string, noteText: string) {
  const trimmed = noteText.trim();
  if (!trimmed) return;

  const sb = await createSupabaseServerClient();

  const { data: lead } = await sb
    .from("leads")
    .select("workflow_history")
    .eq("id", leadId)
    .maybeSingle();

  const history: HistoryEntry[] = Array.isArray(
    (lead as { workflow_history?: unknown } | null)?.workflow_history,
  )
    ? ((lead as { workflow_history: HistoryEntry[] }).workflow_history)
    : [];

  history.push({ at: new Date().toISOString(), note: trimmed });

  const { error } = await sb
    .from("leads")
    .update({ workflow_history: history, admin_notes: trimmed })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/leads/${leadId}`);
}

/**
 * Met à jour la date de prochain follow-up (format ISO date "YYYY-MM-DD").
 * Passer `null` pour effacer.
 */
export async function setNextFollowUp(leadId: string, date: string | null) {
  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("leads")
    .update({ next_follow_up: date })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
}
