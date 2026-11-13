// Hote "www." (nov. 2026) : www.mapaproperty.lu repondait 200 au lieu de
// rediriger. Redirection permanente (308) vers la meme adresse (chemin et
// parametres conserves) sur l'hote sans "www.". Module pur, utilise au tout
// debut de proxy.ts et teste par scripts/seo/test-host-redirect.mts.
// localhost et beta.mapaproperty.lu ne commencent pas par "www." : jamais
// rediriges.

/** Adresse de destination si l'hote commence par "www.", sinon null. */
export function wwwRedirectTarget(url: URL, host: string | null | undefined): URL | null {
  const h = (host ?? url.host).trim().toLowerCase();
  if (!h.startsWith("www.")) return null;
  const target = new URL(url.toString());
  target.host = h.slice(4);
  // Une seule etape vers https (jamais www -> sans www -> https).
  target.protocol = "https:";
  return target;
}

/** Pages de test sous app/[locale]/test-* : 404 en production. */
export function isTestPagePath(pathname: string): boolean {
  return /^\/(fr|en|de)\/test-[^/]*(\/|$)/.test(pathname);
}
