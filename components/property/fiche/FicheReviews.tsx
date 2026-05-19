// POL2-7 — Avis clients discrets (≤ 4 cartes étoilées, extrait court).
// Sobre, sous la grille principale, au-dessus du formulaire. Server
// Component. Rien si aucun avis (jamais de bloc vide cassé).

import { SignatureLine } from "@/components/ui/SignatureLine";

export interface FicheReview {
  id: string;
  name: string | null;
  rating: number | null;
  comment: string | null;
}

export function FicheReviews({
  heading,
  reviews,
}: {
  heading: string;
  reviews: FicheReview[];
}) {
  const list = reviews.slice(0, 4);
  if (list.length === 0) return null;

  return (
    <section data-fiche-reviews className="mt-20">
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
        {heading}
      </h2>
      <SignatureLine width="w-8" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((r) => {
          const stars = Math.max(0, Math.min(5, r.rating ?? 5));
          const extract = (r.comment ?? "").trim();
          return (
            <li
              key={r.id}
              className="rounded-xl border border-line bg-bg-soft p-5"
            >
              <div
                className="flex items-center gap-0.5 text-gold-bright"
                aria-label={`${stars}/5`}
              >
                {Array.from({ length: stars }).map((_, i) => (
                  <span key={i} aria-hidden>
                    ★
                  </span>
                ))}
              </div>
              <blockquote className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink-mid">
                {extract ? `“${extract}”` : ""}
              </blockquote>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                {r.name ?? "—"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
