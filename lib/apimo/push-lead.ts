// Sprint Apimo Lot D — Push d'un lead-annonce vers Apimo.
//
// Appele depuis /api/lead AVANT le return final, en best-effort total :
//   - Mode no-op si APIMO_* absents.
//   - Try/catch englobant : NE THROW JAMAIS. Un echec de push Apimo ne doit
//     pas perturber la reponse au visiteur (qui reste { ok: true }).
//   - Logge les erreurs mais ne les remonte pas.
//
// La logique de selection (push uniquement si le lead porte sur un bien
// Apimo) est faite par l'appelant (lookup properties.apimo_id par slug).
// Ce module se limite a executer le POST si on lui donne un apimo_id.

import {
  isApimoConfigured,
  apimoFetch,
  getApimoAgencyId,
  type ApimoLeadPayload,
} from "./client";

export interface PushLeadInput {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  message?: string;
  /** Reference textuelle du bien (slug MAPA / ref Apimo) — informatif Apimo. */
  reference?: string;
  /** Locale du visiteur (fr/en/de). */
  language?: string;
}

export interface PushLeadResult {
  pushed: boolean;
  reason?: string;
  status?: number;
}

/**
 * Pousse un lead vers Apimo (POST /agencies/{id}/leads).
 *
 * @param apimoId - id du bien Apimo concerne (properties.apimo_id chez nous)
 * @param lead    - infos minimales du contact + message
 *
 * Comportements :
 *  - { pushed: false, reason: "apimo_not_configured" }  si APIMO_* absents
 *  - { pushed: false, reason: "invalid_apimo_id" }      si apimoId <= 0
 *  - { pushed: false, reason: "http_<code>" }           si Apimo repond non-200
 *  - { pushed: false, reason: "exception_<message>" }   si throw inattendu
 *  - { pushed: true,  status: 200 }                     sur succes
 */
export async function pushLeadToApimo(
  apimoId: number,
  lead: PushLeadInput,
): Promise<PushLeadResult> {
  if (!isApimoConfigured()) {
    return { pushed: false, reason: "apimo_not_configured" };
  }
  if (!Number.isFinite(apimoId) || apimoId <= 0) {
    return { pushed: false, reason: "invalid_apimo_id" };
  }

  try {
    const agencyId = getApimoAgencyId();
    const payload: ApimoLeadPayload = {
      property_id: apimoId,
      reference: lead.reference,
      firstname: lead.firstname?.trim() || undefined,
      lastname: lead.lastname?.trim() || undefined,
      email: lead.email?.trim() || undefined,
      phone: lead.phone?.trim() || undefined,
      message: lead.message?.trim() || undefined,
      language: lead.language?.trim().toLowerCase() || undefined,
      created_at: new Date().toISOString(),
    };

    const res = await apimoFetch(`/agencies/${agencyId}/leads`, {
      method: "POST",
      body: payload,
    });

    if (!res.ok) {
      return {
        pushed: false,
        reason: res.error ?? `http_${res.status}`,
        status: res.status,
      };
    }

    return { pushed: true, status: res.status };
  } catch (e) {
    // Defense en profondeur : apimoFetch attrape deja les erreurs reseau,
    // mais on garde un filet contre tout edge case (env race, build,...).
    console.error("[apimo/push-lead] exception:", (e as Error).message);
    return { pushed: false, reason: `exception_${(e as Error).message}` };
  }
}
