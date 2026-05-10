"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { MobileMenu } from "@/components/layout/MobileMenu";

const leftDropdowns = [
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
      { href: "/services/vendre", key: "all_mandates" },
      { href: "/mandats/exclusif", key: "mandate_exclusive" },
      { href: "/mandats/semi-exclusif", key: "mandate_semi" },
      { href: "/mandats/simple", key: "mandate_simple" },
      { href: "/mandats/autonome", key: "mandate_autonomous" },
      { href: "/services/estimer", key: "estimate" },
    ],
  },
] as const;

const rightDropdowns = [
  {
    label: "services",
    items: [
      { href: "/services/estimer", key: "estimate" },
      { href: "/services/simulateurs", key: "simulators" },
      { href: "/services/marches-actifs", key: "markets" },
      { href: "/legal/honoraires", key: "fees" },
      { href: "/qui-sommes-nous", key: "about" },
      { href: "/blog", key: "blog" },
    ],
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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-line bg-bg/95 backdrop-blur-md"
          : "border-b border-transparent bg-bg/85 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:h-20 lg:grid-cols-[1fr_auto_1fr] lg:px-10">
        {/* Left zone : Acheter / Vendre / Louer */}
        <nav className="hidden items-center gap-1 lg:flex">
          {leftDropdowns.map((d) => (
            <DropdownItem key={d.label} label={t(d.label)} items={d.items} t={t} />
          ))}
          <Link
            href="/biens?transaction=rent"
            className="px-3 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.05em] text-ink transition-colors hover:text-gold"
          >
            {t("rent")}
          </Link>
        </nav>

        {/* Mobile burger left */}
        <div className="lg:hidden">
          <MobileMenu />
        </div>

        {/* Center : Logo */}
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        {/* Right zone : Services / Off-Market / ARCOVA / Lang / Contact */}
        <div className="hidden items-center justify-end gap-1 lg:flex">
          {rightDropdowns.map((d) => (
            <DropdownItem key={d.label} label={t(d.label)} items={d.items} t={t} />
          ))}
          <Link
            href="/off-market"
            className="px-3 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.05em] text-ink transition-colors hover:text-gold"
          >
            {t("off_market")}
          </Link>
          <Link
            href="/arcova"
            className="inline-flex items-center gap-1 px-3 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.05em] text-ink transition-colors hover:text-gold"
          >
            ARCOVA
            <LockIcon />
          </Link>
          <LangSwitcher className="ml-2" />
          <Link
            href="/contact"
            className="ml-2 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-navy-deep"
          >
            {t("contact")}
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Mobile right : LangSwitcher seul */}
        <div className="flex items-center justify-end lg:hidden">
          <LangSwitcher />
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
        className="inline-flex items-center gap-1 px-3 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.05em] text-ink transition-colors group-hover:text-gold"
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
