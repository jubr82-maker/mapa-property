// ABATTEMENT PRIX ANNONCE -> PRIX DE VENTE : SOURCE UNIQUE DU DEPOT.
// Tout abattement entre prix affiche par les vendeurs et prix de vente reel
// doit etre defini ICI et nulle part ailleurs (mission oct. 2026).

/**
 * Maisons : abattement de 7 % sur le prix annonce au m2.
 *
 * Auteur : Julien Brebion, MAPA Property (regle professionnelle, oct. 2026).
 * Justification : l'Observatoire de l'Habitat ne publie pas de prix de vente
 * au m2 des maisons par commune (les actes notaries ne portent pas la
 * surface). Le prix de vente se deduit donc des prix annonces par commune,
 * diminues de 7 %.
 *
 * Ne s'applique QU'AUX MAISONS. Les appartements disposent de prix notaries
 * reels par commune : aucun abattement.
 *
 * Ajustement : modifier cette seule valeur (0.07 = 7 %).
 */
export const HOUSE_ANNOUNCED_TO_SALE_DISCOUNT = 0.07;

/**
 * Prix de vente au m2 d'une maison a partir du prix ANNONCE BRUT au m2
 * (champ `announced_maison_avg_m2` du referentiel).
 *
 * NE JAMAIS passer `estimated_maison_m2_from_ann` : cette valeur contient
 * deja l'abattement historique de 8,75 % (cf. ci-dessous), l'abattement
 * serait applique deux fois.
 */
export function houseSalePricePerM2FromAnnounced(announcedPerM2: number): number {
  return announcedPerM2 * (1 - HOUSE_ANNOUNCED_TO_SALE_DISCOUNT);
}

/**
 * HERITAGE, NON MODIFIE (constat oct. 2026) : facteur 0.9125 (abattement de
 * 8,75 %, "regle MAPA : ecart moyen 7,5-10 % entre prix annonce et prix de
 * vente"). Il est PRECALCULE dans les 143 valeurs `estimated_*_m2_from_ann`
 * de lib/data/luxembourg-prices.ts, pour les appartements ET les maisons
 * (communes et quartiers VDL), et sert au moteur quand une commune n'a pas
 * de prix notarie.
 *
 * Il contredit la regle d'octobre 2026 (7 %, maisons seulement) : decision
 * de Julien attendue avant toute harmonisation. Tant qu'elle n'est pas
 * prise, aucun calcul existant n'est modifie.
 */
export const LEGACY_ANNOUNCED_TO_REAL_FACTOR = 0.9125;
