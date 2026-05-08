import { sbUrl } from "@/lib/supabase-url";

export interface LegalSection {
  heading?: string;
  paragraphs: string[];
  bullets?: string[];
}

interface Props {
  eyebrow: string;
  title: string;
  updatedAt: string;
  pdfFile?: string; // path inside Documents bucket
  pdfLabel?: string;
  disclaimer?: string;
  intro?: string[];
  sections: LegalSection[];
  copyright?: string;
}

export function LegalLayout({
  eyebrow,
  title,
  updatedAt,
  pdfFile,
  pdfLabel,
  disclaimer,
  intro,
  sections,
  copyright,
}: Props) {
  return (
    <article className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl font-black leading-tight tracking-tight text-ink sm:text-6xl">
            {title}
          </h1>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            {updatedAt}
          </p>
          {pdfFile && (
            <a
              href={sbUrl("Documents", pdfFile)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-bg-soft px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep hover:border-gold hover:text-gold"
            >
              <span aria-hidden>↓</span>
              {pdfLabel ?? "Télécharger le PDF officiel"}
            </a>
          )}
        </header>

        {disclaimer && (
          <aside className="mb-10 rounded-xl border border-accent-warm/40 bg-accent-warm/5 p-5 text-sm leading-relaxed text-ink-mid">
            <p className="font-display text-base font-bold text-ink">⚠ Avis</p>
            <p className="mt-2 italic">{disclaimer}</p>
          </aside>
        )}

        {intro && intro.length > 0 && (
          <div className="mb-10 space-y-3 text-base leading-relaxed text-ink-mid">
            {intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        <div className="space-y-10">
          {sections.map((section, idx) => (
            <section key={idx} className="space-y-3 text-sm leading-relaxed text-ink-mid">
              {section.heading && (
                <h2 className="font-display text-xl font-bold text-ink">
                  {section.heading}
                </h2>
              )}
              {section.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {section.bullets && (
                <ul className="ml-5 list-disc space-y-1">
                  {section.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {copyright && (
          <p className="mt-12 font-mono text-[11px] leading-relaxed text-ink-soft">
            {copyright}
          </p>
        )}
      </div>
    </article>
  );
}
