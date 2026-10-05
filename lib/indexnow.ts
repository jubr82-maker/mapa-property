// IndexNow (oct. 2026) : signale a Bing et aux moteurs partenaires
// (Yandex, Seznam, Naver, Yep...) les adresses publiees ou modifiees, pour
// une prise en compte en quelques minutes au lieu d'attendre le passage du
// robot. Google n'utilise pas IndexNow (sitemap et Search Console).
//
// Active seulement si :
//   - INDEXNOW_KEY est definie (8 a 128 caracteres hexadecimaux, minuscules),
//     creee par Julien dans Vercel ;
//   - le site est la production (NEXT_PUBLIC_SITE_URL sans "beta.").
// Fichier de cle : https://<site>/<cle>.txt (next.config.ts, rewrites ->
// app/api/indexnow-key/[key]/route.ts).
// Envoi apres la reponse (after) : l'enregistrement dans l'admin n'attend
// jamais IndexNow. Une erreur est journalisee (journal des taches de Sante
// du site et console), jamais bloquante. Aucun en-tete identifiant : la
// requete ne porte que l'adresse du site et les URL publiques concernees.
import { after } from "next/server";
import { recordCronRun } from "@/lib/pilotage/health";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";
const ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_PATTERN = /^[a-f0-9]{8,128}$/;
const LOCALES = ["fr", "en", "de"] as const;

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim() ?? "";
  return INDEXNOW_KEY_PATTERN.test(key) ? key : null;
}

export function indexNowEnabled(): boolean {
  return Boolean(indexNowKey()) && !SITE_URL.includes("beta.");
}

/** Adresses absolues d'un chemin dans les trois langues. */
export function localizedUrls(path: string): string[] {
  return LOCALES.map((l) => `${SITE_URL}/${l}${path}`);
}

/** Corps de la requete IndexNow (pur, teste). */
export function indexNowPayload(key: string, urls: string[]) {
  const site = new URL(SITE_URL);
  return {
    host: site.host,
    key,
    keyLocation: `${site.origin}/${key}.txt`,
    urlList: Array.from(new Set(urls)).slice(0, 10_000),
  };
}

export async function submitIndexNow(urls: string[]): Promise<{ ok: boolean; detail: string }> {
  const key = indexNowKey();
  if (!key || !indexNowEnabled()) return { ok: true, detail: "disabled" };
  if (urls.length === 0) return { ok: true, detail: "no_urls" };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowPayload(key, urls)),
      signal: AbortSignal.timeout(10_000),
    });
    // 200 et 202 : recu. 422 : URL hors du site ou cle incorrecte.
    const ok = res.status === 200 || res.status === 202;
    return { ok, detail: `http_${res.status}:${urls.length}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.name : "unknown_error" };
  }
}

/** Planifie l'envoi apres la reponse ; journalise le resultat. */
export function scheduleIndexNow(urls: string[] | (() => Promise<string[]>)): void {
  if (!indexNowEnabled()) return;
  after(async () => {
    try {
      const list = typeof urls === "function" ? await urls() : urls;
      const r = await submitIndexNow(list);
      if (!r.ok) console.warn("[indexnow] envoi refuse", r.detail);
      await recordCronRun("indexnow", r.ok, r.detail);
    } catch (e) {
      const detail = e instanceof Error ? e.name : "unknown_error";
      console.warn("[indexnow] envoi impossible", detail);
      await recordCronRun("indexnow", false, detail);
    }
  });
}
