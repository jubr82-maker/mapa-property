// Resultat des actions serveur de l'admin (oct. 2026). Cause des messages
// vagues (PROUVE) : une action serveur qui leve une exception voit son
// texte remplace par Next.js en production ; l'ecran ne pouvait afficher
// qu'un libelle generique. Les actions RETOURNENT donc leur resultat :
// { ok: true } ou { ok: false, error } avec le motif reel en clair.
//
// Usage : le code metier leve ActionFailure(motif) ; l'action exportee
// l'execute dans runAction(), qui renvoie le resultat et laisse passer les
// redirections de Next.js (redirect, notFound).
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { dbErrorReason, type DbError } from "@/lib/admin/db-error";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Echec metier dont le message est deja le motif clair a afficher. */
export class ActionFailure extends Error {}

const notices = () => getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" });

/** Motif clair d'une erreur Supabase (colonne, regle d'acces, valeur...). */
export async function dbFailure(e: DbError, scope: string): Promise<ActionFailure> {
  console.error(`[admin] ${scope} : ecriture refusee`, { code: e.code ?? null });
  const r = dbErrorReason(e);
  return new ActionFailure((await notices())(r.key, { value: r.value }));
}

/** Session absente, compte hors liste ou sans double authentification. */
export async function sessionFailure(): Promise<{ ok: false; error: string }> {
  return { ok: false, error: (await notices())("err_session") };
}

function isNextControlFlow(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND");
}

/** Execute le code metier et renvoie son resultat, jamais une exception. */
export async function runAction(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    if (e instanceof ActionFailure) return { ok: false, error: e.message };
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[admin] action en echec", detail);
    return { ok: false, error: (await notices())("err_unexpected", { detail: detail.slice(0, 200) || "?" }) };
  }
}
