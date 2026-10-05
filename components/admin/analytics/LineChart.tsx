import { formatDayMonth } from "@/lib/datetime";
interface LinePoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  /** Libelle traduit de la serie (accessibilite et infobulles). */
  label?: string;
  /** Message traduit affiche quand la serie est vide. */
  emptyLabel?: string;
  height?: number;
}

type Layout = { W: number; H: number; padL: number; padB: number; font: number; maxXLabels: number };

// Deux tracés (oct. 2026) : bureau (640 unites, texte 9) et telephone (340
// unites, texte 14, trois dates au plus). Sur telephone le graphique occupe
// la largeur disponible (environ 340 px ou plus) : une unite vaut au moins
// un pixel, donc le texte fait au moins 14 px, sans aucun defilement
// horizontal.
const DESKTOP: Layout = { W: 640, H: 0, padL: 36, padB: 28, font: 9, maxXLabels: 7 };
const MOBILE: Layout = { W: 340, H: 0, padL: 44, padB: 36, font: 14, maxXLabels: 3 };

export function LineChart({ data, label = "", height = 160, emptyLabel = "" }: LineChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-[#3D4F63]/60">{emptyLabel}</p>;
  }
  return (
    <div className="w-full min-w-0">
      <div className="hidden md:block">
        <ChartSvg data={data} label={label} layout={{ ...DESKTOP, H: height }} />
      </div>
      <div className="md:hidden">
        <ChartSvg data={data} label={label} layout={{ ...MOBILE, H: Math.round(height * 1.25) }} />
      </div>
    </div>
  );
}

function ChartSvg({ data, label, layout }: { data: LinePoint[]; label: string; layout: Layout }) {
  const { W, H, font } = layout;
  const PAD_L = layout.padL;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = layout.padB;
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

  const fmtDate = (iso: string) => formatDayMonth(iso) || iso;
  const step = Math.max(1, Math.ceil(pts.length / layout.maxXLabels));

  return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={label}
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
          fontSize={font}
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
          fontSize={font}
          fill="#3D4F63"
          opacity="0.6"
        >
          0
        </text>
        {/* Area */}
        <path d={areaPath} fill="#e0af6e" fillOpacity="0.12" />
        {/* Polyline */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#e0af6e"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Points */}
        {pts.map((p) => (
          <g key={p.d}>
            <circle cx={p.x} cy={p.y} r="2.5" fill="#e0af6e" />
            <title>{`${fmtDate(p.d)} : ${p.v} ${label}`}</title>
          </g>
        ))}
        {/* X axis labels */}
        {pts.map((p, i) => {
          const last = i === pts.length - 1;
          if (!last && (i % step !== 0 || pts.length - 1 - i < step / 2)) return null;
          return (
            <text
              key={p.d}
              x={p.x}
              y={H - 8}
              textAnchor={i === 0 ? "start" : last ? "end" : "middle"}
              fontFamily="var(--font-mono, monospace)"
              fontSize={font}
              fill="#3D4F63"
              opacity="0.6"
            >
              {fmtDate(p.d)}
            </text>
          );
        })}
      </svg>
  );
}
