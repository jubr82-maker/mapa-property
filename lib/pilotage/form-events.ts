// Sante des formulaires publics (oct. 2026) : un evenement par envoi dans
// public.form_events (formulaire, resultat, statut HTTP). Aucune donnee
// personnelle. Best effort : n'echoue jamais, ne ralentit pas la reponse
// au-dela d'une insertion.
import { supabaseService } from "@/lib/supabase-service";

export type FormName =
  | "contact"
  | "lead"
  | "estimate"
  | "waitlist"
  | "nda_request"
  | "nda_offmarket"
  | "offmarket_request"
  | "arcova"
  | "chatbot_consent";

export type FormOutcome = "ok" | "captcha" | "rate_limited" | "db_error" | "invalid" | "error";

/** Resultat deduit du statut HTTP de la reponse du formulaire. */
export function outcomeFromStatus(status: number): FormOutcome {
  if (status >= 200 && status < 300) return "ok";
  if (status === 429) return "rate_limited";
  if (status === 403) return "captcha";
  if (status >= 500) return "db_error";
  if (status >= 400) return "invalid";
  return "error";
}

export async function recordFormEvent(form: FormName, outcome: FormOutcome, httpStatus?: number): Promise<void> {
  try {
    const { error } = await supabaseService()
      .from("form_events")
      .insert({ form, outcome, http_status: httpStatus ?? null });
    if (error) console.warn("[form-events] insertion impossible", { code: error.code });
  } catch {
    console.warn("[form-events] journal indisponible");
  }
}

/**
 * Enveloppe un gestionnaire POST de formulaire : la reponse est renvoyee
 * telle quelle, son statut est compte. Une exception est comptee en
 * erreur puis relancee (comportement inchange).
 */
export function withFormEvents(
  form: FormName,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      const res = await handler(req);
      await recordFormEvent(form, outcomeFromStatus(res.status), res.status);
      return res;
    } catch (e) {
      await recordFormEvent(form, "error", 500);
      throw e;
    }
  };
}
