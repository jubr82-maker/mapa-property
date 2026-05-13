type Metric = "lcp" | "fid" | "cls" | "fcp" | "ttfb";

type Props = {
  metric: Metric;
  value: number | null;
};

type Thresholds = { good: number; ni: number };

// Valeurs en millisecondes pour LCP/FID/FCP/TTFB ; CLS sans unité (score).
const T: Record<Metric, Thresholds> = {
  lcp: { good: 2500, ni: 4000 },
  fid: { good: 100, ni: 300 },
  cls: { good: 0.1, ni: 0.25 },
  fcp: { good: 1800, ni: 3000 },
  ttfb: { good: 800, ni: 1800 },
};

const LABELS: Record<Metric, string> = {
  lcp: "LCP",
  fid: "FID",
  cls: "CLS",
  fcp: "FCP",
  ttfb: "TTFB",
};

function classify(metric: Metric, value: number | null): "good" | "ni" | "poor" | "na" {
  if (value === null || value === undefined || Number.isNaN(value)) return "na";
  const t = T[metric];
  if (value <= t.good) return "good";
  if (value <= t.ni) return "ni";
  return "poor";
}

function colorFor(level: "good" | "ni" | "poor" | "na"): string {
  if (level === "good") return "#16a34a";
  if (level === "ni") return "#ea580c";
  if (level === "poor") return "#dc2626";
  return "#8A8A8A";
}

function formatValue(metric: Metric, value: number | null): string {
  if (value === null || value === undefined) return "—";
  if (metric === "cls") {
    return value.toFixed(3);
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }
  return `${Math.round(value)} ms`;
}

export function WebVitalBadge({ metric, value }: Props) {
  const level = classify(metric, value);
  const color = colorFor(level);
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-[#3D4F63]/15 bg-white px-2.5 py-1.5">
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {LABELS[metric]}
      </span>
      <span className="font-sans text-xs font-medium" style={{ color }}>
        {formatValue(metric, value)}
      </span>
    </div>
  );
}
