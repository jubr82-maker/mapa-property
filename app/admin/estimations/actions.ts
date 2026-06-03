"use server";

// Sprint 3 estimations — Server action manuelle declenchee depuis
// /admin/estimations/[id] pour proposer un Avis de Valeur detaille au
// prospect. Pattern aligne sur app/admin/leads/actions.ts et
// app/admin/mandats/actions.ts (auth check, retour structure, no throw).

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { sendEstimationRefinementEmail } from "@/lib/email/estimation-emails";

type RefinementResult =
  | { ok: true; sentAt: string }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "no_email" }
  | { ok: false; reason: "no_consent" }
  | { ok: false; reason: "already_sent"; sentAt: string }
  | { ok: false; reason: "db_error"; error: string };

/**
 * Envoie un mail d'affinage au prospect d'une estimation et trace l'envoi
 * dans estimation_requests.refinement_sent_at pour eviter le spam.
 *
 * Garde-fous (retour structure, jamais de throw pour l'UI) :
 *  - non-authentifie -> unauthorized
 *  - estimation introuvable -> not_found
 *  - pas d'email -> no_email
 *  - consent != true -> no_consent
 *  - refinement_sent_at deja rempli -> already_sent + date
 *
 * No-op silencieux cote Resend si RESEND_API_KEY absent (cf.
 * sendEstimationRefinementEmail). Le UPDATE refinement_sent_at est posee
 * APRES l'envoi best-effort, ce qui veut dire qu'en cas de stub local
 * (clef absente), on marque quand meme comme "envoye" pour eviter de
 * relancer en prod plus tard — comportement defendable cote dev local.
 */
export async function sendRefinement(
  id: string,
): Promise<RefinementResult> {
  const sb = await createSupabaseServerClient();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: "unauthorized" };

  const { data, error } = await sb
    .from("estimation_requests")
    .select("contact_email,contact_name,consent,locale,refinement_sent_at")
    .eq("id", id)
    .single();

  if (error || !data) return { ok: false, reason: "not_found" };

  const row = data as {
    contact_email: string | null;
    contact_name: string | null;
    consent: boolean | null;
    locale: string | null;
    refinement_sent_at: string | null;
  };

  if (!row.contact_email) return { ok: false, reason: "no_email" };
  if (row.consent !== true) return { ok: false, reason: "no_consent" };
  if (row.refinement_sent_at) {
    return {
      ok: false,
      reason: "already_sent",
      sentAt: row.refinement_sent_at,
    };
  }

  await sendEstimationRefinementEmail({
    contactEmail: row.contact_email,
    contactName: row.contact_name ?? undefined,
    locale: row.locale ?? undefined,
  });

  const sentAt = new Date().toISOString();
  const { error: updateError } = await sb
    .from("estimation_requests")
    .update({ refinement_sent_at: sentAt })
    .eq("id", id);

  if (updateError) {
    return { ok: false, reason: "db_error", error: updateError.message };
  }

  revalidatePath(`/admin/estimations/${id}`);
  revalidatePath("/admin/estimations");
  return { ok: true, sentAt };
}
