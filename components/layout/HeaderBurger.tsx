"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<(typeof routing.locales)[number], string> = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
};

const mobileNavItems = [
  { href: "/biens", key: "buy" },
  { href: "/services/vendre", key: "sell" },
  { href: "/biens?transaction=rent", key: "rent" },
  { href: "/services", key: "services" },
  { href: "/off-market", key: "off_market" },
  { href: "/arcova", label: "ARCOVA" },
] as const;

export function HeaderBurger() {
  const [open, setOpen] = useState(false);
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const switchLocale = (l: (typeof routing.locales)[number]) => {
    if (l === locale) {
      setOpen(false);
      return;
    }
    startTransition(() => {
      router.replace(
        // @ts-expect-error pathname & params typed loosely
        { pathname, params },
        { locale: l },
      );
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-gold hover:text-gold"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[60]"
        >
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col gap-8 overflow-y-auto bg-bg p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
                MAPA Property
              </span>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-gold hover:text-gold"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-6 lg:hidden">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                Navigation
              </p>
              <ul className="flex flex-col gap-3">
                {mobileNavItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block py-1 font-display text-2xl font-bold text-ink transition-colors hover:text-gold"
                    >
                      {"label" in item ? item.label : t(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex flex-col gap-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                Langues
              </p>
              <ul className="flex flex-col gap-2">
                {routing.locales.map((l) => {
                  const active = l === locale;
                  return (
                    <li key={l}>
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => switchLocale(l)}
                        className={`flex w-full items-center gap-3 py-2 text-left font-sans text-base transition-colors ${
                          active ? "text-ink" : "text-ink-soft hover:text-gold"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`inline-block size-2 rounded-full ${active ? "bg-gold" : "border border-ink-soft"}`}
                        />
                        {localeLabels[l]}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
