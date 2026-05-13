type ScoreCardProps = {
  label: string;
  score: number | null;
};

function scoreColor(score: number | null): string {
  if (score === null) return "#8A8A8A";
  if (score >= 90) return "#16a34a";
  if (score >= 50) return "#ea580c";
  return "#dc2626";
}

export function ScoreCard({ label, score }: ScoreCardProps) {
  const color = scoreColor(score);
  const display = score === null ? "—" : String(score);
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-display text-3xl font-bold" style={{ color }}>
          {display}
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/40">
          /100
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#3D4F63]/10">
        <div
          className="h-full transition-[width]"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
