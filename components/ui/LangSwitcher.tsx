"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";

const labels: Record<(typeof routing.locales)[number], string> = {
  fr: "FR",
  en: "EN",
  de: "DE",
};

export function LangSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-0.5 rounded-full border border-line p-0.5 ${className}`}
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            aria-pressed={active}
            disabled={active}
            onClick={() =>
              startTransition(() => {
                router.replace(
                  // @ts-expect-error pathname & params typed loosely
                  { pathname, params },
                  { locale: l },
                );
              })
            }
            className={`px-2.5 py-1 font-mono text-[11px] font-medium tracking-widest uppercase transition-colors ${
              active
                ? "rounded-full bg-ink text-bg"
                : "text-ink-soft hover:text-gold"
            }`}
          >
            {labels[l]}
          </button>
        );
      })}
    </div>
  );
}
