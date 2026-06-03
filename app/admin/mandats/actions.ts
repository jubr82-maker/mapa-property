"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// ============================================================================
// Sprint MANDATS-A PARTIE 6 — Edition champs mandat + suppression RGPD.
// ============================================================================

export type UpdateMandatFields = {
  type_mandat?: string | null;
  bien_adresse?: string | null;
  bien_type?: string | null;
  prix_mise_en_vente?: number | null;
  commission?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  signed_at?: string | null;
  status?: string | null;
  notes?: string | null;
  admin_notes?: string | null;
};

const ALLOWED_TYPE_MANDAT = new Set([
  "exclusif",
  "semi-exclusif",
  "simple",
  "autonome",
]);

const ALLOWED_STATUS = new Set([
  "actif",
  "vendu",
  "loue",
  "expire",
  "resilie",
]);

/**
 * Met a jour un mandat. Nettoyage : chaines vides -> null. Whitelist
 * des valeurs sur type_mandat et status pour eviter de violer les CHECK
 * contraintes DB et remonter une 500 floue cote UI.
 */
export async function updateMandat(
  id: string,
  fields: UpdateMandatFields,
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createSupabaseServerClient();

  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") {
      cleaned[k] = null;
    } else {
      cleaned[k] = v;
    }
  }

  // Whitelist enum-like fields contre les valeurs hors CHECK.
  if (
    cleaned.type_mandat !== undefined &&
    cleaned.type_mandat !== null &&
    !ALLOWED_TYPE_MANDAT.has(cleaned.type_mandat as string)
  ) {
    return { ok: false, error: "invalid_type_mandat" };
  }
  if (
    cleaned.status !== undefined &&
    cleaned.status !== null &&
    !ALLOWED_STATUS.has(cleaned.status as string)
  ) {
    return { ok: false, error: "invalid_status" };
  }

  const { error } = await sb.from(TABLE).update(cleaned).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`${ROUTE}/${id}`);
  revalidatePath(ROUTE);
  return { ok: true };
}

/**
 * Suppression RGPD : DELETE definitif. Redirige vers la liste.
 * La confirmation utilisateur est portee cote UI (composant client).
 */
export async function deleteMandat(id: string): Promise<void> {
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(ROUTE);
  redirect(ROUTE);
}
