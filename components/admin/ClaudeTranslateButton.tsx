"use client";

// Bouton "Traduire maintenant avec Claude API" (nov. 2026). L'API Claude
// n'est appelee QUE par un clic sur ce bouton (ou sur celui du resume
// d'import, qui envoie l'evenement CLAUDE_TRANSLATE_EVENT a la fiche).
// Avant l'appel : cout estime affiche ; si des champs anglais ou allemands
// sont deja remplis, confirmation AVANT l'appel. Apres : cout reel. Les
// textes sont places dans la fiche pour relecture ; rien n'est enregistre
// avant que Julien enregistre. Cle absente ou credit epuise : une phrase
// claire et "Traduire avec Mistral (gratuit)".
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { estimateTranslationUsd } from "@/lib/claude/pricing";
import type { ClaudeUsageSummary } from "@/lib/claude/usage";
import type { ListingTranslation } from "@/lib/claude/translate-listing";
import { translateWithClaude } from "@/app/admin/properties/claude-actions";
import { ClaudeUsageLine, useMoney } from "@/components/admin/ClaudeUsage";

export const CLAUDE_TRANSLATE_EVENT = "mapa-claude-translate";

export function ClaudeTranslateButton({
  source,
  filledCount,
  usage: initialUsage,
  propertyId,
  onTranslated,
  onMistral,
}: {
  source: { title: string; description: string; short: string };
  /** Champs anglais et allemands deja remplis (confirmation avant l'appel). */
  filledCount: number;
  usage: ClaudeUsageSummary;
  propertyId: string;
  onTranslated: (en: ListingTranslation, de: ListingTranslation) => number;
  onMistral: () => void;
}) {
  const t = useTranslations("admin_claude");
  const [usage, setUsage] = useState(initialUsage);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; mistral?: boolean } | null>(null);
  const money = useMoney(usage.usdPerEur);
  const empty = !source.title.trim() && !source.description.trim() && !source.short.trim();
  const estimate = estimateTranslationUsd([source.title, source.description, source.short]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  async function run() {
    if (busy || empty) return;
    setMsg(null);
    if (filledCount > 0 && !window.confirm(t("confirm_overwrite", { count: filledCount }))) return;
    setBusy(true);
    try {
      const r = await translateWithClaude({ ...source, propertyId });
      if (r.usage) setUsage(r.usage);
      if (!r.ok) return setMsg({ ok: false, text: r.costUsd ? `${r.error} ${t("cost_spent", { cost: money(r.costUsd) })}` : r.error, mistral: r.offerMistral });
      const applied = onTranslated(r.en, r.de);
      const cost = money(r.cost.usd);
      setMsg({ ok: true, text: [t("done", { count: applied, cost }), r.saved ? "" : t("not_saved_counter")].filter(Boolean).join(" ") });
    } catch {
      setMsg({ ok: false, text: t("err_network"), mistral: true });
    } finally {
      setBusy(false);
    }
  }

  // Bouton du resume d'import : amene ce bouton a l'ecran, cout estime
  // visible ; l'appel part seulement d'un clic sur ce bouton.
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const handler = () => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      buttonRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener(CLAUDE_TRANSLATE_EVENT, handler);
    return () => window.removeEventListener(CLAUDE_TRANSLATE_EVENT, handler);
  }, []);

  return (
    <div ref={rootRef} className="mt-3 space-y-1" data-claude-translate>
      <div className="flex flex-wrap items-center gap-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => void run()}
          disabled={busy || empty}
          className="rounded-full bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bg hover:bg-gold-deep disabled:opacity-50"
        >
          {busy ? t("running") : t("button")}
        </button>
        {!empty && <span className="text-xs text-ink-mid">{t("estimate", { amount: money(estimate) })}</span>}
      </div>
      <p className="text-xs text-ink-soft">{t("hint")}</p>
      {msg && (
        <div role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-700"}`}>
          <span>{msg.text}</span>
          {msg.mistral && (
            <button type="button" onClick={onMistral} className="ml-2 underline underline-offset-2">
              {t("use_mistral")}
            </button>
          )}
        </div>
      )}
      <ClaudeUsageLine usage={usage} />
    </div>
  );
}
