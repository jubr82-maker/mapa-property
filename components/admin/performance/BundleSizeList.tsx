type Route = { path: string; sizeKb: number };

type Props = {
  routes: Route[];
};

export function BundleSizeList({ routes }: Props) {
  if (routes.length === 0) {
    return (
      <p className="text-sm text-[#3D4F63]/60">
        Aucune route détectée dans le build manifest.
      </p>
    );
  }
  const max = routes.reduce((acc, r) => Math.max(acc, r.sizeKb), 0) || 1;
  return (
    <ol className="space-y-3">
      {routes.map((r, i) => {
        const pct = Math.max(2, Math.round((r.sizeKb / max) * 100));
        const color = r.sizeKb >= 500 ? "#dc2626" : r.sizeKb >= 250 ? "#ea580c" : "#16a34a";
        return (
          <li key={`${r.path}-${i}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50 w-6 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <code className="truncate font-mono text-xs text-[#1A1F2A]">{r.path}</code>
              </div>
              <span className="font-mono text-xs font-medium text-[#3D4F63]">
                {r.sizeKb.toLocaleString("fr-FR")} kB
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#3D4F63]/10">
              <div
                className="h-full transition-[width]"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
