// DECOTE PRIX ANNONCE -> PRIX DE VENTE : SOURCE UNIQUE DU DEPOT.
// Toute decote entre prix affiche par les vendeurs et prix de vente reel est
// definie ICI et nulle part ailleurs.

/**
 * Taux unique de decote : 7 % sur le prix annonce au m2.
 *
 * Auteur : Julien Brebion, MAPA Property (regle professionnelle, decision
 * definitive d'octobre 2026). Remplace l'ancien facteur 0,9125 (8,75 %).
 *
 * S'applique partout ou l'on part d'un prix annonce :
 *  - maisons : toujours (l'Observatoire de l'Habitat ne publie aucun prix de
 *    vente au m2 des maisons par commune, les actes notaries ne portant pas
 *    la surface) ;
 *  - appartements : seulement dans les communes sans prix notarie. La ou un
 *    prix notarie existe, il est utilise tel quel, sans decote.
 *
 * Ajustement : modifier cette seule valeur (0.07 = 7 %). Les prix estimes du
 * referentiel (lib/data/luxembourg-prices.ts) en sont derives au chargement.
 */
export const ANNOUNCED_TO_SALE_DISCOUNT = 0.07;

/**
 * Prix de vente au m2 a partir d'un prix ANNONCE BRUT au m2 (champs
 * `announced_*_avg_m2` du referentiel). Seul point d'application de la
 * decote : ne jamais lui passer une valeur `estimated_*`, deja decotee.
 */
export function salePricePerM2FromAnnounced(announcedPerM2: number): number {
  return announcedPerM2 * (1 - ANNOUNCED_TO_SALE_DISCOUNT);
}

/** Libelle du taux pour les traces internes du moteur ("-7%"). */
export const ANNOUNCED_DISCOUNT_LABEL = `-${Math.round(ANNOUNCED_TO_SALE_DISCOUNT * 1000) / 10}%`;

// EXCEPTION CONNUE, SANS EFFET SUR LES ESTIMATIONS (constat oct. 2026) :
// APARTMENT_BASELINES (lib/data/luxembourg-prices.ts) integre une decote de
// 6,5 % ecrite en dur, sans les prix affiches bruts correspondants. Cette
// table n'est lue que par estimateApartment (lib/estimation/engine.ts), code
// mort : le moteur passe par estimateObservatoire. Non modifiee, faute de
// prix bruts ; a supprimer ou a recalculer si elle est un jour reactivee.
