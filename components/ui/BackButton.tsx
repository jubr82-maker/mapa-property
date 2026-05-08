"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function BackButton({
  fallback,
  className = "",
}: {
  fallback: string;
  className?: string;
}) {
  const router = useRouter();
  const t = useTranslations("common");

  return (
    <button
      type="button"
      onClick={() => {
        if (
          typeof window !== "undefined" &&
          window.history.length > 1
        ) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      className={`inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mid transition-colors hover:border-gold hover:text-gold ${className}`}
    >
      <span aria-hidden>←</span>
      {t("back")}
    </button>
  );
}
