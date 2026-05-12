"use client";

import { useTransition } from "react";
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

  const switchLocale = (l: (typeof routing.locales)[number]) => {
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

  return (
    <div
      className={
        isDark
          ? "flex flex-wrap items-center justify-center gap-2"
          : "flex items-center gap-1"
      }
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        const className = isDark
          ? `inline-flex h-9 min-w-[3rem] items-center justify-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
              active
                ? "border-[#B8865A] bg-[#B8865A]/10 text-[#B8865A]"
                : "border-white/30 text-white/70 hover:border-[#B8865A] hover:text-[#B8865A]"
            }`
          : `inline-flex items-center justify-center rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
              active
                ? "bg-gold/10 text-gold-deep"
                : "text-ink-soft hover:text-gold"
            }`;
        return (
          <button
            key={l}
            type="button"
            aria-current={active ? "true" : undefined}
            onClick={() => switchLocale(l)}
            className={className}
          >
            {localeLabels[l]}
          </button>
        );
      })}
    </div>
  );
}
