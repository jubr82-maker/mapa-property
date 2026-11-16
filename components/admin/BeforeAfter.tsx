"use client";

/**
 * Comparaison avant / apres d'une photo (nov. 2026) : glissiere (souris,
 * doigt ou clavier) et bascule « Avant » / « Apres ». Les deux images sont
 * superposees a l'identique ; la photo amelioree est decouverte a droite du
 * curseur.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const t = useTranslations("admin_properties");
  const [pos, setPos] = useState(50);
  const btn = (active: boolean) =>
    `min-h-11 rounded-full px-4 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${active ? "bg-ink text-bg" : "border border-ink/25 text-ink hover:border-gold"}`;
  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-bg-deep select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={t("enhance_before")} className="absolute inset-0 size-full object-contain" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt={t("enhance_after")} className="absolute inset-0 size-full object-contain" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} draggable={false} />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-bg shadow" style={{ left: `${pos}%` }} />
        <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-bg">{t("enhance_before")}</span>
        <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-bg">{t("enhance_after")}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={t("enhance_slider")}
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPos(100)} className={btn(pos === 100)}>
          {t("enhance_before")}
        </button>
        <button type="button" onClick={() => setPos(50)} className={btn(pos === 50)}>
          {t("enhance_compare")}
        </button>
        <button type="button" onClick={() => setPos(0)} className={btn(pos === 0)}>
          {t("enhance_after")}
        </button>
      </div>
    </div>
  );
}
