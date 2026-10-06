"use client";

// Filtres et tri des listes de l'admin (oct. 2026). Ordinateur : affiches
// en ligne, comme avant. Telephone (sous 768 px) : replies derriere un
// bouton "Filtres et tri" qui ouvre le panneau, pour laisser la place aux
// cartes de la liste.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";

export function AdminFilterPanel({ children, active = 0 }: { children: React.ReactNode; active?: number }) {
  const t = useTranslations("admin_nav");
  const [open, setOpen] = useState(false);
  return (
    <div data-admin-filters>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink/20 bg-bg-soft px-4 py-3 text-base font-semibold text-ink md:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-5" aria-hidden />
          {open ? t("filters_close") : t("filters_open")}
        </span>
        {active > 0 && (
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-[14px] text-bg">{t("filters_active", { count: active })}</span>
        )}
      </button>
      <div className={`${open ? "mt-3 block" : "hidden"} space-y-3 md:mt-0 md:block`}>{children}</div>
    </div>
  );
}

/**
 * Telephone seulement (seconde passe, oct. 2026) : le tri d'une liste,
 * affiche ailleurs sur ordinateur, regroupe dans le panneau "Filtres et
 * tri". Sur ordinateur, rien n'est rendu ici.
 */
export function AdminMobileFilterPanel({ children, active = 0 }: { children: React.ReactNode; active?: number }) {
  return (
    <div className="md:hidden" data-admin-mobile-sort>
      <AdminFilterPanel active={active}>{children}</AdminFilterPanel>
    </div>
  );
}
