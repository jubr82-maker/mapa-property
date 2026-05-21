// Cover confidentiel standardisé pour les biens off-market (BUG 2).
// Politique de confidentialité : sur les surfaces publiques (home,
// listing /off-market, fiche), on n'affiche JAMAIS le visuel réel —
// même flouté — d'un bien off-market. Ce cover remplace systématiquement
// l'image, qu'une image custom existe ou non en base.
//
// STEP3c-RECODE : aligne sur palette Forêt Luxembourgeoise (strict 4
// couleurs). Fond uni sapin profond #1F221A (vs radial-gradient cuivré
// avant POL2-8), cadenas cuivre citron #D4A574, texte crème velin
// #F0E6CC opacity 0.7 pour le sous-titre confidentiel. Bordure cuivre
// citron subtile. Identique jour/nuit (cover confidentiel, hors thème).
//
// "OFF MARKET" dominant (text-5xl md:text-7xl) > SignatureLine cuivre >
// "BIEN STRICTEMENT CONFIDENTIEL" (text-xs md:text-sm). La hiérarchie
// typographique préservée (POL2-8).
//
// Composant pur (aucun import next-intl) : utilisable côté serveur ET
// client. Les libellés traduits sont passés en props par l'appelant
// (namespace `offmarket` → `cover_title` / `cover_subtitle`).
//
// `showLabel={false}` conservé pour rétro-compat de la vignette admin
// (app/admin/offmarket/page.tsx — fichier géré par Julien, non modifié).

import { SignatureLine } from "@/components/ui/SignatureLine";

// STEP3c-RECODE : fond uni sapin profond + couleurs Forêt strict.
const SAPIN_BG = "#1F221A";
const COPPER = "#D4A574"; // cuivre citron — palette Forêt
const CREME = "#F0E6CC"; // crème velin — palette Forêt

export function OffmarketPlaceholder({
  className = "",
  showLabel = true,
  compact = false,
  title,
  subtitle,
}: {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      data-offmarket-placeholder
      className={`absolute inset-0 flex flex-col items-center justify-center px-4 text-center ${className}`}
      style={{
        backgroundColor: SAPIN_BG,
        border: `1px solid rgba(212, 165, 116, 0.2)`,
      }}
    >
      {/* Cadenas cuivre fin centré */}
      <svg
        aria-hidden
        viewBox="0 0 80 80"
        className={compact ? "size-8" : "size-12 md:size-16"}
        fill="none"
        stroke={COPPER}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="15" y="35" width="50" height="35" rx="4" />
        <path d="M25 35V22a15 15 0 0 1 30 0v13" />
      </svg>

      {showLabel && (
        <>
          <p
            data-offmarket-title
            className={`mt-5 font-mono font-light uppercase tracking-[0.2em] ${
              compact ? "text-xl" : "text-5xl md:text-7xl"
            }`}
            style={{ color: COPPER }}
          >
            {/* "OFF MARKET" dominant — la prop title (cover_title) est conservée
                pour l'accessibilité / rétro-compat mais le visuel impose
                l'identité OFF MARKET demandée par POL2-8. */}
            OFF MARKET
          </p>

          <SignatureLine align="center" width={compact ? "w-6" : "w-8"} />

          <p
            data-offmarket-subtitle
            className={`font-mono font-light uppercase tracking-[0.15em] ${
              compact ? "text-[9px]" : "text-xs md:text-sm"
            }`}
            style={{ color: CREME, opacity: 0.7 }}
          >
            {title ?? "Bien strictement confidentiel"}
          </p>
          {subtitle && subtitle !== "Off Market" && (
            <span className="sr-only">{subtitle}</span>
          )}
        </>
      )}
    </div>
  );
}
