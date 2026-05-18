// Cover confidentiel standardisé pour les biens off-market (BUG 2).
// Politique de confidentialité : sur les surfaces publiques (home,
// listing /off-market, fiche), on n'affiche JAMAIS le visuel réel —
// même flouté — d'un bien off-market. Ce cover remplace systématiquement
// l'image, qu'une image custom existe ou non en base.
//
// Composant pur (aucun import next-intl) : utilisable côté serveur ET
// client. Les libellés traduits sont passés en props par l'appelant
// (namespace `offmarket` → `cover_title` / `cover_subtitle`). Les
// fallbacks restent en dur uniquement comme garde-fou si une clé manque.
//
// `showLabel={false}` conservé pour rétro-compat de la vignette admin
// (app/admin/offmarket/page.tsx — fichier géré par Julien, non modifié).

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
      className={`absolute inset-0 flex flex-col items-center justify-center bg-bg-contrast px-4 text-center ${className}`}
    >
      {/* Cadre or fin — effet plaque confidentielle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-sm ring-1 ring-gold/30"
      />

      <svg
        aria-hidden
        viewBox="0 0 80 80"
        className={`text-gold ${compact ? "size-9" : "size-14 md:size-20"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="15" y="35" width="50" height="35" rx="4" />
        <path d="M25 35V22a15 15 0 0 1 30 0v13" />
      </svg>

      {showLabel && (
        <>
          <p
            className={`mt-4 font-display font-bold uppercase tracking-[0.25em] text-gold ${
              compact ? "text-[11px]" : "text-base md:text-2xl"
            }`}
          >
            {title ?? "Bien strictement confidentiel"}
          </p>
          <p
            className={`mt-2 font-mono uppercase tracking-[0.4em] text-text-contrast/55 ${
              compact ? "text-[8px]" : "text-[10px] md:text-xs"
            }`}
          >
            {subtitle ?? "Off Market"}
          </p>
        </>
      )}
    </div>
  );
}
