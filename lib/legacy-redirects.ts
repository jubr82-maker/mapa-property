// Redirections permanentes (301) des adresses des anciens sites (oct. 2026).
// Module pur : utilise par proxy.ts et next.config.ts, teste par
// tests/seo/redirects.spec.ts.
//
// Formats couverts :
//   A. Site v28 (Netlify, sans prefixe de langue, francais). Liste PROUVEE
//      par l'historique git (branche origin/main) : PAGE_ROUTES de
//      js/app.js et sitemap.xml.
//   B. Site plus ancien (adresses /fr/..., /en/..., /de/... relevees dans
//      Google Analytics) : fiches /fr/propriete/<transaction>+<type>+<ville>+
//      <identifiant>, /fr/ventes, accueils /en/ et /fr/. Ce site n'est pas
//      dans le depot : les equivalents anglais et allemands des segments
//      (property, immobilie...) sont SUPPOSES, ajoutes par prudence.
//   C. Doublon interne : /journal -> /blog.
//   D. Pages de l'ancien site Apimo signalees en 404 par la Search Console
//      (2026-10-17) : /fr/recherche, /fr/mentions-legales/honoraires,
//      /en/our-agency, /en/contact-us (PROUVE). Leurs equivalents dans les
//      autres langues et les pages du meme modele Apimo (notre-agence,
//      contactez-nous, honoraires...) sont SUPPOSES, ajoutes par prudence :
//      l'ancien site n'est pas dans le depot.
// Chaque destination est une adresse finale du site : une seule
// redirection, jamais en chaine.
// Le dernier nombre d'une ancienne fiche est l'identifiant du bien
// (identique a apimo_id, que resout aussi /biens/<identifiant>).

export const LOCALES = ["fr", "en", "de"] as const;
export type LegacyLocale = (typeof LOCALES)[number];

/** A. Pages du v28 (sans langue) -> page equivalente en francais. */
export const V28_PAGES: Record<string, string> = {
  "/vente": "/services/vendre",
  "/achat": "/biens?transaction=sale",
  "/acquereurs": "/biens?transaction=sale",
  "/location": "/services/louer",
  "/off-market": "/off-market",
  "/estimation": "/services/estimer",
  "/mandat-recherche": "/mandats/recherche",
  "/simulateurs": "/services/simulateurs",
  "/marches-actifs": "/services/marches-actifs",
  "/marches-luxembourg": "/services/marches-actifs",
  "/marches-international": "/services/marches-actifs",
  "/arcova": "/off-market/arcova",
  "/qui-sommes-nous": "/qui-sommes-nous",
  "/blog": "/blog",
  "/contact": "/contact",
  "/vendre/mandat-exclusif": "/mandats/exclusif",
  "/vendre/mandat-semi-exclusif": "/mandats/semi-exclusif",
  "/vendre/mandat-simple": "/mandats/simple",
  "/vendre/mandat-autonome": "/mandats/autonome",
  "/honoraires": "/legal/honoraires",
  "/mentions-legales": "/legal/mentions-legales",
  "/rgpd": "/legal/rgpd",
  "/cgu": "/legal/cgu",
  // Page KYC et lutte anti-blanchiment du v28 : sans equivalent propre,
  // l'information est dans les mentions legales.
  "/aml-kyc": "/legal/mentions-legales",
};

/** B. Pages de l'ancien site, par langue (segment apres la langue). */
export const OLD_SITE_PAGES: Record<string, string> = {
  ventes: "/biens?transaction=sale",
  vente: "/biens?transaction=sale",
  sales: "/biens?transaction=sale",
  sale: "/biens?transaction=sale",
  verkauf: "/biens?transaction=sale",
  locations: "/biens?transaction=rent",
  location: "/biens?transaction=rent",
  rentals: "/biens?transaction=rent",
  rental: "/biens?transaction=rent",
  vermietung: "/biens?transaction=rent",
  agence: "/qui-sommes-nous",
  agency: "/qui-sommes-nous",
  agentur: "/qui-sommes-nous",
  equipe: "/qui-sommes-nous",
  team: "/qui-sommes-nous",
  estimation: "/services/estimer",
  valuation: "/services/estimer",
  bewertung: "/services/estimer",
  actualites: "/blog",
  news: "/blog",
  "mentions-legales": "/legal/mentions-legales",
  "legal-notice": "/legal/mentions-legales",
  impressum: "/legal/mentions-legales",
  journal: "/blog",
  // D. Recherche de biens de l'ancien site : la liste des biens (et non
  // /recherches, qui presente les recherches de nos clients).
  recherche: "/biens",
  rechercher: "/biens",
  search: "/biens",
  suche: "/biens",
  // D. Agence, contact, honoraires (modele Apimo).
  "notre-agence": "/qui-sommes-nous",
  "l-agence": "/qui-sommes-nous",
  "our-agency": "/qui-sommes-nous",
  "unsere-agentur": "/qui-sommes-nous",
  "contactez-nous": "/contact",
  "nous-contacter": "/contact",
  "contact-us": "/contact",
  kontakt: "/contact",
  "kontaktieren-sie-uns": "/contact",
  honoraires: "/legal/honoraires",
  fees: "/legal/honoraires",
  honorare: "/legal/honoraires",
  "politique-de-confidentialite": "/legal/rgpd",
  "privacy-policy": "/legal/rgpd",
  datenschutz: "/legal/rgpd",
};

/** D. Pages legales de l'ancien site (/<langue>/mentions-legales/<page>). */
export const OLD_LEGAL_PARENTS = new Set(["mentions-legales", "legal-notice", "legal-notices", "impressum"]);
export const OLD_LEGAL_SUBPAGES: Record<string, string> = {
  honoraires: "/legal/honoraires",
  fees: "/legal/honoraires",
  honorare: "/legal/honoraires",
  "politique-de-confidentialite": "/legal/rgpd",
  "privacy-policy": "/legal/rgpd",
  datenschutz: "/legal/rgpd",
  cgu: "/legal/cgu",
  cgv: "/legal/cgv",
};

/** B. Segments des anciennes fiches de biens (suivis de <...>+<identifiant>). */
export const OLD_PROPERTY_SEGMENTS = new Set([
  "propriete",
  "proprietes",
  "property",
  "properties",
  "immobilie",
  "immobilien",
  "objekt",
  "eigenschaft",
  "bien",
]);

export type LegacyTarget =
  | { kind: "path"; to: string }
  | { kind: "property"; locale: LegacyLocale; id: string | null };

function isLocale(s: string | undefined): s is LegacyLocale {
  return !!s && (LOCALES as readonly string[]).includes(s);
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Identifiant d'une ancienne fiche : le dernier nombre de 5 chiffres et plus
 * de l'adresse (numero Apimo, 8 chiffres), quels que soient les separateurs
 * (espaces, %20, +, tirets ou barres obliques).
 */
export function legacyPropertyId(rest: string): string | null {
  const nums = safeDecode(rest).match(/(?<!\d)\d{5,}(?!\d)/g);
  return nums ? nums[nums.length - 1] : null;
}

/**
 * Destination d'une ancienne adresse, ou null si l'adresse est une adresse
 * actuelle. Ne traite pas la barre finale (Next.js la retire en 308).
 */
export function resolveLegacyPath(pathname: string): LegacyTarget | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  // A. v28 sans langue.
  if (!isLocale(parts[0])) {
    const v28 = V28_PAGES[path];
    if (v28) return { kind: "path", to: `/fr${v28}` };
    if (parts[0] === "blog" && parts[1]) return { kind: "path", to: `/fr/blog/${parts.slice(1).join("/")}` };
    return null;
  }

  const locale = parts[0];
  const seg = parts[1];
  if (!seg) return null;

  // C. /journal (doublon de /blog).
  if (seg === "journal" && parts.length === 2) return { kind: "path", to: `/${locale}/blog` };

  // B. Fiches de l'ancien site : tout ce qui suit le segment (une ou
  // plusieurs parties).
  if (OLD_PROPERTY_SEGMENTS.has(seg)) {
    return { kind: "property", locale, id: parts.length > 2 ? legacyPropertyId(parts.slice(2).join("/")) : null };
  }

  // B et D. Pages de l'ancien site (un seul segment apres la langue).
  if (parts.length === 2 && Object.hasOwn(OLD_SITE_PAGES, seg)) {
    return { kind: "path", to: `/${locale}${OLD_SITE_PAGES[seg]}` };
  }
  // D. Pages legales de l'ancien site : page equivalente, sinon mentions legales.
  if (parts.length === 3 && OLD_LEGAL_PARENTS.has(seg)) {
    const sub = parts[2];
    return { kind: "path", to: `/${locale}${Object.hasOwn(OLD_LEGAL_SUBPAGES, sub) ? OLD_LEGAL_SUBPAGES[sub] : "/legal/mentions-legales"}` };
  }
  return null;
}

/**
 * Adresse finale d'une ancienne fiche : l'adresse actuelle de la fiche dans
 * la meme langue si le bien est publie (celle que la fiche garde, sans
 * nouvelle redirection), sinon la liste des biens de la langue. Jamais une
 * erreur.
 */
export function legacyPropertyDestination(
  target: { locale: LegacyLocale; id: string | null },
  publishedPathsByKey: ReadonlyMap<string, Record<LegacyLocale, string>>,
): string {
  const path = target.id ? publishedPathsByKey.get(target.id)?.[target.locale] : undefined;
  return path ? `/${target.locale}${path}` : `/${target.locale}/biens`;
}
