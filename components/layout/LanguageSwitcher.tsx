"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<(typeof routing.locales)[number], string> = {
  fr: "FR",
  en: "EN",
  de: "DE",
};

interface Props {
  variant?: "light" | "dark";
  onSwitched?: () => void;
}

export function LanguageSwitcher({ variant = "light", onSwitched }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const switchLocale = (l: (typeof routing.locales)[number]) => {
    setOpen(false);
    if (l === locale) {
      onSwitched?.();
      return;
    }
    startTransition(() => {
      router.replace(
        // @ts-expect-error pathname & params typed loosely
        { pathname, params },
        { locale: l },
      );
      onSwitched?.();
    });
  };

  const isDark = variant === "dark";

  const triggerClass = isDark
    ? `inline-flex h-9 min-w-[3rem] items-center justify-center gap-1.5 rounded-full border px-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-all duration-200 ${
        open
          ? "border-[#B8865A] bg-[#B8865A]/10 text-[#B8865A]"
          : "border-[#B8865A] text-[#B8865A] hover:bg-[#B8865A]/10"
      }`
    : `inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] transition-all duration-200 ${
        open ? "text-gold" : "text-ink-soft hover:text-gold"
      }`;

  const menuClass = isDark
    ? `absolute right-0 top-full z-50 mt-2 min-w-[5rem] overflow-hidden rounded-xl border border-white/15 bg-ink/95 shadow-lg backdrop-blur-md transition-all duration-200 ${
        open
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0"
      }`
    : `absolute right-0 top-full z-50 mt-1 min-w-[4.5rem] overflow-hidden rounded-xl border border-line bg-bg shadow-lg transition-all duration-200 ${
        open
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0"
      }`;

  const itemClass = isDark
    ? "flex w-full items-center justify-center px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80 transition-colors hover:bg-[#B8865A]/10 hover:text-[#B8865A]"
    : "flex w-full items-center justify-center px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mid transition-colors hover:bg-bg-soft hover:text-gold";

  const otherLocales = routing.locales.filter((l) => l !== locale);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current="true"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
      >
        <span>{localeLabels[locale as (typeof routing.locales)[number]]}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div role="menu" aria-label="Language" className={menuClass}>
        {otherLocales.map((l) => (
          <button
            key={l}
            type="button"
            role="menuitem"
            onClick={() => switchLocale(l)}
            className={itemClass}
          >
            {localeLabels[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
