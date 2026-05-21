import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";
// FadeInOnScroll (STEP3b enrichi y/scale/duration) wrap externe pour le
// scale 0.95 → 1.0 ; FadeInOnScroll interne (delays 0/80/160) preserves.

export function OffMarketBand() {
  const t = useTranslations("offmarket_band");

  return (
    // STEP3a-FORET : fond sapin profond var(--offmarket-bg) #1F221A,
    // identique en jour ET nuit (palette Forêt stricte). Le texte
    // reste white pour contraste maximum sur sapin.
    // - Padding vertical DOUBLÉ pour la visibilité (py-5/20 → py-10/40).
    // - Titre +30% via text-* responsive ajoutés sur t-h2-contrast.
    // - Badge MANDAT EXCLUSIF en haut, copper (gold-deep, le token réel
    //   du projet — "text-copper" n'existe pas comme classe Tailwind ici).
    <section
      className="relative overflow-hidden px-6 py-10 text-white md:py-40 lg:px-10 lg:py-40"
      style={{
        backgroundColor: "var(--offmarket-bg)",
        transition: "background-color 0.4s ease",
      }}
    >
      <div className="pointer-events-none absolute -right-32 -top-32 size-48 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 -bottom-32 size-48 rounded-full bg-accent-warm/10 blur-3xl" />

      {/* STEP3b : wrapper FadeInOnScroll avec scale 0.95 → 1.0 (zoom-in
          subtil) + duree 1s sur tout le contenu — la bande premium
          "respire" en entrant dans le viewport. */}
      <FadeInOnScroll y={0} scale={0.95} duration={1000} className="relative mx-auto max-w-[1400px]">
      <div className="grid gap-3 md:gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          {/* Badge MANDAT EXCLUSIF copper, visible en haut */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-deep/40 bg-gold-deep/10 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-deep">
            <span aria-hidden className="size-1.5 rounded-full bg-gold-deep" />
            {t("eyebrow") /* MANDAT EXCLUSIF type de label — eyebrow gardé ici comme étiquette badge */}
          </div>

          <h2 className="t-h2-contrast mt-3 text-4xl md:text-5xl lg:text-6xl">
            {t("title")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 md:mt-5 md:text-base">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:gap-4 lg:items-end">
          <ul className="space-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 md:space-y-3 md:text-xs">
            <li>
              <FadeInOnScroll
                delay={0}
                className="flex items-center gap-3 lg:justify-end"
              >
                <span className="size-1.5 rounded-full bg-gold-bright" />
                {t("benefit_1")}
              </FadeInOnScroll>
            </li>
            <li>
              <FadeInOnScroll
                delay={80}
                className="flex items-center gap-3 lg:justify-end"
              >
                <span className="size-1.5 rounded-full bg-gold-bright" />
                {t("benefit_2")}
              </FadeInOnScroll>
            </li>
            <li>
              <FadeInOnScroll
                delay={160}
                className="flex items-center gap-3 lg:justify-end"
              >
                <span className="size-1.5 rounded-full bg-gold-bright" />
                {t("benefit_3")}
              </FadeInOnScroll>
            </li>
          </ul>

          <Link
            href="/off-market"
            className="gold-shine-bg inline-flex items-center gap-2 self-start rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] lg:self-end"
          >
            {t("cta")}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
      </FadeInOnScroll>
    </section>
  );
}
