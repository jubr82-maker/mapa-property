// Bulle d'Elena (nov. 2026, audit du 12/11/2026) : elle ne recouvre JAMAIS un
// bouton. A chaque defilement, redimensionnement ou changement de la page
// (nouvelle etape d'un formulaire), si un bouton ou un lien-bouton visible
// (Suivant, Envoyer, Estimer...) passe sous la bulle, la bulle se masque ; elle
// revient des que la place est libre. Complete lib/ui/bottom-sheet.ts
// (fenetres du bas de l'ecran).
import { useEffect, useState, type RefObject } from "react";

const CONTROLS = 'button, a[role="button"], input[type="submit"], a[class*="rounded-full"], [data-primary-action]';
const MARGIN = 8;

function overlapsAControl(bubble: HTMLElement): boolean {
  const b = bubble.getBoundingClientRect();
  if (!b.width || !b.height) return false;
  for (const el of document.querySelectorAll<HTMLElement>(CONTROLS)) {
    if (el === bubble || bubble.contains(el) || el.closest("[data-chatbot-panel], [data-chatbot-invite]")) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right < b.left - MARGIN || r.left > b.right + MARGIN || r.bottom < b.top - MARGIN || r.top > b.bottom + MARGIN) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    return true;
  }
  return false;
}

/** true quand la bulle doit s'effacer pour laisser un bouton visible. */
export function useBubbleClearance(ref: RefObject<HTMLElement | null>, active: boolean): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = ref.current;
        if (el) setHidden(overlapsAControl(el));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const mo = new MutationObserver(update);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      mo.disconnect();
    };
  }, [ref, active]);
  return hidden;
}
