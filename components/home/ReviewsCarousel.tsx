import { useTranslations } from "next-intl";
import type { Review } from "@/lib/types";
import { SignatureLine } from "@/components/ui/SignatureLine";

interface Props {
  reviews: Review[];
}

export function ReviewsCarousel({ reviews }: Props) {
  const t = useTranslations("reviews_home");

  if (reviews.length === 0) return null;

  return (
    <section className="px-6 py-6 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 max-w-2xl md:mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-ink md:text-5xl">
            {t("title")}
          </h2>
          <SignatureLine />
        </header>

        <div className="-mx-6 overflow-x-auto pb-4 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:-mx-10">
          <ul className="flex w-max gap-3 px-6 md:gap-5 lg:px-10">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="w-[80vw] max-w-md shrink-0 snap-center sm:w-[420px]"
              >
                <article className="flex h-full flex-col gap-3 rounded-xl border border-border-subtle bg-bg p-4 md:gap-5 md:p-6">
                  <Stars rating={r.rating ?? 5} />
                  <blockquote className="text-xs leading-relaxed text-ink-mid md:text-base">
                    “{r.comment ?? ""}”
                  </blockquote>
                  <footer className="mt-auto flex items-center justify-between border-t border-line pt-3 md:pt-4">
                    <span className="font-display text-xs font-bold text-ink md:text-sm">
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
          className={i < rating ? "text-gold-bright" : "text-line-strong"}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M10 1.5l2.6 5.4 5.9.6-4.4 4.1 1.2 5.9L10 14.6 4.7 17.5l1.2-5.9-4.4-4.1 5.9-.6L10 1.5z" />
          </svg>
        </span>
      ))}
    </div>
  );
}
