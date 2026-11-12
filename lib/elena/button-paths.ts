// Boutons des reponses d'Elena (nov. 2026) : LISTE FERMEE des chemins
// internes du site (sans la langue), jamais de texte libre ni de lien
// externe. Lue par l'admin (liste deroulante) et par Elena (controle avant
// affichage, prefixe de la langue du visiteur). Aucun import serveur.
export const ELENA_BUTTON_PATHS = [
  "/",
  "/biens",
  "/biens?transaction=sale",
  "/biens?transaction=rent",
  "/off-market",
  "/off-market/arcova",
  "/recherches",
  "/liste-attente",
  "/services",
  "/services/vendre",
  "/services/acheter",
  "/services/louer",
  "/services/estimer",
  "/services/simulateurs",
  "/services/simulateurs/financement",
  "/services/capacite-emprunt",
  "/services/rendement-locatif",
  "/services/marches-actifs",
  "/services/broker-international",
  "/mandats/exclusif",
  "/mandats/semi-exclusif",
  "/mandats/simple",
  "/mandats/autonome",
  "/mandats/recherche",
  "/qui-sommes-nous",
  "/agence-immobiliere-luxembourg",
  "/contact",
  "/faq",
  "/blog",
  "/legal/honoraires",
  "/legal/cgv",
  "/legal/cgu",
  "/legal/rgpd",
  "/legal/mentions-legales",
  "/legal/intelligence-artificielle",
  "/mentions-acquisition",
] as const;

export type ElenaButtonPath = (typeof ELENA_BUTTON_PATHS)[number];

export function isElenaButtonPath(v: unknown): v is ElenaButtonPath {
  return typeof v === "string" && (ELENA_BUTTON_PATHS as readonly string[]).includes(v);
}

/** Chemin interne prefixe de la langue ("/" -> "/fr"), ou null s'il est hors liste. */
export function localizedButtonHref(path: unknown, locale: string): string | null {
  if (!isElenaButtonPath(path)) return null;
  const l = locale === "en" || locale === "de" ? locale : "fr";
  return path === "/" ? `/${l}` : `/${l}${path}`;
}
