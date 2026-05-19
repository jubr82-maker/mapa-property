/**
 * DisclaimerLegal — mention légale obligatoire sur tout simulateur /
 * estimation MAPA Property (POL2-6).
 *
 * Contenu EXACT requis (non traduit — mention légale figée, identique
 * FR/EN/DE par exigence du brief). Sources de données autorisées
 * limitativement : STATEC, Observatoire de l'Habitat, ABBL, BCL.
 *
 * Server Component (texte statique, pas de hook/state) — tokens couleur
 * Tailwind uniquement, aucun hexa en dur, aucun emoji.
 */
export function DisclaimerLegal({ className = "" }: { className?: string }) {
  return (
    <aside
      role="note"
      aria-label="Mentions légales estimation"
      className={`rounded-lg border border-line bg-bg-soft px-4 py-3 text-xs leading-relaxed text-ink-soft ${className}`}
    >
      <p className="font-mono uppercase tracking-[0.18em] text-ink-mid">
        Informations non contractuelles.
      </p>
      <p className="mt-1.5">
        Sources : STATEC, Observatoire de l&apos;Habitat, ABBL, BCL.
      </p>
      <p className="mt-1.5">
        MAPA Property ne peut être tenu responsable d&apos;aucune erreur ou
        décision prise sur ces estimations. Validation par professionnel agréé
        requise (banque, notaire, courtier).
      </p>
    </aside>
  );
}
