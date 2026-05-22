interface PieSlice {
  key: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  slices: PieSlice[];
  totalLabel?: string;
}

const DEFAULT_PALETTE = ["#3D4F63", "#e0af6e", "#5B7B9E", "#A88B5F", "#3F8F62", "#C2604B"];

export function PieChart({ slices, totalLabel = "Total" }: PieChartProps) {
  const filtered = slices.filter((s) => s.value > 0);
  const total = filtered.reduce((acc, s) => acc + s.value, 0);

  if (total === 0) {
    return <p className="text-sm text-[#3D4F63]/60">Aucune donnée.</p>;
  }

  const R = 56;
  const C = 2 * Math.PI * R;
  // Pre-calcul offsets sans mutation (reduce → tableau d'offsets cumulés)
  const offsets = filtered.reduce<number[]>((acc, s, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + (filtered[i - 1].value / total) * C;
    acc.push(prev);
    return acc;
  }, []);
  const segments = filtered.map((s, i) => {
    const frac = s.value / total;
    const length = frac * C;
    return {
      key: s.key,
      value: s.value,
      frac,
      dashArray: `${length} ${C - length}`,
      dashOffset: -offsets[i],
      color: s.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
    };
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        <circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke="#3D4F63"
          strokeOpacity="0.08"
          strokeWidth="20"
        />
        {segments.map((s) => (
          <circle
            key={s.key}
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="20"
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text
          x="80"
          y="78"
          textAnchor="middle"
          fontFamily="var(--font-display, serif)"
          fontSize="24"
          fontWeight="700"
          fill="#3D4F63"
        >
          {new Intl.NumberFormat("fr-FR").format(total)}
        </text>
        <text
          x="80"
          y="98"
          textAnchor="middle"
          fontFamily="var(--font-mono, monospace)"
          fontSize="9"
          letterSpacing="2"
          fill="#3D4F63"
          opacity="0.6"
        >
          {totalLabel.toUpperCase()}
        </text>
      </svg>
      <ul className="flex-1 min-w-[180px] space-y-2">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="capitalize text-[#1A1F2A]">{s.key}</span>
            </span>
            <span className="font-mono text-xs text-[#3D4F63]/70">
              {new Intl.NumberFormat("fr-FR").format(s.value)} · {Math.round(s.frac * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
