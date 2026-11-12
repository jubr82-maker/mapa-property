// Formulaires a plusieurs etapes (nov. 2026) : fonction PARTAGEE par tous les
// formulaires a etapes du site (aujourd'hui components/forms/EstimateForm.tsx,
// le seul formulaire public a plusieurs etapes ; tout nouveau formulaire a
// etapes doit l'utiliser).
//  - a chaque "Suivant" et "Retour" : remontee douce au HAUT de la nouvelle
//    etape, en tenant compte de l'en-tete fixe, puis focus sur le premier
//    champ a remplir (sinon le premier bouton de choix, sinon le premier
//    champ) ;
//  - champ obligatoire en erreur : remontee au PREMIER champ en erreur, avec
//    le focus ;
//  - "reduire les animations" active : remontee sans animation.
import { useEffect, useRef, type RefObject } from "react";

const FIELDS = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])";
const CHOICES = "[role=radio], [role=option], button[aria-pressed], [role=radiogroup] button";
const MARGIN = 16;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Hauteur de l'en-tete fixe ou colle en haut de l'ecran (0 sinon). */
function headerOffset(): number {
  let max = 0;
  for (const el of document.querySelectorAll<HTMLElement>("header, [data-fixed-header]")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    const r = el.getBoundingClientRect();
    if (r.top <= 1 && r.bottom > 0 && r.height < window.innerHeight / 2) max = Math.max(max, r.bottom);
  }
  return max;
}

function visible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

function isEmpty(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox" || el.type === "radio") return !el.checked;
    return el.value.trim() === "";
  }
  if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) return el.value.trim() === "";
  return false;
}

/** Remonte la page pour que `el` apparaisse sous l'en-tete fixe, puis le focus. */
export function scrollToAndFocus(target: HTMLElement, focusEl: HTMLElement | null = target): void {
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset() - MARGIN;
  window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? "auto" : "smooth" });
  focusEl?.focus({ preventScroll: true });
}

/** Premier champ a remplir de l'etape, sinon premier bouton de choix, sinon premier champ. */
export function firstFieldToFill(container: HTMLElement): HTMLElement | null {
  const fields = [...container.querySelectorAll<HTMLElement>(FIELDS)].filter(visible);
  const empty = fields.find((f) => !(f instanceof HTMLInputElement && (f.type === "checkbox" || f.type === "radio")) && isEmpty(f));
  if (empty) return empty;
  const choice = [...container.querySelectorAll<HTMLElement>(CHOICES)].find(visible);
  return choice ?? fields[0] ?? null;
}

/** Premier champ en erreur (aria-invalid), sinon premier champ obligatoire vide. */
export function firstFieldInError(container: HTMLElement): HTMLElement | null {
  const invalid = [...container.querySelectorAll<HTMLElement>("[aria-invalid=true]")].find(visible);
  if (invalid) return invalid;
  const required = [...container.querySelectorAll<HTMLElement>("[aria-required=true], [required]")].filter(visible);
  return required.find(isEmpty) ?? null;
}

/** Nouvelle etape affichee : haut de l'etape, focus sur le premier champ a remplir. */
export function revealStep(container: HTMLElement | null): void {
  if (!container) return;
  scrollToAndFocus(container, firstFieldToFill(container));
}

/** Champ obligatoire en erreur : remontee au premier, avec le focus. Renvoie true si trouve. */
export function revealFirstError(container: HTMLElement | null): boolean {
  if (!container) return false;
  const el = firstFieldInError(container);
  if (!el) return false;
  const block = (el.closest("label, [data-field]") as HTMLElement | null) ?? el;
  scrollToAndFocus(block, el);
  return true;
}

/**
 * A chaque changement d'etape (jamais au premier affichage), appelle
 * revealStep apres le rendu de la nouvelle etape.
 */
export function useStepReveal(step: unknown, ref: RefObject<HTMLElement | null>): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = requestAnimationFrame(() => revealStep(ref.current));
    return () => cancelAnimationFrame(id);
  }, [step, ref]);
}
