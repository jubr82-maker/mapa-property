// Source unique des items du menu de navigation — consommee par le
// header desktop (components/layout/Header.tsx) ET le burger mobile
// (components/layout/HeaderBurger.tsx). Garantit que mobile et desktop
// sont strictement identiques en ordre et contenu. Un seul endroit a
// maintenir.
//
// Sprint menu restructure (Julien) :
//   - SERVICES reduit a 3 items (Estimation/Simulateurs/Marchés actifs)
//   - NOUVEAU dropdown LOUER (2 items : louer un bien / mettre en location)
//   - NOUVEAU dropdown L'AGENCE (4 items : blog/about/contact/honoraires)
//     remplace l'ancien onglet JOURNAL top-level
//
// `key` → cle i18n namespace "nav" (utilisee comme t(item.key)).

export const SERVICES_ITEMS: readonly { href: string; key: string }[] = [
  { href: "/services/estimer", key: "estimate" },
  { href: "/services/simulateurs", key: "simulators" },
  { href: "/services/marches-actifs", key: "markets" },
];

// QUICK FIX menu LOUER : branche sur pages existantes (zero 404).
// /louer + /louer/mettre-en-location n'existent pas → on pointe vers
// /biens?transaction=rent (catalogue filtre) + /services/louer (page
// editoriale "mettre en location"). Slugs SEO propres traites sprint
// separe ulterieurement.
export const RENT_ITEMS: readonly { href: string; key: string }[] = [
  { href: "/biens?transaction=rent", key: "rent_search" },
  { href: "/services/louer", key: "rent_list" },
];

export const AGENCY_ITEMS: readonly { href: string; key: string }[] = [
  { href: "/journal", key: "blog" },
  { href: "/qui-sommes-nous", key: "about" },
  { href: "/nous-contacter", key: "contact" },
  { href: "/legal/honoraires", key: "fees" },
];
