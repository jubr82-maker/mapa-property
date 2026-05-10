"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<(typeof routing.locales)[number], string> = {
  fr: "FR",
  en: "EN",
  de: "DE",
};

type SubItem = { href: string; key: string };
type Group = {
  id: string;
  label: string;
  href?: string;
  items?: SubItem[];
};

const groups: Group[] = [
  {
    id: "buy",
    label: "buy",
    items: [
      { href: "/biens", key: "all_properties" },
      { href: "/mandats/recherche", key: "search_mandate" },
      { href: "/off-market", key: "off_market" },
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
    id: "services",
    label: "services",
    items: [
      { href: "/services/estimer", key: "estimate" },
      { href: "/services/simulateurs", key: "simulators" },
      { href: "/services/marches-actifs", key: "markets" },
      { href: "/qui-sommes-nous", key: "about" },
      { href: "/contact", key: "contact" },
      { href: "/blog", key: "blog" },
    ],
  },
  {
    id: "off_market",
    label: "off_market",
    href: "/off-market",
  },
];

export function HeaderBurger() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [, startTransition] = useTransition();

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

  const switchLocale = (l: (typeof routing.locales)[number]) => {
    if (l === locale) {
      close();
      return;
    }
    startTransition(() => {
      router.replace(
        // @ts-expect-error pathname & params typed loosely
        { pathname, params },
        { locale: l },
      );
      close();
    });
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

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        aria-hidden={!open}
        className={`fixed inset-0 z-[9999] flex flex-col overflow-y-auto bg-bg transition-opacity duration-200 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5 lg:px-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
            MAPA Property
          </span>
          <button
            type="button"
            aria-label={t("close_menu")}
            onClick={close}
            className="inline-flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-gold hover:text-gold"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-6 py-8 lg:px-10">
          <ul className="space-y-1">
            {groups.map((group) => {
              if (group.href) {
                return (
                  <li key={group.id} className="border-b border-line/60">
                    <Link
                      href={group.href}
                      onClick={close}
                      className="block py-4 font-display text-3xl font-bold uppercase tracking-wide text-ink transition-colors hover:text-gold"
                    >
                      {t(group.label)}
                    </Link>
                  </li>
                );
              }
              const isExpanded = expanded === group.id;
              return (
                <li key={group.id} className="border-b border-line/60">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : group.id)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between py-4 font-display text-3xl font-bold uppercase tracking-wide text-ink transition-colors hover:text-gold"
                  >
                    {t(group.label)}
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className={`size-5 text-gold transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isExpanded && group.items && (
                    <ul className="pb-4 pl-1">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={close}
                            className="block py-2 font-sans text-base text-ink-mid transition-colors hover:text-gold"
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

            <li className="border-b border-line/60">
              <Link
                href="/arcova"
                onClick={close}
                className="flex items-center gap-2 py-4 font-display text-3xl font-bold uppercase tracking-wide text-ink transition-colors hover:text-gold"
              >
                ARCOVA
                <LockIcon />
              </Link>
            </li>
          </ul>

          <div className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
              Langues
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {routing.locales.map((l) => {
                const active = l === locale;
                return (
                  <li key={l}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => switchLocale(l)}
                      className={`inline-flex h-10 min-w-[3rem] items-center justify-center rounded-full border px-4 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
                        active
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-line text-ink-mid hover:border-gold hover:text-gold"
                      }`}
                    >
                      {localeLabels[l]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
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
