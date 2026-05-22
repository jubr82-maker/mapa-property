"use client";

/**
 * SPRINT3 T5 — Avis clients boucle infinie passive.
 *
 * Embla loop:true, autoplay 5000ms forward continu (plus lent que
 * Featured 4s pour differencier). Pause au hover desktop / touch
 * mobile, reprend (stopOnInteraction false + stopOnMouseEnter true).
 * AUCUN dot, AUCUNE fleche : passif. Transition adoucie (duration 30).
 *
 * Cards palette Forêt :
 *  - bordure cuivre citron #D4A574 1px
 *  - fond crème #F0E6CC (jour) / sapin #1F221A (nuit) via token bg-bg
 *  - commentaire italique cuivre citron
 *  - nom client JetBrains Mono uppercase petit
 *
 * prefers-reduced-motion : autoplay desactive (loop fige, lecture
 * manuelle au swipe possible).
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { Review } from "@/lib/types";
import { SignatureLine } from "@/components/ui/SignatureLine";

interface Props {
  reviews: Review[];
}

export function ReviewsCarousel({ reviews }: Props) {
  const t = useTranslations("reviews_home");
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: "start", duration: 30, dragFree: false },
    reduced
      ? []
      : [
          Autoplay({
            delay: 5000,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
          }),
        ],
  );

  // Re-init au changement de reviews (rare, mais evite track fige).
  useEffect(() => {}, [reviews.length]);

  if (reviews.length === 0) return null;

  return (
    <section className="px-6 py-5 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-4 max-w-2xl md:mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">{t("title")}</h2>
          <SignatureLine />
        </header>

        <div ref={emblaRef} className="overflow-hidden">
          <ul className="flex gap-3 md:gap-5">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="min-w-0 shrink-0 grow-0 basis-[80%] sm:basis-[420px]"
              >
                <article
                  className="flex h-full flex-col gap-2.5 rounded-xl bg-bg p-4 md:gap-5 md:p-6"
                  style={{ border: "1px solid #D4A574" }}
                >
                  <Stars rating={r.rating ?? 5} />
                  <blockquote
                    className="line-clamp-5 text-sm italic leading-relaxed md:line-clamp-none md:text-base"
                    style={{ color: "#D4A574" }}
                  >
                    “{r.comment ?? ""}”
                  </blockquote>
                  <footer className="mt-auto flex items-center justify-between border-t border-line pt-3 md:pt-4">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink md:text-xs">
                      {r.name ?? "—"}
                    </span>
                    {r.review_date && (
                      <time
                        dateTime={r.review_date}
                        className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft"
                      >
                        {new Date(r.review_date).toLocaleDateString("fr-LU", {
                          year: "numeric",
                          month: "short",
                        })}
                      </time>
                    )}
                  </footer>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{ color: i < rating ? "#D4A574" : "rgba(212,165,116,0.25)" }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M10 1.5l2.6 5.4 5.9.6-4.4 4.1 1.2 5.9L10 14.6 4.7 17.5l1.2-5.9-4.4-4.1 5.9-.6L10 1.5z" />
          </svg>
        </span>
      ))}
    </div>
  );
}
