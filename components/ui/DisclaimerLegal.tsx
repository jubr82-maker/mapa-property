"use client";

/**
 * DisclaimerLegal v2 — mention non contractuelle unifiée (sprint juridique).
 *
 * 2 variantes :
 *  - "short" (defaut) : 1 ligne, bas des outils (estimation, simulateurs,
 *    marchés actifs, fiches). Italique, discret.
 *  - "full" : version longue (CGU), titre + 3 paragraphes, liste les
 *    professionnels competents (notaire/banque/fiscal/avocat).
 *
 * Julien = agent immobilier carte pro (intermediation) — PAS courtier
 * credit, fiscaliste, banquier, juriste ni notaire. Le disclaimer borne
 * la responsabilite hors de ces champs.
 *
 * i18n namespace "disclaimer" (FR/EN/DE). Client component (useTranslations)
 * → utilisable dans server ET client. Couleur via token adaptatif
 * text-ink-soft (creme/55 en nuit, sapin/55 en jour) — un creme fixe
 * serait invisible sur fond creme en mode jour. Palette Forêt.
 */

import { useTranslations } from "next-intl";

export function DisclaimerLegal({
  variant = "short",
  className = "",
}: {
  variant?: "short" | "full";
  className?: string;
}) {
  const t = useTranslations("disclaimer");

  if (variant === "full") {
    return (
      <aside
        role="note"
        aria-label={t("full.title")}
        className={`rounded-lg border border-line bg-bg-soft px-5 py-4 text-sm leading-relaxed text-ink-mid ${className}`}
      >
        <p className="font-mono uppercase tracking-[0.18em] text-ink">
          {t("full.title")}
        </p>
        <p className="mt-3">{t("full.p1")}</p>
        <p className="mt-3">{t("full.p2")}</p>
        <p className="mt-3">{t("full.p3")}</p>
      </aside>
    );
  }

  return (
    <aside
      role="note"
      aria-label={t("full.title")}
      className={`max-w-prose text-xs italic leading-relaxed text-ink-soft ${className}`}
    >
      {t("short")}
    </aside>
  );
}
