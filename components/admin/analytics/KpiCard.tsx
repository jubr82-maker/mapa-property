import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number | null;
  variation?: number | null;
  Icon?: LucideIcon;
  hint?: string;
  unit?: string;
}

function formatValue(v: string | number | null, unit?: string): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    const formatted = new Intl.NumberFormat("fr-FR").format(v);
    return unit ? `${formatted} ${unit}` : formatted;
  }
  return unit ? `${v} ${unit}` : v;
}

export function KpiCard({ label, value, variation, Icon, hint, unit }: KpiCardProps) {
  const variationColor =
    variation === null || variation === undefined
      ? "text-[#3D4F63]/50"
      : variation > 0
        ? "text-[#3F8F62]"
        : variation < 0
          ? "text-[#C2604B]"
          : "text-[#3D4F63]/60";

  return (
    <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-6 transition-colors hover:border-[#e0af6e]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
            {label}
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-[#3D4F63]">
            {formatValue(value, unit)}
          </p>
        </div>
        {Icon ? <Icon className="size-5 shrink-0 text-[#e0af6e]" /> : null}
      </div>
      {variation !== null && variation !== undefined ? (
        <p className={`mt-3 font-mono text-xs ${variationColor}`}>
          {variation > 0 ? "+" : ""}
          {variation.toFixed(1)}% vs période précédente
        </p>
      ) : hint ? (
        <p className="mt-3 text-xs text-[#3D4F63]/60">{hint}</p>
      ) : null}
    </div>
  );
}
