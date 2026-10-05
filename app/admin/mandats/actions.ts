"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

// Messages d'erreur affiches a l'ecran (namespace "admin_mandats").
function actionT() {
  return getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_mandats" });
}

// Erreur Supabase : detail dans les journaux serveur, message traduit a l'ecran.
async function saveError(scope: string, error: { message: string }): Promise<Error> {
  console.error(`[admin/mandats] ${scope}`, error.message);
  return new Error((await actionT())("error_save"));
}

// ============================================================================
// Suivi admin generique sur la table `mandats` (anciennement
// mandats_recherche). Aligne exactement sur app/admin/leads/actions.ts.
//
// Durci (sept. 2026) : ces actions n'appelaient PAS requireAdmin() et
// lisaient et ecrivaient via le client de session, couvert par la policy RLS
// "authenticated all mandats" (USING auth.uid() IS NOT NULL) : tout
// utilisateur Supabase Auth authentifie pouvait lire, modifier ou supprimer
// n'importe quel mandat. Traitement aligne sur leads : requireAdmin()
// (liste d'e-mails autorises) et supabaseService() (service_role). La policy
// RLS elle-meme reste permissive (hors perimetre, aucun SQL).
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

  const { error } = await sb
    .from(TABLE)
    .update({ workflow_status: newStatus, workflow_history: history })
    .eq("id", id);

  if (error) throw await saveError("update", error);

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

  const { error } = await sb
    .from(TABLE)
    .update({ workflow_history: history, admin_notes: trimmed })
    .eq("id", id);

  if (error) throw await saveError("update", error);

  revalidatePath(`${ROUTE}/${id}`);
}

export async function setNextFollowUp(id: string, date: string | null) {
  const admin = await requireAdmin();
  if (!admin.ok) throw new Error((await actionT())("error_unauthorized"));
  const sb = supabaseService();
  const { error } = await sb
    .from(TABLE)
    .update({ next_follow_up: date })
    .eq("id", id);
  if (error) throw await saveError("update", error);
  revalidatePath(`${ROUTE}/${id}`);
  revalidatePath(ROUTE);
}

// ============================================================================
// Edition des champs du mandat et suppression RGPD.
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
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: "unauthorized" };
  const sb = supabaseService();

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
  if (error) {
    console.error("[admin/mandats] updateMandat", error.message);
    return { ok: false, error: "db_error" };
  }

  revalidatePath(`${ROUTE}/${id}`);
  revalidatePath(ROUTE);
  return { ok: true };
}

/**
 * Suppression RGPD : DELETE definitif. Redirige vers la liste.
 * La confirmation utilisateur est portee cote UI (composant client).
 */
export async function deleteMandat(id: string): Promise<void> {
  const admin = await requireAdmin();
  if (!admin.ok) throw new Error((await actionT())("error_unauthorized"));
  const sb = supabaseService();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw await saveError("update", error);
  revalidatePath(ROUTE);
  redirect(ROUTE);
}

// ---------- Export RGPD : droit d'acces et portabilite ----------

/**
 * Exporte toutes les donnees d'un mandat au format JSON. Le mandat
 * contient deja les coordonnees client (client_*), inutile d'embarquer
 * le lead d'origine : on garde juste lead_id pour information.
 *
 * Retour structure ({ok,data,filename} ou {ok,error}), jamais de throw
 * cote UI. Le bouton est non destructif : pas de write DB.
 */
export async function exportMandat(
  id: string,
): Promise<
  | { ok: true; data: object; filename: string }
  | { ok: false; error: string }
> {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return { ok: false, error: "unauthorized" };
    const sb = supabaseService();
    const { data: mandat, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();
    if (error || !mandat) return { ok: false, error: "not_found" };

    const exported_at = new Date().toISOString();
    const data = {
      export_type: "mandat",
      exported_at,
      source: "MAPA Property - export RGPD",
      mandat,
    };

    const datePart = exported_at.slice(0, 10);
    const filename = `mapa-mandat-${id.slice(0, 8)}-${datePart}.json`;
    return { ok: true, data, filename };
  } catch (e) {
    console.error("[exportMandat]", (e as Error).message);
    return { ok: false, error: "db_error" };
  }
}
