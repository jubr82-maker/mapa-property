// Case « Indexation demandee » (nov. 2026) : memoire des demandes
// d'indexation faites par Julien dans Search Console. Module pur (page,
// serveur, tests). Sans memoire, une adresse revenait chaque jour dans
// « A soumettre » tant que Google ne l'avait pas indexee.
import { isIndexedKey, type CheckKey } from "@/lib/pilotage/controle-core";

/** Une adresse demandee revient dans « A soumettre » apres 14 jours sans indexation. */
export const RESUBMIT_AFTER_DAYS = 14;
/** Limite approximative de Search Console (demandes par jour). */
export const DAILY_REQUESTS_APPROX = 10;

export type IndexRequest = { url: string; requestedOn: string };
export type ToSubmitItem = { url: string; key: CheckKey; requestedOn: string | null };
export type RequestedItem = { url: string; requestedOn: string; key: CheckKey | null };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Repartit les adresses entre « A soumettre » et « Deja demandees ».
 * - pending : adresses en attente de Google (ordre d'importance conserve)
 * - googleState : etat Google actuel de chaque adresse (dernier controle)
 * - requests : demandes memorisees ; today : jour (AAAA-MM-JJ, Luxembourg)
 * Adresse indexee : elle disparait de partout. Demandee il y a moins de 14
 * jours : « Deja demandees ». 14 jours ou plus et toujours en attente :
 * retour dans « A soumettre » avec la date de la demande precedente.
 */
export function splitIndexRequests(
  pending: { url: string; key: CheckKey }[],
  googleState: Map<string, CheckKey>,
  requests: IndexRequest[],
  today: string,
): { toSubmit: ToSubmitItem[]; requested: RequestedItem[]; requestedToday: number } {
  const byUrl = new Map<string, string>();
  for (const r of requests) if (ISO_DAY.test(r.requestedOn)) byUrl.set(r.url, r.requestedOn);
  const pendingUrls = new Set(pending.map((p) => p.url));
  const toSubmit: ToSubmitItem[] = [];
  const requested: RequestedItem[] = [];
  for (const p of pending) {
    const on = byUrl.get(p.url) ?? null;
    if (on && daysBetween(on, today) < RESUBMIT_AFTER_DAYS) requested.push({ url: p.url, requestedOn: on, key: p.key });
    else toSubmit.push({ url: p.url, key: p.key, requestedOn: on });
  }
  // Demandes dont l'adresse n'est plus « en attente » : indexee (masquee),
  // ou dans un autre etat (gardee dans « Deja demandees » avec cet etat).
  for (const [url, on] of byUrl) {
    if (pendingUrls.has(url)) continue;
    const key = googleState.get(url) ?? null;
    if (key && isIndexedKey(key)) continue;
    requested.push({ url, requestedOn: on, key });
  }
  requested.sort((a, b) => b.requestedOn.localeCompare(a.requestedOn) || a.url.localeCompare(b.url));
  const requestedToday = requests.filter((r) => r.requestedOn === today).length;
  return { toSubmit, requested, requestedToday };
}
