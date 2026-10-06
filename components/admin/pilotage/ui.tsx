// Briques d'affichage des espaces du groupe Pilotage (oct. 2026).
// Aucun texte : tous les libelles arrivent traduits par les pages.
import Link from "next/link";

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <header>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-ink">{title}</h1>
      {intro ? <p className="mt-2 max-w-3xl text-sm text-ink-mid">{intro}</p> : null}
    </header>
  );
}

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <header>
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        {intro ? <p className="mt-1 max-w-3xl text-sm text-ink-mid">{intro}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <article className="min-w-0 rounded-2xl border border-ink/15 bg-bg-soft p-4 md:p-5">
      {title ? <h3 className="mb-3 font-display text-lg font-bold text-ink">{title}</h3> : null}
      {children}
    </article>
  );
}

export function Stat({ label, value, hint, tone = "neutral" }: { label: string; value: string | number; hint?: string; tone?: Tone }) {
  return (
    <div className={`min-w-0 rounded-2xl border bg-bg-soft p-4 md:p-5 ${TONE_BORDER[tone]}`} data-admin-stat>
      <p className="break-words font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft [hyphens:auto]">{label}</p>
      <p className="mt-2 break-words font-display text-3xl font-bold text-ink">{value}</p>
      {hint ? <p className="mt-1 break-words text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export type Tone = "neutral" | "ok" | "warning" | "critical";

const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-ink/15",
  ok: "border-emerald-600/40",
  warning: "border-amber-500/60",
  critical: "border-red-600/60",
};

const TONE_PILL: Record<Tone, string> = {
  neutral: "bg-ink/10 text-ink",
  ok: "bg-emerald-600/15 text-emerald-800",
  warning: "bg-amber-500/20 text-amber-900",
  critical: "bg-red-600/15 text-red-800",
};

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${TONE_PILL[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-ink/20 p-4 text-sm text-ink-mid">{children}</p>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/15 bg-bg-soft">
      <table data-card-all className="w-full text-left text-sm">
        <thead className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-2 align-top text-ink ${mono ? "font-mono text-xs" : ""}`}>{children}</td>;
}

export function GoLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink underline underline-offset-4 hover:no-underline">
      {children}
    </Link>
  );
}
