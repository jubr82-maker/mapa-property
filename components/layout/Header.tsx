"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MobileMenu } from "@/components/layout/MobileMenu";

const dropdowns = [
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
    items: [
      { href: "/biens?transaction=rent", key: "find_rental" },
      { href: "/services/estimer", key: "estimate" },
    ],
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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-bg/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[88px] lg:px-10">
        <div className="flex items-center gap-6">
          <Logo size="md" />
          <span aria-hidden className="hidden h-8 w-px bg-gold/40 lg:block" />

          <nav className="hidden items-center gap-1 lg:flex">
            {dropdowns.map((d) => (
              <DropdownItem key={d.label} label={t(d.label)} items={d.items} t={t} />
            ))}
            {flatLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.05em] text-ink-mid transition-colors hover:text-gold"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <LangSwitcher className="hidden lg:inline-flex" />
          <ThemeToggle />
          <Link
            href="/contact"
            className="hidden items-center gap-2 rounded-full bg-ink px-5 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.08em] text-bg transition-colors hover:bg-gold-deep lg:inline-flex"
          >
            {t("contact")}
            <span aria-hidden>→</span>
          </Link>
          <MobileMenu />
        </div>
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
        className="inline-flex items-center gap-1 px-3 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.05em] text-ink-mid transition-colors group-hover:text-gold"
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
