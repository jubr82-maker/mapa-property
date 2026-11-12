// Fenetres du bas de l'ecran (nov. 2026) : question du pays de la recherche,
// banniere des cookies. Tant qu'une de ces fenetres est ouverte, <html>
// porte data-bottom-sheet (nombre de fenetres ouvertes) et la bulle d'Elena
// et son invitation se masquent (app/globals.css), pour qu'aucun bouton de la
// fenetre ne soit recouvert. A la fermeture, la bulle revient.
import { useEffect } from "react";

const ATTR = "bottomSheet";

export function useBottomSheet(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.dataset[ATTR] = String(Number(root.dataset[ATTR] ?? 0) + 1);
    return () => {
      const n = Number(root.dataset[ATTR] ?? 1) - 1;
      if (n > 0) root.dataset[ATTR] = String(n);
      else delete root.dataset[ATTR];
    };
  }, [open]);
}
