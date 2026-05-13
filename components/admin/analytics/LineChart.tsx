interface LinePoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  label?: string;
  height?: number;
}

export function LineChart({ data, label = "valeur", height = 160 }: LineChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-[#3D4F63]/60">Aucune donnée.</p>;
  }

  const W = 640;
  const H = height;
  const PAD_L = 36;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);

  const pts = data.map((d, i) => {
    const x = PAD_L + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
    const y = PAD_T + innerH - (d.value / max) * innerH;
    return { x, y, v: d.value, d: d.date };
  });

  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Area sous la courbe
  const areaPath = [
    `M ${pts[0]?.x.toFixed(1)} ${(PAD_T + innerH).toFixed(1)}`,
    ...pts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${pts[pts.length - 1]?.x.toFixed(1)} ${(PAD_T + innerH).toFixed(1)}`,
    "Z",
  ].join(" ");

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[480px]"
        role="img"
        aria-label={`Évolution ${label}`}
      >
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={PAD_T + innerH * t}
            y2={PAD_T + innerH * t}
            stroke="#3D4F63"
            strokeOpacity="0.08"
            strokeDasharray={t === 1 ? undefined : "2 4"}
          />
        ))}
        {/* Y axis labels */}
        <text
          x={PAD_L - 6}
          y={PAD_T + 4}
          textAnchor="end"
          fontFamily="var(--font-mono, monospace)"
          fontSize="9"
          fill="#3D4F63"
          opacity="0.6"
        >
          {max}
        </text>
        <text
          x={PAD_L - 6}
          y={PAD_T + innerH + 3}
          textAnchor="end"
          fontFamily="var(--font-mono, monospace)"
          fontSize="9"
          fill="#3D4F63"
          opacity="0.6"
        >
          0
        </text>
        {/* Area */}
        <path d={areaPath} fill="#B8865A" fillOpacity="0.12" />
        {/* Polyline */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#B8865A"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Points */}
        {pts.map((p) => (
          <g key={p.d}>
            <circle cx={p.x} cy={p.y} r="2.5" fill="#B8865A" />
            <title>{`${fmtDate(p.d)} : ${p.v} ${label}`}</title>
          </g>
        ))}
        {/* X axis labels */}
        {pts.map((p, i) => {
          const step = pts.length > 15 ? Math.ceil(pts.length / 6) : pts.length > 6 ? 2 : 1;
          if (i % step !== 0 && i !== pts.length - 1) return null;
          return (
            <text
              key={p.d}
              x={p.x}
              y={H - 8}
              textAnchor="middle"
              fontFamily="var(--font-mono, monospace)"
              fontSize="9"
              fill="#3D4F63"
              opacity="0.6"
            >
              {fmtDate(p.d)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
