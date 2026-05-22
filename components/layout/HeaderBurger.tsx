"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ContactReveal } from "@/components/contact-reveal";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type SubItem = { href: string; key: string };
type Group = {
  id: string;
  label: string;
  href?: string;
  items?: SubItem[];
};

// NAV1 : même architecture que le header desktop —
// ACHETER · VENDRE · LOUER · OFF-MARKET · SERVICES · JOURNAL.
// Onglet MANDATS supprimé (tout est dans VENDRE) ; "Off-Market"
// retiré du sous-menu ACHETER (doublon, désormais onglet principal).
const groups: Group[] = [
  {
    id: "buy",
    label: "buy",
    items: [
      { href: "/biens", key: "all_properties" },
      { href: "/mandats/recherche", key: "search_mandate" },
    ],
  },
  {
    id: "sell",
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
    id: "rent",
    label: "rent",
    href: "/biens?transaction=rent",
  },
  {
    id: "off_market",
    label: "off_market",
    href: "/off-market",
  },
  {
    id: "services",
    label: "services",
    // HOTFIX nav : source unique SERVICES_ITEMS (5 items, identiques
    // desktop). Journal/blog + contact RETIRES (Journal = doublon avec
    // l'onglet top-level ; liste alignee sur la decision Julien option B).
    items: [...SERVICES_ITEMS],
  },
  {
    id: "journal",
    label: "journal",
    href: "/journal",
  },
];

export function HeaderBurger() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("nav");

  // Portal monté seulement côté client → évite hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setExpanded(null);
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("open_menu")}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-gold hover:text-gold"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {mounted && createPortal(
        <div
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        aria-hidden={!open}
        className={`fixed inset-0 z-[9999] flex flex-col overflow-y-auto backdrop-blur-md ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{
          // SPRINT3 T6 : fond sapin profond palette Forêt + slide-down 300ms
          backgroundColor: "#1F221A",
          transform: open ? "translateY(0)" : "translateY(-20px)",
          transition:
            "opacity 300ms cubic-bezier(0.22,1,0.36,1), transform 300ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div className="flex items-center justify-between border-b border-[#e0af6e]/30 px-6 py-5 lg:px-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F0E6CC]/60">
            MAPA Property
          </span>
          <div className="flex items-center gap-2">
            {/* SPRINT3 T6 : toggle jour/nuit + close en crème velin #F0E6CC,
                hover cuivre citron #e0af6e (palette Forêt). */}
            <ThemeToggle className="!size-10 !border-[#F0E6CC]/30 !text-[#F0E6CC] hover:!border-[#e0af6e] hover:!text-[#e0af6e]" />
            <button
              type="button"
              aria-label={t("close_menu")}
              onClick={close}
              className="inline-flex size-10 items-center justify-center rounded-full border border-[#F0E6CC]/30 text-[#F0E6CC] transition-colors hover:border-[#e0af6e] hover:text-[#e0af6e]"
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* BUG 4 : langues en haut, sous la barre titre, avant la nav.
            SPRINT3 T6 : séparateur cuivre citron opacité 0.3. */}
        <div className="border-b border-[#e0af6e]/30 px-6 py-4 lg:px-10">
          <LanguageSwitcher variant="dark" onSwitched={close} />
        </div>

        <nav className="flex-1 px-6 py-8 lg:px-10">
          <ul className="mx-auto max-w-2xl space-y-1">
            {groups.map((group) => {
              if (group.href) {
                return (
                  <li key={group.id} className="border-b border-[#e0af6e]/30">
                    <Link
                      href={group.href}
                      onClick={close}
                      className="inline-block border-b-2 border-transparent py-4 text-left font-display text-xl font-medium uppercase tracking-[0.12em] text-[#F0E6CC] transition-colors hover:border-[#e0af6e] sm:text-2xl"
                    >
                      {t(group.label)}
                    </Link>
                  </li>
                );
              }
              const isExpanded = expanded === group.id;
              return (
                <li key={group.id} className="border-b border-[#e0af6e]/30">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : group.id)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between gap-3 py-4 text-left font-display text-xl font-medium uppercase tracking-[0.12em] text-[#F0E6CC] transition-colors hover:text-[#e0af6e] sm:text-2xl"
                  >
                    {t(group.label)}
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className={`size-5 text-[#e0af6e] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isExpanded && group.items && (
                    <ul className="pb-4 pl-1 text-left">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={close}
                            className="inline-block border-b-2 border-transparent py-2 font-sans text-base text-[#F0E6CC]/80 transition-colors hover:border-[#e0af6e] hover:text-[#F0E6CC]"
                          >
                            {t(item.key)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {/* SPRINT3 T6 : CTA Nous contacter lime mûr #CFE542 sur fond
              sapin + glow lime au hover (.cta-lime-glow). ContactReveal
              gère l'anti-scraping (split JS + reconstruction au clic). */}
          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-start gap-6">
            <ContactReveal
              variant="compact"
              align="left"
              theme="dark"
              className="cta-lime-glow !border-[#CFE542] !bg-[#CFE542] !text-[#1F221A]"
            />
          </div>
        </nav>
      </div>,
      document.body,
      )}
    </>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4 text-gold"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}
