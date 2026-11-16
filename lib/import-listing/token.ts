// Jeton d'import d'une image collee (nov. 2026). Serveur seulement.
// L'analyse du contenu colle delivre, pour chaque adresse d'image trouvee
// DANS ce contenu, un jeton signe (bien, adresse, echeance) ; le
// telechargement refuse toute adresse sans jeton valide. Ainsi seules les
// images du contenu colle peuvent etre telechargees, photo par photo, en
// plusieurs appels courts (reprise possible pendant 6 heures).
// Cle : derivee d'un secret serveur deja present (aucune nouvelle variable).
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 6 * 60 * 60 * 1000;

function key(): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || process.env.REVALIDATE_SECRET;
  return secret ? createHmac("sha256", secret).update("mapa-import-annonce-v1").digest("hex") : null;
}

function sign(k: string, propertyId: string, url: string, exp: number): string {
  return createHmac("sha256", k).update(`${propertyId}\n${url}\n${exp}`).digest("base64url");
}

/** Jeton d'une adresse d'image, ou null si aucun secret serveur n'est configure. */
export function imageToken(propertyId: string, url: string, now = Date.now()): string | null {
  const k = key();
  if (!k) return null;
  const exp = now + TTL_MS;
  return `${exp}.${sign(k, propertyId, url, exp)}`;
}

export function checkImageToken(propertyId: string, url: string, token: string, now = Date.now()): boolean {
  const k = key();
  if (!k || typeof token !== "string") return false;
  const [expRaw, mac] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now || !mac) return false;
  const expected = Buffer.from(sign(k, propertyId, url, exp));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
