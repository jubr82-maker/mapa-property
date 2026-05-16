"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navGroups = [
  {
    label: "buy",
    items: [
      { href: "/biens", key: "all_properties" },
      { href: "/mandats/recherche", key: "search_mandate" },
      { href: "/off-market", key: "off_market" },
    ],
  },
  {
    label: "sell",
    items: [
      { href: "/mandats/exclusif", key: "mandate_exclusive" },
      { href: "/mandats/semi-exclusif", key: "mandate_semi" },
      { href: "/mandats/simple", key: "mandate_simple" },
      { href: "/mandats/autonome", key: "mandate_autonomous" },
      { href: "/services/estimer", key: "estimate" },
    ],
  },
  {
    label: "rent",
    items: [{ href: "/biens?transaction=rent", key: "find_rental" }],
  },
  {
    label: "services",
    items: [
      { href: "/services/estimer", key: "estimate" },
      { href: "/services/simulateurs", key: "simulators" },
      { href: "/services/marches-actifs", key: "markets" },
      { href: "/legal/honoraires", key: "fees" },
    ],
  },
] as const;

const flatLinks = [
  { href: "/off-market", key: "off_market" },
  { href: "/qui-sommes-nous", key: "about" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open_menu")}
        aria-expanded={open}
        className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold lg:hidden"
      >
        <BurgerIcon />
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-[60] transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-bg-contrast/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-bg shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("menu")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close_menu")}
              className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-8">
            <ul className="space-y-8">
              {navGroups.map((group) => (
                <li key={group.label}>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-ink-soft">
                    {t(group.label)}
                  </p>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block py-1 font-display text-2xl font-bold text-ink transition-colors hover:text-gold"
                        >
                          {t(item.key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}

              <li className="border-t border-line pt-6">
                <ul className="space-y-2">
                  {flatLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block py-1 font-display text-2xl font-bold text-ink transition-colors hover:text-gold"
                      >
                        {t(item.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>

          <div className="flex items-center justify-between gap-4 border-t border-line bg-bg-soft px-6 py-5">
            <LangSwitcher />
            <ThemeToggle />
          </div>
        </aside>
      </div>
    </>
  );
}

function BurgerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
