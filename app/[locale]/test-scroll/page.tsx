import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchHomeFeatured } from "@/lib/data";
import { FeaturedDesktopTest } from "./FeaturedDesktopTest";

/**
 * Route de test isolée /[locale]/test-scroll — NON LIÉE depuis la nav.
 *
 * But : valider en prod que le scroll-hijack pin sticky fonctionne quand
 * le wrapper englobant n'applique PAS de transform (FadeInOnScrollSafe vs
 * FadeInOnScroll). Si le pin marche ici, on saura qu'il faut rebrancher
 * sur la home en remplaçant FadeInOnScroll par FadeInOnScrollSafe autour
 * de FeaturedCarousel.
 *
 * Noindex strict — la route ne doit jamais être indexée.
 */

export const metadata: Metadata = {
  title: "Test scroll-hijack — MAPA Property",
  robots: { index: false, follow: false },
};

export default async function TestScrollPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [featured, tOff] = await Promise.all([
    fetchHomeFeatured(6, locale),
    getTranslations({ locale, namespace: "offmarket" }),
  ]);
  const tFeat = await getTranslations({ locale, namespace: "featured" });

  return (
    <main className="min-h-dvh">
      {/* Section sentinelle AVANT — pour sentir l'entrée du pin */}
      <section className="flex min-h-[80vh] flex-col items-center justify-center bg-bg-soft px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          Sentinelle haute (80vh)
        </p>
        <h1 className="mt-4 t-h2">Route /test-scroll</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-mid">
          Scroll vers le bas pour entrer dans la section pin sticky.
          Si le sticky fonctionne, la section coups de cœur se fige et les
          cartes glissent horizontalement.
        </p>
      </section>

      {/* Zone test — pas de wrapper FadeIn (l'IntersectionObserver de
          FadeInOnScrollSafe ne se déclenchait jamais sur un élément de
          8100px car ratio max ≈ 11% < threshold 0.15 → opacity restait
          à 0). Le carrousel pinné n'a pas besoin de fondu d'entrée. */}
      <FeaturedDesktopTest
        items={featured}
        seeAllLabel={tFeat("see_all")}
        cardEyebrowOffmarket="Off-Market"
        cardCoverTitle={tOff("cover_title")}
        cardCoverSubtitle={tOff("cover_subtitle")}
      />

      {/* Section sentinelle APRÈS — pour sentir la sortie du pin */}
      <section className="flex min-h-[80vh] flex-col items-center justify-center bg-bg-soft px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          Sentinelle basse (80vh)
        </p>
        <p className="mt-4 max-w-xl text-sm text-ink-mid">
          Si tu vois cette section, c'est que la course de scroll du pin a
          été consommée et la page a repris sa progression normale.
        </p>
      </section>
    </main>
  );
}
