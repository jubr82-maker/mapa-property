"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface HoverFlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  /**
   * Hauteur MINIMALE (classes Tailwind min-h-*). Oct. 2026 : la carte ne
   * porte plus de hauteur fixe ; elle grandit pour contenir la face
   * affichee (cf. commentaire du composant).
   */
  minHeight?: string;
  /**
   * Controlled flip state. When provided, the parent owns the flip state
   * (used for "single open at a time" accordion behaviour on mobile).
   * When omitted, the card manages its own tap toggle state.
   */
  flipped?: boolean;
  /** Called on user tap/click/Enter/Space. */
  onFlipToggle?: () => void;
  /** Accessible label for the toggle role. */
  ariaLabel?: string;
}

// useLayoutEffect cote client (mesure avant affichage), useEffect au rendu
// serveur (aucune mesure possible, pas d'avertissement).
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Carte retournable.
 *
 * Bug corrige (oct. 2026) : la carte avait une hauteur FIXE (h-52...) et ses
 * deux faces etaient posees en absolu sur cette hauteur. Une face plus
 * longue que la carte (liste du verso sur iPhone en 2 colonnes, textes
 * allemands ou anglais plus longs) debordait : texte hors du cadre, sous
 * "Fermer", par-dessus la section suivante.
 *
 * Desormais, chaque face est mesuree dans un double invisible a la meme
 * largeur (hauteur naturelle, suivie par ResizeObserver : langue, police,
 * largeur d'ecran). La hauteur de la carte est :
 *   - ecran tactile : celle de la face affichee (la carte s'agrandit a
 *     l'ouverture et se reduit a la fermeture, transition de hauteur de
 *     meme duree et meme courbe que le retournement, dans les deux sens) ;
 *   - souris (retournement au survol) : au moins la plus haute des deux
 *     faces, pour que le survol ne deplace pas la page.
 * Jamais moins que minHeight. Les faces restent coupees a la carte
 * (overflow hidden) uniquement pendant la transition.
 */
export function HoverFlipCard({
  front,
  back,
  className = "",
  minHeight = "min-h-72",
  flipped,
  onFlipToggle,
  ariaLabel,
}: HoverFlipCardProps) {
  const isControlled = typeof flipped === "boolean";
  const [internalFlipped, setInternalFlipped] = useState(false);
  const active = isControlled ? flipped : internalFlipped;

  // Le survol CSS pilote seul le retournement sur les pointeurs qui le
  // supportent (souris) : le tap/clic ne doit agir que sur écran tactile,
  // sinon un clic laisse la carte "coincee" retournee une fois le curseur
  // sorti (is-flipped force le rotateY malgre la fin du :hover).
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const frontMeasureRef = useRef<HTMLDivElement | null>(null);
  const backMeasureRef = useRef<HTMLDivElement | null>(null);
  const [sizes, setSizes] = useState<{ min: number; front: number; back: number } | null>(null);

  useIsoLayoutEffect(() => {
    const card = cardRef.current;
    const f = frontMeasureRef.current;
    const b = backMeasureRef.current;
    if (!card || !f || !b) return;
    const measure = () => {
      // Minimum des classes Tailwind (le style en ligne, s'il existe, est
      // retire le temps de la lecture pour ne pas se mesurer soi-meme).
      const inline = card.style.minHeight;
      card.style.minHeight = "";
      const min = parseFloat(getComputedStyle(card).minHeight) || 0;
      card.style.minHeight = inline;
      const next = { min, front: Math.ceil(f.offsetHeight), back: Math.ceil(b.offsetHeight) };
      setSizes((prev) =>
        prev && prev.min === next.min && prev.front === next.front && prev.back === next.back ? prev : next,
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    ro.observe(f);
    ro.observe(b);
    return () => ro.disconnect();
  }, []);

  const toggle = () => {
    if (canHover) return;
    if (isControlled) {
      onFlipToggle?.();
    } else {
      setInternalFlipped((t) => !t);
    }
  };

  // Souris : hauteur minimale = plus haute face (la carte peut s'etirer a
  // la hauteur de sa rangee, h-full cote appelant). Tactile : hauteur
  // exacte de la face affichee, animee.
  let sizeStyle: React.CSSProperties | undefined;
  if (sizes) {
    if (canHover) {
      sizeStyle = { minHeight: Math.max(sizes.min, sizes.front, sizes.back) };
    } else {
      sizeStyle = { height: Math.max(sizes.min, active ? sizes.back : sizes.front) };
    }
  }

  return (
    <div
      ref={cardRef}
      className={`flip-card relative ${minHeight} ${active ? "is-flipped" : ""} ${className}`}
      style={sizeStyle}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">{front}</div>
        <div className="flip-card-back">{back}</div>
      </div>
      {/* Doubles de mesure : invisibles, inertes, ignores par les lecteurs
          d'ecran, meme largeur que la carte, hauteur naturelle. */}
      <div aria-hidden inert className="flip-card-measure">
        <div ref={frontMeasureRef}>{front}</div>
        <div ref={backMeasureRef}>{back}</div>
      </div>
    </div>
  );
}
