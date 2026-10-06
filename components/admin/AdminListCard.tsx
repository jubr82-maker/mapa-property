// Carte compacte des listes de l'admin sur telephone (seconde passe,
// oct. 2026) : vignette a gauche, titre, une ligne d'essentiel, puis
// interrupteurs et actions sur une ligne chacun. Aucun texte en dur : tout
// arrive traduit par l'appelant. Les vignettes sont des <img> simples
// (64 px, chargement differe) : l'adresse peut venir d'un hote non
// optimise par next/image (couvertures du blog).
export function AdminListCard({
  thumb,
  title,
  titleHref,
  meta,
  sub,
  badge,
  controls,
  actions,
}: {
  /** undefined : pas de vignette ; null ou "" : emplacement vide. */
  thumb?: string | null;
  title: string;
  titleHref?: string;
  meta?: string;
  sub?: string;
  badge?: React.ReactNode;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-ink/15 bg-bg-soft p-3" data-admin-list-card>
      <div className="flex min-w-0 flex-nowrap gap-3">
        {thumb !== undefined && (
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-ink/10">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            ) : null}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-nowrap items-start justify-between gap-2">
            {titleHref ? (
              <a href={titleHref} className="min-w-0 truncate text-[16px] font-semibold text-ink underline-offset-4 hover:underline">
                {title}
              </a>
            ) : (
              <p className="min-w-0 truncate text-[16px] font-semibold text-ink">{title}</p>
            )}
            {badge ? <span className="shrink-0">{badge}</span> : null}
          </div>
          {meta ? <p className="truncate text-[14px] text-ink-mid">{meta}</p> : null}
          {sub ? <p className="truncate font-mono text-[14px] text-ink-mid">{sub}</p> : null}
        </div>
      </div>
      {controls ? (
        <div className="mt-2 flex flex-nowrap items-center gap-4 overflow-x-auto" data-admin-card-controls>
          {controls}
        </div>
      ) : null}
      {actions ? (
        <div className="mt-2 border-t border-ink/10 pt-2" data-admin-card-actions>
          {actions}
        </div>
      ) : null}
    </li>
  );
}
