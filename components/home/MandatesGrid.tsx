/**
 * SPRINT0 — MandatesGrid restructure en pyramide vendeur/acheteur.
 *
 * Architecture :
 *   [Section VENDRE]
 *     • Header (eyebrow / h2 / signature line / subtitle)
 *     • Card pleine largeur EXCLUSIF — halo lime mur + bordure lime,
 *       label "Notre formule signature vendeur", layout horizontal
 *       (titre+honoraires gauche, description centre, CTA droite)
 *     • Grille 3 colonnes : Semi-Exclusif / Simple / Autonome
 *       (cards classiques, sans halo, layout existant via HoverFlipCard)
 *   [Separateur visuel — espace genereux + filet cuivre discret]
 *   [Section ACHETER]
 *     • Header (eyebrow / h2 / signature line / subtitle)
 *     • Card pleine largeur RECHERCHE — halo lime mur + bordure lime,
 *       label "Notre formule signature acheteur", contenu : titre/
 *       sous-titre/honoraires/description/couverture/CTA/avance note
 *
 * Conserve : HoverFlipCard pour les 3 cards milieu, FadeInOnScroll wrap
 * (stagger 250ms STEP3c-1), i18n mandates_home.* enrichi.
 *
 * SUPPRIME : ancienne grille 4 colonnes plate (toutes a meme rang).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HoverFlipCard } from "@/components/ui/HoverFlipCard";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";
import { SignatureLine } from "@/components/ui/SignatureLine";

// Les 3 cards milieu de la pyramide (rang classique, sans halo lime).
const middleMandates = [
  { key: "semi", href: "/mandats/semi-exclusif", rate: "4%" },
  { key: "simple", href: "/mandats/simple", rate: "5%" },
  { key: "autonomous", href: "/mandats/autonome", rate: "1%" },
] as const;

// Style commun aux 2 cards pleine largeur signature (halo lime + bordure
// lime + scale 1.02 leger). Inline pour piloter precisement les valeurs
// rgba/scale qui n'ont pas d'utilitaire Tailwind direct.
const SIGNATURE_CARD_STYLE: React.CSSProperties = {
  boxShadow:
    "0 0 60px rgba(207, 229, 66, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3)",
  border: "1px solid rgba(207, 229, 66, 0.4)",
  transform: "scale(1.02)",
};

export function MandatesGrid() {
  const t = useTranslations("mandates_home");
  // SPRINT1 : flip auto state — Map<key, boolean> pour les 3 cards milieu.
  // Initialement toutes a false. IntersectionObserver declenche un cycle
  // unique : 3s d'attente apres entree viewport, puis flip stagger 200ms,
  // 1s de pause, re-flip pour retour initial.
  const sectionRef = useRef<HTMLElement>(null);
  const triggeredRef = useRef(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sectionRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || triggeredRef.current) return;
          triggeredRef.current = true;
          // 3s d'attente apres apparition
          window.setTimeout(() => {
            middleMandates.forEach((m, i) => {
              window.setTimeout(() => {
                // Flip ON
                setFlipped((prev) => ({ ...prev, [m.key]: true }));
                // Flip OFF apres 1s (revient a l'etat initial)
                window.setTimeout(() => {
                  setFlipped((prev) => ({ ...prev, [m.key]: false }));
                }, 1000);
              }, i * 200);
            });
          }, 3000);
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="px-6 py-5 md:py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        {/* ════════ SECTION VENDRE ════════ */}
        <header className="mb-5 max-w-3xl md:mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep md:text-xs">
            {t("vendre_eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">{t("vendre_title")}</h2>
          <SignatureLine />
          <p className="mt-3 max-w-2xl text-sm text-ink-mid md:text-base">
            {t("vendre_subtitle")}
          </p>
        </header>

        {/* CARD PLEINE LARGEUR EXCLUSIF (top de la pyramide) */}
        <FadeInOnScroll y={30}>
          <div
            className="mb-8 rounded-2xl bg-bg-contrast p-6 text-text-contrast md:mb-10 md:p-10"
            style={SIGNATURE_CARD_STYLE}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold-bright md:text-xs">
              {t("signature_vendeur_label")}
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[1.2fr_2fr_auto] md:items-end md:gap-10">
              {/* Gauche : titre + honoraires */}
              <div>
                <h3 className="font-display text-3xl font-black leading-tight md:text-5xl">
                  {t("exclusive_title")}
                </h3>
                <div className="mt-4">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.25em] text-text-contrast/60 md:text-[10px]">
                    {t("rate_label")}
                  </span>
                  <span className="mt-1 block font-display text-4xl font-black gold-text md:text-5xl">
                    3%
                  </span>
                </div>
              </div>
              {/* Centre : description courte */}
              <p className="max-w-xl text-sm leading-relaxed text-text-contrast/85 md:text-base">
                {t("exclusive_text")}
              </p>
              {/* Droite : CTA */}
              <Link
                href="/mandats/exclusif"
                className="inline-flex items-center justify-center gap-2 self-end rounded-full bg-[#CFE542] px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#1F221A] transition-transform hover:scale-[1.03]"
              >
                {t("view_detail")}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </FadeInOnScroll>

        {/* GRILLE 3 COLONNES (Semi / Simple / Autonome) — SPRINT1 stagger
            600ms (vs 250 avant) + flip auto declenchee par l'observer. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          {middleMandates.map((m, idx) => (
            <FadeInOnScroll key={m.key} delay={idx * 600} y={30}>
              <HoverFlipCard
                height="h-36 sm:h-44 md:h-48"
                flipped={flipped[m.key]}
                front={
                  <div className="relative flex size-full flex-col justify-between rounded-lg border border-border-subtle bg-bg p-3 md:p-4">
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-gold-deep">
                        {t("type_label")}
                      </span>
                      <h3 className="mt-1 font-display text-lg font-black leading-tight text-ink md:text-xl">
                        {t(`${m.key}_title`)}
                      </h3>
                    </div>
                    <div>
                      <span className="block font-mono text-[8px] uppercase tracking-[0.25em] text-ink-soft">
                        {t("rate_label")}
                      </span>
                      <span className="mt-0.5 block font-display text-2xl font-black gold-text md:text-3xl">
                        {m.rate}
                      </span>
                    </div>
                  </div>
                }
                back={
                  <div className="flex size-full flex-col gap-1.5 rounded-lg border border-gold bg-bg-contrast p-3 text-text-contrast md:p-4">
                    <h3 className="font-display text-base font-black leading-tight md:text-lg">
                      {t(`${m.key}_title`)}
                    </h3>
                    <p className="text-[11px] leading-snug text-text-contrast/80 md:text-xs">
                      {t(`${m.key}_text`)}
                    </p>
                    <Link
                      href={m.href}
                      className="mt-auto inline-flex items-center gap-1 self-start font-mono text-[9px] uppercase tracking-[0.2em] text-gold-bright hover:text-text-contrast md:text-[10px]"
                    >
                      {t("learn_more")} →
                    </Link>
                  </div>
                }
              />
            </FadeInOnScroll>
          ))}
        </div>

        {/* ════════ SEPARATEUR VISUEL ════════ */}
        <div className="my-16 flex items-center justify-center md:my-24">
          <div
            aria-hidden
            className="h-px w-24"
            style={{ backgroundColor: "rgba(212, 165, 116, 0.4)" }}
          />
        </div>

        {/* ════════ SECTION ACHETER ════════ */}
        <header className="mb-5 max-w-3xl md:mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep md:text-xs">
            {t("acheter_eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">{t("acheter_title")}</h2>
          <SignatureLine />
          <p className="mt-3 max-w-3xl text-sm text-ink-mid md:text-base">
            {t("acheter_subtitle")}
          </p>
        </header>

        {/* CARD PLEINE LARGEUR RECHERCHE (bottom de la pyramide) */}
        <FadeInOnScroll y={30}>
          <div
            className="rounded-2xl bg-bg-contrast p-6 text-text-contrast md:p-10"
            style={SIGNATURE_CARD_STYLE}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold-bright md:text-xs">
              {t("signature_acheteur_label")}
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[1.2fr_2fr_auto] md:items-end md:gap-10">
              {/* Gauche : titre + honoraires */}
              <div>
                <h3 className="font-display text-3xl font-black leading-tight md:text-5xl">
                  {t("recherche_title")}
                </h3>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-gold-bright">
                  {t("recherche_subtitle")}
                </p>
                <div className="mt-4">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.25em] text-text-contrast/60 md:text-[10px]">
                    {t("rate_label")}
                  </span>
                  <span className="mt-1 block font-display text-3xl font-black gold-text md:text-4xl">
                    {t("recherche_rate")}
                  </span>
                  <span className="block font-mono text-[9px] italic text-text-contrast/60">
                    {t("recherche_rate_note")}
                  </span>
                </div>
              </div>
              {/* Centre : description + couverture */}
              <div className="max-w-xl">
                <p className="text-sm leading-relaxed text-text-contrast/85 md:text-base">
                  {t("recherche_text")}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-bright/80 md:text-xs">
                  {t("recherche_coverage")}
                </p>
              </div>
              {/* Droite : CTA */}
              <Link
                href="/mandats/recherche"
                className="inline-flex items-center justify-center gap-2 self-end rounded-full bg-[#CFE542] px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#1F221A] transition-transform hover:scale-[1.03]"
              >
                {t("view_detail")}
                <span aria-hidden>→</span>
              </Link>
            </div>
            {/* Mention discrete avance sur frais (full width sous le grid) */}
            <p className="mt-6 max-w-3xl border-t border-text-contrast/15 pt-4 text-[11px] italic leading-relaxed text-text-contrast/65 md:text-xs">
              {t("recherche_avance_note")}
            </p>
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
