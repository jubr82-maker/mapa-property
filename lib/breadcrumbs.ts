// Fil d'Ariane (donnees structurees BreadcrumbList) des pages publiques
// (oct. 2026). Chaque niveau qui possede une page porte un libelle du
// namespace next-intl "breadcrumb" ; les niveaux sans page (ex. /legal,
// /mandats, /villes) ne sont pas listes, pour ne jamais citer une adresse
// en erreur.
export const BREADCRUMB_KEYS: Record<string, string> = {
  "/biens": "properties",
  "/blog": "blog",
  "/contact": "contact",
  "/liste-attente": "waitlist",
  "/mentions-acquisition": "acquisition_notice",
  "/off-market": "offmarket",
  "/off-market/arcova": "arcova",
  "/qui-sommes-nous": "about",
  "/services": "services",
  "/services/capacite-emprunt": "borrowing",
  "/services/estimer": "estimate",
  "/services/louer": "rent",
  "/services/marches-actifs": "markets",
  "/services/rendement-locatif": "yield",
  "/services/simulateurs": "simulators",
  "/services/simulateurs/financement": "financing",
  "/services/vendre": "sell",
  "/legal/cgu": "terms_use",
  "/legal/cgv": "terms_sale",
  "/legal/honoraires": "fees",
  "/legal/intelligence-artificielle": "ai",
  "/legal/mentions-legales": "legal_notice",
  "/legal/rgpd": "privacy",
};

/** Parent explicite des pages dont le dossier n'a pas de page propre. */
export const BREADCRUMB_PARENTS: Record<string, string> = {
  "/villes": "/services/marches-actifs",
  "/mandats": "/services",
};

export type Crumb = { path: string; key?: string; label?: string };

/**
 * Niveaux du fil d'Ariane d'une page (hors accueil), du plus general au
 * plus precis. `current` : libelle de la page courante si elle n'a pas de
 * cle (fiche de bien, article, ville, mandat).
 */
export function breadcrumbTrail(path: string, current?: string): Crumb[] {
  const parts = path.split("/").filter(Boolean);
  const trail: Crumb[] = [];
  for (let i = 1; i <= parts.length; i++) {
    const prefix = `/${parts.slice(0, i).join("/")}`;
    const last = i === parts.length;
    const parent = BREADCRUMB_PARENTS[prefix];
    if (parent && !last) {
      for (const c of breadcrumbTrail(parent)) if (!trail.some((t) => t.path === c.path)) trail.push(c);
      continue;
    }
    const key = BREADCRUMB_KEYS[prefix];
    if (last) trail.push(current ? { path: prefix, label: current } : { path: prefix, key });
    else if (key) trail.push({ path: prefix, key });
  }
  return trail.filter((c) => c.key || c.label);
}
