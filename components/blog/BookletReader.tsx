"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

interface Props {
  title: string;
  coverImage: string | null;
  author: string | null;
  publishedAt: string | null;
  primaryTag: string | null;
  contentHtml: string;
}

const splitByH2 = (html: string): string[] => {
  // Split content by H2 boundaries while keeping the heading at the start of each chunk.
  // Naive split — supports both <h2 ...>X</h2> patterns.
  const parts = html.split(/(?=<h2\b)/i).filter((p) => p.trim().length > 0);
  return parts.length > 0 ? parts : [html];
};

export function BookletReader({
  title,
  coverImage,
  author,
  publishedAt,
  primaryTag,
  contentHtml,
}: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("booklet");
  const [page, setPage] = useState(0); // 0 = cover
  const containerRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(() => splitByH2(contentHtml), [contentHtml]);
  const totalPages = pages.length + 1; // +1 for cover

  const next = () => setPage((p) => Math.min(p + 1, totalPages - 1));
  const prev = () => setPage((p) => Math.max(p - 1, 0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") router.push(`/${locale}/blog`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Touch swipe
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startX = 0;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 50) return;
      if (dx < 0) next();
      else prev();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  });

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString(
        locale === "fr" ? "fr-LU" : locale === "de" ? "de-LU" : "en-US",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : "";

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/blog`)}
          aria-label={t("close")}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mid transition-colors hover:border-gold hover:text-gold"
        >
          ← {t("close")}
        </button>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
          {t("page")} {page + 1} / {totalPages}
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-[60dvh] overflow-hidden rounded-2xl border border-line bg-bg shadow-lg shadow-ink/5"
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {/* Cover */}
          <article className="w-full flex-shrink-0 px-6 py-12 sm:px-10 sm:py-16">
            <div className="mx-auto flex max-w-3xl flex-col items-start gap-6">
              {primaryTag && (
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                  {primaryTag}
                </span>
              )}
              <h1 className="font-display text-4xl font-black leading-[0.95] tracking-tight text-ink sm:text-7xl">
                {title}
              </h1>
              {coverImage && (
                <img
                  src={coverImage}
                  alt={title}
                  className="aspect-[16/9] w-full rounded-xl object-cover"
                  loading="eager"
                />
              )}
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">
                {[author, formattedDate].filter(Boolean).join(" · ")}
              </p>
            </div>
          </article>

          {/* Content pages */}
          {pages.map((chunk, i) => (
            <article
              key={i}
              className="prose-mapa w-full flex-shrink-0 px-6 py-12 sm:px-10 sm:py-16"
              dangerouslySetInnerHTML={{ __html: chunk }}
            />
          ))}
        </div>

        {/* Page texture (subtle) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] [background-size:6px_6px] dark:[background-image:radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)]"
        />
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          disabled={page === 0}
          className="inline-flex size-12 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
          aria-label={t("prev")}
        >
          ←
        </button>
        <button
          type="button"
          onClick={next}
          disabled={page === totalPages - 1}
          className="inline-flex size-12 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
          aria-label={t("next")}
        >
          →
        </button>
      </div>
    </div>
  );
}
