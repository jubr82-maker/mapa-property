import Link from "next/link";

interface TopListItem {
  key: string;
  value: number;
  href?: string | null;
  label?: string | null;
}

interface TopListProps {
  items: TopListItem[];
  unit?: string;
  emptyLabel?: string;
}

export function TopList({ items, unit, emptyLabel = "Aucune donnée." }: TopListProps) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-[#3D4F63]/60">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ol className="space-y-2">
      {items.map((item, i) => {
        const width = Math.max(2, Math.round((item.value / max) * 100));
        const label = item.label ?? item.key;
        const content = (
          <div className="flex items-center gap-3">
            <span className="w-6 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-sans text-sm text-[#1A1F2A]">{label}</span>
                <span className="shrink-0 font-mono text-xs text-[#3D4F63]/70">
                  {new Intl.NumberFormat("fr-FR").format(item.value)}
                  {unit ? ` ${unit}` : ""}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#3D4F63]/10">
                <div
                  className="h-full rounded-full bg-[#e0af6e]"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          </div>
        );
        return (
          <li key={`${item.key}-${i}`}>
            {item.href ? (
              <Link
                href={item.href}
                className="block rounded-md px-2 py-1.5 transition-colors hover:bg-[#3D4F63]/5"
              >
                {content}
              </Link>
            ) : (
              <div className="px-2 py-1.5">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
