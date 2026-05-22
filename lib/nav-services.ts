// Source unique des items du menu Services — consommee par le header
// desktop (components/layout/Header.tsx) ET le burger mobile
// (components/layout/HeaderBurger.tsx). Garantit 5 items identiques,
// meme ordre, sur tous viewports. Un seul endroit a modifier.
//
// Option B (decision Julien) : Estimation / Simulateurs / Marchés actifs
// / Honoraires / Qui sommes nous. Journal RETIRE du sous-menu (doublon
// avec l'onglet JOURNAL top-level). `key` → cle i18n namespace "nav".

export const SERVICES_ITEMS: readonly { href: string; key: string }[] = [
  { href: "/services/estimer", key: "estimate" },
  { href: "/services/simulateurs", key: "simulators" },
  { href: "/services/marches-actifs", key: "markets" },
  { href: "/legal/honoraires", key: "fees" },
  { href: "/qui-sommes-nous", key: "about" },
];
