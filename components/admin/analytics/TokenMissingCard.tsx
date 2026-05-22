interface TokenMissingCardProps {
  title: string;
  envVars: string[];
  configUrl: string;
  instructions?: string;
}

export function TokenMissingCard({
  title,
  envVars,
  configUrl,
  instructions,
}: TokenMissingCardProps) {
  return (
    <div className="rounded-lg border border-dashed border-[#3D4F63]/25 bg-[#F5EFE1] p-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          🔑
        </span>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#e0af6e]">
            Token manquant
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">{title}</h3>
          <p className="mt-2 text-sm text-[#3D4F63]/70">
            Configurer ce token pour activer cette section.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {envVars.map((v) => (
              <li
                key={v}
                className="rounded-md bg-white px-2 py-1 font-mono text-[11px] text-[#3D4F63]"
              >
                {v}
              </li>
            ))}
          </ul>
          {instructions ? (
            <p className="mt-3 text-xs text-[#3D4F63]/60">{instructions}</p>
          ) : null}
          <a
            href={configUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#3D4F63] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e]"
          >
            Configurer →
          </a>
        </div>
      </div>
    </div>
  );
}
