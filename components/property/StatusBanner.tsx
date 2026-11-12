import { useTranslations } from "next-intl";
import { DIAGONAL_ANGLE, type PropertyBanner } from "@/lib/property-banner";

// Bandeau "Sous compromis", "Vendu", "Loue" (nov. 2026, SQL 35). Composant
// UNIQUE, pose sur la PREMIERE photo seulement : carte des biens
// (PropertyCard, carrousel de l'accueil, apercu de l'admin) et grande photo
// de la fiche (PropertyGallery). Vignettes et plein ecran inchanges.
//
// - photo a 50 % : un voile creme a 50 % pose sur la photo donne exactement
//   le meme rendu qu'une photo a 50 % d'opacite sur fond creme ;
// - bandeau sur toute la largeur, double filet fin en haut et en bas ;
// - Diagonale : conteneur plein cadre en flex (centre exact de la photo),
//   bandeau plus large que la photo puis rotation, donc centre exactement
//   sur la diagonale (coin bas gauche vers coin haut droit) et debordant
//   de chaque cote (coupe par le cadre, jamais par la page) ;
// - tailles en unites de conteneur (cqw) bornees : une seule ligne, lisible
//   de la plus petite carte de telephone a la fiche sur grand ecran ;
// - non cliquable (pointer-events: none), texte accessible (aria-label).
// Couleurs : variables --banner-* de app/globals.css (figees jour et nuit).

export function StatusBanner({ banner, variant }: { banner: PropertyBanner; variant: "card" | "gallery" }) {
  const t = useTranslations("status_banner");
  const diagonal = banner.position === "diagonal";
  const angle = diagonal ? DIAGONAL_ANGLE[variant] : 0;
  const c = banner.color;
  return (
    <div
      data-status-banner={banner.kind}
      data-banner-position={banner.position}
      data-banner-color={c}
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={{ containerType: "size" }}
    >
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "var(--banner-ground)", opacity: 0.5 }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          role="img"
          aria-label={t(`${banner.kind}_aria`)}
          className="flex shrink-0 flex-col items-center justify-center whitespace-nowrap"
          style={{
            width: diagonal ? "160%" : "100%",
            transform: angle ? `rotate(-${angle}deg)` : undefined,
            background: `var(--banner-${c}-bg)`,
            color: `var(--banner-${c}-text)`,
            borderTop: `${variant === "gallery" ? 5 : 3}px double var(--banner-${c}-line)`,
            borderBottom: `${variant === "gallery" ? 5 : 3}px double var(--banner-${c}-line)`,
            paddingBlock: variant === "gallery" ? "clamp(8px, 2cqw, 22px)" : "clamp(6px, 2.4cqw, 14px)",
            gap: "clamp(2px, 0.8cqw, 8px)",
          }}
        >
          <span
            aria-hidden="true"
            className="font-display font-semibold uppercase leading-none"
            style={{
              fontSize: variant === "gallery" ? "clamp(16px, 5.4cqw, 52px)" : "clamp(11px, 6.4cqw, 34px)",
              letterSpacing: "0.42em",
              // L'espacement suit chaque lettre, la derniere comprise :
              // compense a gauche pour un centrage optique exact.
              paddingLeft: "0.42em",
            }}
          >
            {t(`${banner.kind}_main`)}
          </span>
          <span
            aria-hidden="true"
            className="font-display font-medium leading-none"
            style={{
              fontSize: variant === "gallery" ? "clamp(11px, 2.4cqw, 22px)" : "clamp(9px, 3.4cqw, 16px)",
              fontVariantCaps: "all-small-caps",
              letterSpacing: "0.5em",
              paddingLeft: "0.5em",
            }}
          >
            {t(`${banner.kind}_signature`)}
          </span>
        </div>
      </div>
    </div>
  );
}
