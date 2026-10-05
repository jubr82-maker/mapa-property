"use client";

// Tableaux de l'admin en cartes sur telephone (oct. 2026), sans toucher a
// chaque page : ce composant, monte une fois dans la coque de l'admin,
// annote les cellules (data-label = intitule de leur colonne) et la feuille
// app/admin/admin-mobile.css les affiche, sous 768 px, comme une carte
// par ligne : intitule au-dessus de chaque valeur, aucune colonne coupee.
//
// Par carte : la cellule principale en grand, les cellules essentielles
// visibles, le reste replie derriere "Afficher le detail" (toucher la
// carte, hors lien ou bouton). Reglages facultatifs sur la balise <table> :
//   data-card-primary="3"     colonne affichee en grand (1 par defaut)
//   data-card-keep="2,3,7"    colonnes toujours visibles (defaut : 1, 2, 3
//                             et la derniere, souvent les actions)
//   data-card-all             tout visible (formulaires, petits tableaux)
//   data-no-cards             tableau laisse tel quel (rendu propre ailleurs)
// Seuls des attributs sont poses : React reste maitre des elements.
import { useEffect } from "react";
import { useTranslations } from "next-intl";

const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role='button'], [role='switch']";

function headerLabels(table: HTMLTableElement): string[] {
  const row = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!row) return [];
  const labels: string[] = [];
  for (const cell of Array.from(row.cells)) {
    const text = (cell.textContent ?? "").replace(/\s+/g, " ").trim();
    for (let i = 0; i < Math.max(1, cell.colSpan); i++) labels.push(text);
  }
  return labels;
}

function parseCols(value: string | undefined): Set<number> | null {
  if (!value) return null;
  const cols = value.split(",").map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0);
  return cols.length ? new Set(cols) : null;
}

function setAttr(el: Element, name: string, value: string | null) {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

function annotate(root: ParentNode, more: string, less: string) {
  for (const table of Array.from(root.querySelectorAll<HTMLTableElement>("table:not([data-no-cards])"))) {
    const labels = headerLabels(table);
    const total = labels.length;
    const all = table.hasAttribute("data-card-all");
    const primary = Number(table.dataset.cardPrimary ?? 1) || 1;
    const keep = parseCols(table.dataset.cardKeep) ?? new Set([1, 2, 3, total]);
    setAttr(table, "data-cards", "");
    for (const body of Array.from(table.tBodies)) {
      for (const tr of Array.from(body.rows)) {
        let col = 1;
        let folded = 0;
        for (const td of Array.from(tr.cells)) {
          const span = Math.max(1, td.colSpan);
          const full = span > 1 || total === 0;
          setAttr(td, "data-label", full ? null : labels[col - 1] || null);
          setAttr(td, "data-card-primary", !full && col === primary ? "" : null);
          const fold = !all && !full && !keep.has(col) && col !== primary;
          setAttr(td, "data-card-fold", fold ? "" : null);
          if (fold && (td.textContent ?? "").trim() !== "") folded++;
          col += span;
        }
        setAttr(tr, "data-card", "");
        setAttr(tr, "data-card-has-fold", folded > 0 ? "" : null);
        setAttr(tr, "data-more-label", more);
        setAttr(tr, "data-less-label", less);
      }
    }
  }
}

export function AdminTableCards() {
  const t = useTranslations("admin_nav");
  const more = t("card_more");
  const less = t("card_less");

  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-admin-main]");
    if (!main) return;
    let frame = 0;
    const run = () => {
      frame = 0;
      annotate(main, more, less);
    };
    run();
    const observer = new MutationObserver(() => {
      if (!frame) frame = window.requestAnimationFrame(run);
    });
    observer.observe(main, { childList: true, subtree: true });

    // Toucher une carte (hors element interactif) deplie ou replie le detail.
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || target.closest(INTERACTIVE)) return;
      const tr = target.closest("tr[data-card][data-card-has-fold]");
      if (!tr || !main.contains(tr)) return;
      if (!window.matchMedia("(max-width: 767.98px)").matches) return;
      if (tr.hasAttribute("data-card-open")) tr.removeAttribute("data-card-open");
      else tr.setAttribute("data-card-open", "");
    };
    main.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      main.removeEventListener("click", onClick);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [more, less]);

  return null;
}
