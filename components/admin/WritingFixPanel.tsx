"use client";

// Redaction a l'enregistrement (nov. 2026) : message discret des points de
// forme corriges automatiquement (liste depliable, avant / apres) et, pour
// les seules regles de fond, remplacement propose en un clic ("Appliquer",
// "Tout appliquer" qui corrige tout puis enregistre). Aucun texte en dur :
// libelles admin_listing.
import { useTranslations } from "next-intl";
import type { FixChange } from "@/lib/listing/writing-autofix";
import type { ContentHit } from "@/lib/listing/writing-suggest";

export type FixLogEntry = { label: string; changes: FixChange[] };
export type ContentItem = { key: string; label: string; hit: ContentHit };

export function WritingFixPanel({
  fixes,
  content,
  onApply,
  onApplyAll,
  busy,
}: {
  fixes: FixLogEntry[];
  content: ContentItem[];
  onApply: (item: ContentItem) => void;
  onApplyAll: () => void;
  busy?: boolean;
}) {
  const tl = useTranslations("admin_listing");
  const count = fixes.reduce((n, f) => n + f.changes.length, 0);
  if (!count && !content.length) return null;
  return (
    <div className="space-y-3" data-writing-fix>
      {count > 0 && (
        <details className="rounded-md border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          <summary className="cursor-pointer">{tl("fix_count", { count })}</summary>
          <ul className="mt-2 space-y-2">
            {fixes.flatMap((f) =>
              f.changes.map((c, i) => (
                <li key={`${f.label}-${i}`} className="break-words">
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-800/80">{f.label}</span>
                  <span className="block">
                    <span className="text-emerald-800/70">{tl("fix_before")} </span>
                    {c.before}
                  </span>
                  <span className="block">
                    <span className="text-emerald-800/70">{tl("fix_after")} </span>
                    {c.after}
                  </span>
                </li>
              )),
            )}
          </ul>
        </details>
      )}
      {content.length > 0 && (
        <div className="rounded-md border border-red-600/30 bg-white px-3 py-2 text-sm" role="alert">
          <p className="font-medium text-red-800">{tl("content_title", { count: content.length })}</p>
          <ul className="mt-2 space-y-2">
            {content.map((c) => (
              <li key={`${c.key}-${c.hit.start}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-red-600/10 pt-2 first:border-0 first:pt-0">
                <span className="min-w-0 flex-1 break-words text-ink">
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">{c.label}</span>
                  <span className="block">{tl("content_item", { match: c.hit.match, replacement: c.hit.replacement })}</span>
                  <span className="block text-xs text-ink-soft">{c.hit.excerpt}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onApply(c)}
                  disabled={busy}
                  className="rounded-full border border-ink/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink hover:border-gold disabled:opacity-50"
                >
                  {tl("content_apply")}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onApplyAll}
            disabled={busy}
            className="mt-3 rounded-full bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bg hover:bg-gold-deep disabled:opacity-50"
          >
            {tl("content_apply_all")}
          </button>
        </div>
      )}
    </div>
  );
}
