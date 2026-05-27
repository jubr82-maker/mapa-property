"use client";

// Sprint C13-ter — Multi-select 2 niveaux pour le filtre Type.
//
// UX :
//   - DropdownMenu Radix, largeur 320px, scroll vertical max-h 480px
//   - 8 catégories en accordéon (collapse par défaut)
//   - Header catégorie : Checkbox tri-state (indeterminate si certains
//     sous-types cochés) + label i18n + bouton "Voir détail" / "Voir moins"
//   - Body catégorie déplié : sous-types en liste avec Checkbox + label
//   - Footer : "Effacer" si au moins 1 case cochée
//
// Comportements clés :
//   - Click sur catégorie checkbox -> toggle TOUS les sous-types
//   - Click sur sous-type -> toggle uniquement ce sous-type
//   - Catégorie en état 'indeterminate' si certains sous-types cochés
//   - Multi-catégories autorisé (Appart + Maison + Bureau OK)
//
// Composant pure UI contrôlé (props value + onChange). Le parent gère
// l'URL state et le filtrage. Aucun fetch, aucun side effect.

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Checkbox from "@radix-ui/react-checkbox";
import { TYPE_CATALOG } from "@/lib/property-types-catalog";

interface Props {
  /** Valeurs cochées (matching values, ex. ["studio", "villa"]). */
  value: string[];
  /** Notifié à chaque toggle (catégorie ou sous-type). */
  onChange: (next: string[]) => void;
}

export function TypeFilterMultiSelect({ value, onChange }: Props) {
  const t = useTranslations("search");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const selected = useMemo(() => new Set(value), [value]);

  const toggleSubtype = (subtypeValue: string) => {
    const next = new Set(selected);
    if (next.has(subtypeValue)) next.delete(subtypeValue);
    else next.add(subtypeValue);
    onChange([...next]);
  };

  const toggleCategory = (groupKey: string) => {
    const cat = TYPE_CATALOG.find((c) => c.group === groupKey);
    if (!cat) return;
    const next = new Set(selected);
    const subtypeValues = cat.subtypes.map((s) => s.value);
    const allChecked = subtypeValues.every((v) => next.has(v));
    if (allChecked) {
      // Tout cocher actuel -> tout décocher
      for (const v of subtypeValues) next.delete(v);
    } else {
      // Sinon : tout cocher (couvre les états indeterminate + unchecked)
      for (const v of subtypeValues) next.add(v);
    }
    onChange([...next]);
  };

  const toggleExpand = (groupKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const categoryState = (groupKey: string): "all" | "some" | "none" => {
    const cat = TYPE_CATALOG.find((c) => c.group === groupKey);
    if (!cat) return "none";
    const subtypeValues = cat.subtypes.map((s) => s.value);
    const checkedCount = subtypeValues.filter((v) => selected.has(v)).length;
    if (checkedCount === 0) return "none";
    if (checkedCount === subtypeValues.length) return "all";
    return "some";
  };

  const clearAll = () => onChange([]);

  const triggerLabel =
    value.length === 0
      ? t("type_filter.all")
      : t("type_filter.selected_count", { count: value.length });

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {/* Sprint ELENA-NAV C1 : alignement strict sur les autres inputs
            du FilterBar (rounded-md border border-line bg-bg px-3 py-2
            text-sm). Label 'Type' externe via le wrapper <Field> du
            parent, plus de label embedded. Suppression h-[38px] et
            inline-flex au profit de flex (hauteur naturelle text-sm +
            py-2 = ~36px, identique aux <select>/<input> natifs). */}
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-bg px-3 py-2 text-left text-sm text-ink transition-colors hover:border-gold focus:border-gold focus:outline-none data-[state=open]:border-gold"
        >
          <span
            className={`truncate ${value.length > 0 ? "text-gold-deep" : "text-ink"}`}
          >
            {triggerLabel}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="size-3 shrink-0 text-ink-soft"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="m3 4.5 3 3 3-3" />
          </svg>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[320px] max-h-[480px] overflow-y-auto rounded-lg border border-line bg-bg shadow-lg shadow-ink/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="py-1">
            {TYPE_CATALOG.map((cat) => {
              const state = categoryState(cat.group);
              const isExpanded = expanded.has(cat.group);
              return (
                <div
                  key={cat.group}
                  className="border-b border-line/50 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-bg-soft">
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                      <Checkbox.Root
                        checked={
                          state === "all"
                            ? true
                            : state === "some"
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={() => toggleCategory(cat.group)}
                        className="flex size-4 shrink-0 items-center justify-center rounded border border-line bg-bg data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=indeterminate]:border-gold data-[state=indeterminate]:bg-gold/80"
                      >
                        <Checkbox.Indicator>
                          {state === "all" ? (
                            <svg
                              viewBox="0 0 12 12"
                              className="size-3 text-bg"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m2.5 6.5 2.5 2.5 4.5-5" />
                            </svg>
                          ) : (
                            <span className="block h-0.5 w-2.5 rounded bg-bg" />
                          )}
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <span className="text-sm font-medium text-ink">
                        {t(`type_group.${cat.groupKey}`)}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleExpand(cat.group)}
                      className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-gold"
                    >
                      {isExpanded
                        ? `▼ ${t("type_filter.see_less")}`
                        : `▸ ${t("type_filter.see_detail")}`}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-line/30 bg-bg-soft/30 px-3 py-1.5">
                      {cat.subtypes.map((sub) => {
                        const checked = selected.has(sub.value);
                        return (
                          <label
                            key={`${cat.group}-${sub.key}`}
                            className="flex cursor-pointer items-center gap-2.5 py-1.5 pl-6 pr-2 text-sm text-ink-mid hover:text-ink"
                          >
                            <Checkbox.Root
                              checked={checked}
                              onCheckedChange={() => toggleSubtype(sub.value)}
                              className="flex size-3.5 shrink-0 items-center justify-center rounded border border-line bg-bg data-[state=checked]:border-gold data-[state=checked]:bg-gold"
                            >
                              <Checkbox.Indicator>
                                <svg
                                  viewBox="0 0 12 12"
                                  className="size-2.5 text-bg"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m2.5 6.5 2.5 2.5 4.5-5" />
                                </svg>
                              </Checkbox.Indicator>
                            </Checkbox.Root>
                            <span>{t(`type_subtype.${sub.key}`)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {value.length > 0 && (
            <div className="sticky bottom-0 border-t border-line bg-bg px-3 py-2">
              <button
                type="button"
                onClick={clearAll}
                className="w-full rounded-md border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mid transition-colors hover:border-gold hover:text-gold"
              >
                {t("type_filter.clear")}
              </button>
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
