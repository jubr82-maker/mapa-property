// Cover confidentiel standardisé pour les biens off-market (BUG 2).
// Politique de confidentialité : sur les surfaces publiques (home,
// listing /off-market, fiche), on n'affiche JAMAIS le visuel réel —
// même flouté — d'un bien off-market. Ce cover remplace systématiquement
// l'image, qu'une image custom existe ou non en base.
//
// STEP3c-RECODE : aligne sur palette Forêt Luxembourgeoise (strict 4
// couleurs). Fond uni sapin profond #1F221A (vs radial-gradient cuivré
// avant POL2-8), cadenas cuivre citron #e0af6e, texte crème velin
// #F0E6CC opacity 0.7 pour le sous-titre confidentiel. Bordure cuivre
// citron subtile.
//
// Sprint C12-cosmetic : prop opt-in `invertOnDark` (default false)
// inverse les couleurs en dark mode UNIQUEMENT — fond crème, texte/
// cadenas sapin. Active sur les fiches de biens off-market
// (/off-market/[id]) ; les 4 autres callers (list, carousel home,
// admin) restent strictement identiques jour/nuit.
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

export function OffmarketPlaceholder({
  className = "",
  showLabel = true,
  compact = false,
  title,
  subtitle,
  invertOnDark = false,
}: {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  /** Sprint C12-cosmetic : inverse les couleurs en dark mode (fond crème,
   *  cadenas/texte sapin). Activé uniquement sur la fiche bien off-market.
   *  Light mode reste strictement identique dans tous les cas. */
  invertOnDark?: boolean;
}) {
  // Classes light mode (defaut, inchange) :
  //   - bg sapin #1F221A
  //   - border copper 20%
  //   - text copper (cadenas via currentColor + "OFF MARKET")
  //
  // Classes dark mode (uniquement si invertOnDark=true) :
  //   - bg creme #F0E6CC
  //   - border sapin 20%
  //   - text sapin (cadenas via currentColor + "OFF MARKET")
  const containerClasses = [
    "absolute inset-0 flex flex-col items-center justify-center px-4 text-center",
    "border bg-[#1F221A] border-[#e0af6e]/20 text-[#e0af6e]",
    invertOnDark
      ? "dark:bg-[#F0E6CC] dark:border-[#1F221A]/20 dark:text-[#1F221A]"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Subtitle : creme/70 en light, sapin/70 en dark si invertOnDark.
  const subtitleClasses = [
    "font-mono font-light uppercase tracking-[0.15em] text-[#F0E6CC]/70",
    invertOnDark ? "dark:text-[#1F221A]/70" : "",
    compact ? "text-[9px]" : "text-xs md:text-sm",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div data-offmarket-placeholder className={containerClasses}>
      {/* Cadenas — stroke via currentColor pour heriter du text-* parent
          (copper en light, sapin en dark si invertOnDark). */}
      <svg
        aria-hidden
        viewBox="0 0 80 80"
        className={compact ? "size-8" : "size-12 md:size-16"}
        fill="none"
        stroke="currentColor"
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
          >
            {/* "OFF MARKET" dominant — heriter du text-* parent via currentColor
                implicite (pas de color override). La prop title est conservee
                pour l'accessibilite mais le visuel impose OFF MARKET (POL2-8). */}
            OFF MARKET
          </p>

          <SignatureLine align="center" width={compact ? "w-6" : "w-8"} />

          <p data-offmarket-subtitle className={subtitleClasses}>
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
