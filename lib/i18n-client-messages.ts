// Messages transmis au navigateur (oct. 2026, performance mobile). Avant :
// TOUS les messages (176 Ko en francais, dont 87 Ko pour l'admin) etaient
// serialises dans chaque page publique pour NextIntlClientProvider. Le
// navigateur ne recoit plus que les namespaces utilises par des composants
// (useTranslations) ; ceux de l'admin ont leur propre fournisseur
// (app/admin/layout.tsx) et ceux ci-dessous ne sont lus que cote serveur
// (getTranslations). Garde-fou : pnpm test:security echoue si un
// useTranslations vise l'un d'eux.
export const SERVER_ONLY_NAMESPACES: ReadonlySet<string> = new Set([
  "meta",
  "hero",
  "stats",
  "method_coverage",
  "contact_cta",
  "home",
  "property_financing",
  "home_waitlist",
  "page_sell",
  "page_rent",
  "services_page",
  "estimate_page",
  "simulators_page",
  "about_page",
  "contact_page",
  "blog_page",
  "markets_page",
  "mentions_acquisition",
  "rendement_locatif",
  "fiche",
  "seo_pages",
  "property_gone",
  "breadcrumb",
  "not_found",
  "intent_pages",
  "value_opinion",
  "listing_model",
  "searches_page",
  "backup_report",
  "faq",
  // Quotas Vercel (oct. 2026) : lus seulement par des composants serveur
  // (analyse des imports des fichiers "use client", directive placee apres
  // les commentaires comprise) ; environ 18 Ko de
  // moins dans chaque page et chaque fichier de donnees React.
  "footer",
  "services_home",
  "offmarket_band",
  "markets_home",
  "process",
  "quote_band",
  "blog_teaser",
  "mandate_common",
  "mandate_exclusif",
  "mandate_semi_exclusif",
  "mandate_simple",
  "mandate_autonome",
  "mandate_recherche",
  "arcova",
  "explore",
]);

export function clientMessages(all: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(all).filter(([ns]) => !ns.startsWith("admin_") && !SERVER_ONLY_NAMESPACES.has(ns)),
  );
}

/**
 * Namespaces du fournisseur du layout (oct. 2026, quotas Vercel) : seulement
 * ceux des composants client du layout (menu, pied de page, chatbot,
 * bandeau cookies). Les pages ajoutent les leurs (withPageMessages).
 */
export const LAYOUT_CLIENT_NAMESPACES = ["chatbot", "contact", "cookies", "nav", "rgpd"] as const;

/** Messages des seuls namespaces demandes. */
export function pickMessages(all: Record<string, unknown>, namespaces: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(namespaces.filter((ns) => ns in all).map((ns) => [ns, all[ns]]));
}
