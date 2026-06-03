"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// ---------- Sprint MANDATS-A PARTIE 7 — Suppression RGPD (droit à l'oubli) ----------

/**
 * Suppression définitive d'un lead (DELETE FROM leads WHERE id = ?).
 *
 * Effet de bord FK (mandats_lead_id_fkey ON DELETE SET NULL) : si ce lead
 * a déjà été converti en mandat, mandat.lead_id passe automatiquement à
 * NULL — le mandat survit comme document commercial autonome (correct
 * RGPD : on efface le prospect, pas la trace contractuelle).
 *
 * Confirmation utilisateur portée côté UI (DeleteLeadButton). Redirige
 * vers /admin/leads après succès.
 */
export async function deleteLead(id: string): Promise<void> {
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}

// ---------- Sprint MANDATS-A PARTIE 4 — Conversion lead → mandat ----------

type ConvertResult =
  | { ok: true; mandatId: string; alreadyExisted: boolean }
  | { ok: false; error: string };

const TYPE_MANDAT_MAP: Record<string, string> = {
  mandate_exclusive: "exclusif",
  mandate_semi: "semi-exclusif",
  mandate_simple: "simple",
  mandate_autonomous: "autonome",
};

/**
 * Convertit un lead en mandat (table `mandats`).
 *
 * Anti-doublon : si un mandat existe déjà avec ce `lead_id`, on retourne
 * `alreadyExisted: true` + l'id du mandat existant — pas d'INSERT.
 *
 * Déductions :
 *  - type_transaction : 'recherche' si type=search_mandate ou subject contient
 *    "recherche" ; 'location' si subject contient "location"/"mise_en_location" ;
 *    'vente' sinon.
 *  - type_mandat : mapping strict depuis lead.type (mandate_exclusive→exclusif,
 *    etc.). null si non déductible (search_mandate, general_contact, etc.) —
 *    à compléter à la main dans la fiche mandat.
 */
export async function convertLeadToMandat(
  leadId: string,
): Promise<ConvertResult> {
  const sb = await createSupabaseServerClient();

  // 1. Charger le lead.
  const { data: lead, error: leadError } = await sb
    .from("leads")
    .select(
      "id,first_name,last_name,name,email,phone,country,city,type,subject,message",
    )
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) return { ok: false, error: leadError.message };
  if (!lead) return { ok: false, error: "lead_not_found" };

  type LeadRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
    email: string;
    phone: string | null;
    country: string | null;
    city: string | null;
    type: string | null;
    subject: string | null;
    message: string | null;
  };
  const l = lead as LeadRow;

  // 2. Anti-doublon : un mandat existe-t-il déjà pour ce lead_id ?
  const { data: existing, error: existingError } = await sb
    .from("mandats")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };
  if (existing) {
    return {
      ok: true,
      mandatId: (existing as { id: string }).id,
      alreadyExisted: true,
    };
  }

  // 3. Déduction type_transaction depuis le lead.
  const leadType = (l.type ?? "").toLowerCase();
  const leadSubject = (l.subject ?? "").toLowerCase();
  const isSearch =
    leadType === "search_mandate" || leadSubject.includes("recherche");
  const isRental =
    leadSubject.includes("mise_en_location") ||
    leadSubject.includes("location");
  const type_transaction: "vente" | "recherche" | "location" = isSearch
    ? "recherche"
    : isRental
      ? "location"
      : "vente";

  // 4. Déduction type_mandat depuis lead.type (mapping strict).
  const type_mandat = TYPE_MANDAT_MAP[l.type ?? ""] ?? null;

  // 5. Construire client_name (priorité : first+last > name > email).
  const composedName = [l.first_name, l.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const client_name = composedName || l.name?.trim() || l.email;

  // 6. INSERT dans mandats.
  const payload = {
    lead_id: leadId,
    client_name,
    client_email: l.email,
    client_phone: l.phone,
    client_country: l.country,
    client_city: l.city,
    bien_adresse: l.city,
    notes: l.message,
    type_transaction,
    type_mandat,
    status: "actif",
    workflow_status: "new",
  };

  const { data: inserted, error: insertError } = await sb
    .from("mandats")
    .insert(payload as never)
    .select("id")
    .single();

  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/mandats");

  return {
    ok: true,
    mandatId: (inserted as { id: string }).id,
    alreadyExisted: false,
  };
}

// ---------- Sprint Export RGPD — droit d'acces/portabilite ----------

/**
 * Exporte toutes les donnees d'un lead + le mandat associe eventuel
 * (via mandats.lead_id) au format JSON. Cote client, l'appelant transforme
 * en Blob et declenche le telechargement (cf. lib/admin/download.ts).
 *
 * Retour structure ({ok,data,filename} ou {ok,error}), jamais de throw
 * cote UI. Le bouton est non destructif : pas de write DB.
 */
export async function exportLead(
  id: string,
): Promise<
  | { ok: true; data: object; filename: string }
  | { ok: false; error: string }
> {
  try {
    const sb = await createSupabaseServerClient();

    const { data: lead, error: leadError } = await sb
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();
    if (leadError || !lead) return { ok: false, error: "not_found" };

    // Mandat associe eventuel (0 ou 1 — anti-doublon dans convertLeadToMandat).
    const { data: mandats, error: mandatsError } = await sb
      .from("mandats")
      .select("*")
      .eq("lead_id", id);
    if (mandatsError) return { ok: false, error: "db_error" };
    const mandat_associe =
      Array.isArray(mandats) && mandats.length > 0 ? mandats[0] : null;

    const exported_at = new Date().toISOString();
    const data = {
      export_type: "lead",
      exported_at,
      source: "MAPA Property - export RGPD",
      lead,
      mandat_associe,
    };

    const datePart = exported_at.slice(0, 10);
    const filename = `mapa-lead-${id.slice(0, 8)}-${datePart}.json`;
    return { ok: true, data, filename };
  } catch (e) {
    console.error("[exportLead]", (e as Error).message);
    return { ok: false, error: "db_error" };
  }
}
