"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderBurger } from "@/components/layout/HeaderBurger";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SERVICES_ITEMS, RENT_ITEMS, AGENCY_ITEMS } from "@/lib/navigation";

const leftDropdowns = [
  {
    label: "buy",
    items: [
      { href: "/biens", key: "all_properties" },
      { href: "/mandats/recherche", key: "search_mandate" },
      // NAV1 : "Off-Market" retiré (doublon — désormais onglet principal).
    ],
  },
  {
    label: "sell",
    items: [
      { href: "/services/vendre", key: "all_mandates" },
      { href: "/mandats/exclusif", key: "mandate_exclusive" },
      { href: "/mandats/semi-exclusif", key: "mandate_semi" },
      { href: "/mandats/simple", key: "mandate_simple" },
      { href: "/mandats/autonome", key: "mandate_autonomous" },
      { href: "/services/estimer", key: "estimate" },
    ],
  },
  {
    // Sprint menu restructure : LOUER devient dropdown (etait link simple).
    label: "rent",
    items: RENT_ITEMS,
  },
] as const;

const rightDropdowns = [
  {
    label: "services",
    // Sprint menu restructure : SERVICES reduit a 3 items.
    items: SERVICES_ITEMS,
  },
  {
    // Sprint menu restructure : NOUVEAU L'AGENCE — remplace JOURNAL top-level.
    label: "agency",
    items: AGENCY_ITEMS,
  },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Sprint UI-NOTCH : body rounded-b-[18px] + overlay SVG dessous
          pour notch central protrudant vers le bas + lisere dore qui
          epouse coins arrondis + notch (cf. <svg> en fin de div). */}
      <div
        className={`relative rounded-b-[18px] transition-colors duration-300 ${
          scrolled
            ? "bg-bg/95 backdrop-blur-md"
            : "bg-bg/85 backdrop-blur-sm"
        }`}
      >
      {/* BUG T8 : header élargi 1400 -> 1600px (logo inchangé 56/96px,
          la nav respire et s'éloigne du centre). */}
      {/* POL2-4 : onglets + gaps doublés (POL3-4 : taille onglets
          ramenée 20px → 17px, text-[17px])
          (lg:gap-4→lg:gap-8, nav gap-1→gap-2). Bloc FR/jour-nuit
          extrême droite (ml-auto, POL3 préservé). Burger mobile
          inchangé. (C) « cluster aligné à la largeur visuelle MAPA »
          structurellement impossible pour une nav 6 onglets ×1.5 —
          documenté docs/qa/POL2-4_ALIGNEMENT_NOTE.md. */}
      <div className="mx-auto grid h-20 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:h-28 lg:gap-8 lg:px-10">
        {/* Slot GAUCHE — burger (mobile, à gauche) / nav desktop
            resserrée vers le centre (POL3 : justify-end ≥lg). */}
        <div className="flex items-center justify-start gap-1 lg:justify-end">
          <div className="lg:hidden">
            <HeaderBurger />
          </div>
          {/* Nav desktop only — POL3-P5 : lg:mt-3 baseline texte 12px
              plus basse (alignement optique vs logo, desktop). */}
          <nav className="hidden items-center gap-2 lg:mt-3 lg:flex">
            {/* NAV1 : onglet MANDATS retiré (tout est dans VENDRE).
                Ordre avant logo : ACHETER, VENDRE, LOUER. */}
            {leftDropdowns.map((d) => (
              <DropdownItem key={d.label} label={t(d.label)} items={d.items} t={t} />
            ))}
          </nav>
        </div>

        {/* Slot CENTRE — logo centré sur TOUS supports (BUG 10).
            POL3-P5 : lg:px-12 → +96px de respiration autour du logo
            (push mécanique des navs latérales loin du centre). */}
        <div className="flex justify-center lg:px-12">
          {/* POL2 : logo -20% (96->76 desktop, 56->44 mobile) +
              descendu de 8px (pt-2). */}
          <Link
            href="/"
            aria-label={`MAPA Property — ${t("home")}`}
            className="inline-flex shrink-0 pt-2 transition-opacity hover:opacity-80"
          >
            <span className="lg:hidden">
              <Logo height={44} tone="auto" priority />
            </span>
            <span className="hidden lg:inline-block">
              <Logo height={76} tone="auto" priority />
            </span>
          </Link>
        </div>

        {/* Slot DROITE — nav desktop resserrée vers le centre, FR +
            jour/nuit isolés à l'extrême droite (POL3) ; vide sur mobile */}
        <div className="flex items-center justify-end gap-1 lg:justify-start">
          <div className="hidden items-center gap-2 lg:flex lg:w-full">
            {/* POL3-P5 : <nav> introduite à droite pour porter lg:mt-3
                (baseline 12px plus basse) sans descendre les toggles
                FR/dark — qui restent à leur hauteur originale via la
                div ml-auto sœur. */}
            <nav className="flex items-center gap-2 lg:mt-3">
              {/* NAV1 : ordre après logo — OFF-MARKET, SERVICES, JOURNAL.
                  Sprint C1 : whitespace-nowrap pour eviter le wrap
                  'OFF-' / 'MARKET' sur 2 lignes en viewports moyens
                  (1024-1280px) avec uppercase + tracking 0.05em. */}
              <Link
                href="/off-market"
                className="whitespace-nowrap px-3 py-2 font-sans text-[17px] font-medium uppercase tracking-[0.05em] text-ink transition-colors hover:text-gold"
              >
                {t("off_market")}
              </Link>
              {rightDropdowns.map((d) => (
                <DropdownItem key={d.label} label={t(d.label)} items={d.items} t={t} />
              ))}
            </nav>
            {/* POL3 : poussé à l'extrême droite (ml-auto). */}
            <div className="ml-auto flex items-center gap-2 border-l border-line pl-3">
              <LanguageSwitcher variant="light" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
      {/* Sprint UI-NOTCH : overlay SVG bas — notch central protrudant
          (profondeur 30px viewBox / largeur 100 viewBox = ~140px @1400px),
          coins bas arrondis 18px, lisere dore qui epouse TOUT le contour
          (coins + flat + notch). preserveAspectRatio=none + vector-effect
          non-scaling-stroke -> liseré 2px constant peu importe la largeur.
          fill var(--bg) translucide pour matcher le body, stroke var(--gold). */}
      <svg
        className="pointer-events-none absolute -bottom-[30px] left-0 right-0 h-[48px] w-full"
        viewBox="0 0 1000 48"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M 450 18 C 450 48 550 48 550 18 Z"
          fill="var(--bg)"
          fillOpacity={scrolled ? 0.95 : 0.85}
        />
        <path
          d="M 0 0 Q 0 18 18 18 L 450 18 C 450 48 550 48 550 18 L 982 18 Q 1000 18 1000 0"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      </div>
    </header>
  );
}

function DropdownItem({
  label,
  items,
  t,
}: {
  label: string;
  items: readonly { href: string; key: string }[];
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex whitespace-nowrap items-center gap-1 px-3 py-2 font-sans text-[17px] font-medium uppercase tracking-[0.05em] text-ink transition-colors group-hover:text-gold"
      >
        {label}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="size-2.5 transition-transform group-hover:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="m3 4 3 3 3-3" />
        </svg>
      </button>
      <div className="invisible absolute left-1/2 top-full -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
        <div className="min-w-[240px] overflow-hidden rounded-md border border-line bg-bg shadow-lg shadow-ink/10">
          <ul className="py-2">
            {items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className="block px-4 py-2 font-sans text-sm text-ink-mid transition-colors hover:bg-bg-soft hover:text-gold"
                >
                  {t(it.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}
