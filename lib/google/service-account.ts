// Compte de service Google en lecture seule (oct. 2026), commun a GA4 et
// Search Console (decision de Julien : un seul compte, role Lecteur GA4,
// utilisateur restreint Search Console). Jeton OAuth signe localement
// (RS256, node:crypto) : aucune bibliotheque supplementaire. Aucune
// requete ne porte d'en-tete identifiant (pas de User-Agent personnalise).
import { createSign } from "node:crypto";

const TOKEN_URI = "https://oauth2.googleapis.com/token";
export const SCOPE_ANALYTICS = "https://www.googleapis.com/auth/analytics.readonly";
export const SCOPE_SEARCH_CONSOLE = "https://www.googleapis.com/auth/webmasters.readonly";

type ServiceAccount = { client_email: string; private_key: string };

/** Cle JSON (brute ou en base64) : GOOGLE_SERVICE_ACCOUNT_KEY, sinon GA4_SERVICE_ACCOUNT_KEY. */
export function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim() || process.env.GA4_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;
  for (const text of [raw, Buffer.from(raw, "base64").toString("utf8")]) {
    try {
      const j = JSON.parse(text) as Partial<ServiceAccount>;
      if (typeof j.client_email === "string" && typeof j.private_key === "string") {
        return { client_email: j.client_email, private_key: j.private_key };
      }
    } catch {
      // essai suivant
    }
  }
  return null;
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

const cache = new Map<string, { token: string; exp: number }>();

/** Jeton d'acces (mis en cache jusqu'a une minute avant son expiration). */
export async function googleAccessToken(scope: string): Promise<string | null> {
  const sa = readServiceAccount();
  if (!sa) return null;
  const hit = cache.get(scope);
  const now = Math.floor(Date.now() / 1000);
  if (hit && hit.exp - 60 > now) return hit.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: TOKEN_URI, iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`google_token_http_${res.status}`);
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("google_token_missing");
  cache.set(scope, { token: json.access_token, exp: now + (json.expires_in ?? 3600) });
  return json.access_token;
}
