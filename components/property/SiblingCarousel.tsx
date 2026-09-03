"use client";

// Sprint SIBLING-1 — Carrousel "Voir aussi les autres [famille]" sous la
// liste de résultats de /biens. Affiché uniquement quand la page a décidé
// (côté serveur, cf. computeSiblingSuggestions dans biens/page.tsx) qu'un
// filtre de type précis renvoie peu de résultats et qu'il existe des
// biens frères à proposer. Réutilise PropertyCard tel quel (photo, titre,
// prix, specs) — les cartes restent des liens normaux vers la fiche.
//
// Défilement horizontal Embla (scroll tactile natif mobile) + flèches
// précédent/suivant sur desktop, sans autoplay (bloc de suggestion, pas
// un carrousel passif).
//
// Sprint SIBLING-2 — Tracking via le système unifié existant (lib/tracking,
// /api/track, table tracking_events). "sibling_carousel_view" fire une
// fois par affichage réel (déps = contenu effectivement montré, pas à
// chaque re-render) ; "sibling_carousel_click" fire au clic sur une
// mini-fiche, sans jamais bloquer la navigation (track() est fire-and-
// forget, aucun preventDefault). Respecte le consentement cookies déjà
// géré par lib/tracking/track.ts (hasConsent()).

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import useEmblaCarousel from "embla-carousel-react";
import type { PropertyWithCover } from "@/lib/data";
import type { Locale } from "@/lib/types";
import { PropertyCard } from "@/components/property/PropertyCard";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { track } from "@/lib/tracking/track";

interface Props {
  properties: PropertyWithCover[];
  /** Types larges parents des types précis filtrés (ex. ["appartement"]). */
  parentSlugs: string[];
  /** Types précis filtrés qui ont déclenché le carrousel (ex. ["penthouse"]). */
  triggerTypes: string[];
  locale: Locale;
}

export function SiblingCarousel({
  properties,
  parentSlugs,
  triggerTypes,
  locale,
}: Props) {
  const t = useTranslations("property_list");
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Clé dérivée stable (primitives) du contenu réellement affiché — évite
  // de re-fire à chaque re-render (les tableaux props sont de nouvelles
  // références à chaque appel serveur) tout en re-trackant un "view" si
  // l'utilisateur change de filtre côté client et obtient un carrousel
  // différent sans démontage complet du composant.
  const triggerKey = triggerTypes.join(",");
  const propertiesKey = properties.map((p) => p.id).join(",");

  useEffect(() => {
    if (properties.length === 0) return;
    track("sibling_carousel_view", {
      trigger_types: triggerTypes,
      family: parentSlugs,
      count: properties.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey, propertiesKey]);

  if (properties.length === 0) return null;

  const handleCardClick = (property: PropertyWithCover) => {
    track("sibling_carousel_click", {
      property_id: property.id,
      property_slug: property.slug ?? null,
      trigger_types: triggerTypes,
    });
  };

  const familyLabel = parentSlugs
    .map((slug) => t(`sibling_carousel.family.${slug}`))
    .join(` ${t("sibling_carousel.and")} `);

  return (
    <section
      className="mt-16 border-t border-line pt-10"
      aria-label={t("sibling_carousel.region_label")}
    >
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="t-h3">
            {t("sibling_carousel.title", { family: familyLabel })}
          </h2>
          <SignatureLine width="w-8" />
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            aria-label={t("sibling_carousel.prev")}
            className="flex size-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-gold hover:text-gold-deep disabled:pointer-events-none disabled:opacity-30"
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            aria-label={t("sibling_carousel.next")}
            className="flex size-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-gold hover:text-gold-deep disabled:pointer-events-none disabled:opacity-30"
          >
            <span aria-hidden>→</span>
          </button>
        </div>
      </header>

      <div ref={emblaRef} className="overflow-hidden">
        <ul className="flex gap-4">
          {properties.map((property) => (
            <li
              key={property.id}
              className="w-[280px] flex-[0_0_auto] sm:w-[300px]"
            >
              <PropertyCard
                property={property}
                locale={locale}
                compact
                onClick={() => handleCardClick(property)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
