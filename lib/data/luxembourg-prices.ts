/**
 * Référentiel prix immobilier Luxembourg — données officielles Observatoire de l'Habitat.
 *
 * Source : data.public.lu — Ministère du Logement et de l'Aménagement du territoire.
 * Datasets utilisés (tous Creative Commons Zero, mise à jour 2026-03-26) :
 *   - prix-de-vente-des-appartements-par-commune (actes notariés via Publicité Foncière)
 *   - prix-annonces-des-logements-par-commune (annonces IMMOTOP.LU + presse spécialisée)
 *   - prix-annonces-des-logements-a-luxembourg-ville-par-quartier
 *
 * Période : année 2025 complète (publication mars 2026).
 *
 * Conventions :
 *   - real_existing_avg_m2 : prix RÉEL moyen €/m² appartements existants (transactions notariées).
 *     null si <10 transactions sur la période (règle officielle Observatoire pour confidentialité).
 *   - real_vefa_avg_m2 : prix RÉEL moyen €/m² VEFA (Vente en État Futur d'Achèvement = neuf).
 *   - announced_*_avg_m2 : prix moyen annoncé €/m² par les vendeurs (avant négociation).
 *   - estimated_*_m2_from_ann : prix annoncé × 0.9125 (décote -8.75%, règle MAPA : écart
 *     moyen 7.5-10% entre prix annoncé et prix de vente effectif).
 *
 * Logique de sélection à appliquer dans le moteur d'estimation :
 *   1. Priorité 1 : real_existing_avg_m2 si disponible (>=10 ventes notariées).
 *   2. Priorité 2 : estimated_*_m2_from_ann (prix annoncé décoté) si pas de réel.
 *   3. Fallback : moyenne nationale (à calculer dynamiquement).
 *
 * Régénération : pnpm exec tsx scripts/refresh-lux-prices.ts (à créer en V2)
 *   OU script /tmp/parse_lux_v2.py + copier ce fichier.
 *
 * Renouvellement officiel : trimestriel (Observatoire publie chaque mars/juin/sept/déc).
 */

export interface CommunePrices {
  commune: string;
  real_existing_count: number | null;
  real_existing_avg_m2: number | null;
  real_existing_range: string | null;
  real_vefa_count: number | null;
  real_vefa_avg_m2: number | null;
  real_vefa_range: string | null;
  announced_appart_count: number | null;
  announced_appart_avg_m2: number | null;
  estimated_appart_m2_from_ann: number | null;
  announced_maison_count: number | null;
  announced_maison_avg_m2: number | null;
  estimated_maison_m2_from_ann: number | null;
}

export interface VdlQuartierPrices {
  quartier: string;
  announced_appart_count?: number | null;
  announced_appart_avg_m2?: number | null;
  estimated_appart_m2_from_ann?: number | null;
  announced_maison_count?: number | null;
  announced_maison_avg_m2?: number | null;
  estimated_maison_m2_from_ann?: number | null;
}

export const LUXEMBOURG_DATA_AS_OF = "2025 (publication mars 2026)";
export const ANNOUNCED_TO_REAL_DISCOUNT = 0.9125; // -8.75%

export const LUXEMBOURG_COMMUNES_PRICES: CommunePrices[] = [
  {
    "commune": "Beaufort",
    "real_existing_count": 4.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 4.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 32.0,
    "announced_appart_avg_m2": 7284.52,
    "estimated_appart_m2_from_ann": 6647,
    "announced_maison_count": 35.0,
    "announced_maison_avg_m2": 5351.984,
    "estimated_maison_m2_from_ann": 4884
  },
  {
    "commune": "Bech",
    "real_existing_count": 1.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 8.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 26.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Beckerich",
    "real_existing_count": 5.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 30.0,
    "announced_appart_avg_m2": 6614.201,
    "estimated_appart_m2_from_ann": 6035,
    "announced_maison_count": 95.0,
    "announced_maison_avg_m2": 4983.419,
    "estimated_maison_m2_from_ann": 4547
  },
  {
    "commune": "Berdorf",
    "real_existing_count": 8.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 15.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 14.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Bertrange",
    "real_existing_count": 47.0,
    "real_existing_avg_m2": 9991.416,
    "real_existing_range": "7240 € - 12975 €",
    "real_vefa_count": 16.0,
    "real_vefa_avg_m2": 12360.54,
    "real_vefa_range": "10302 € - 14948 €",
    "announced_appart_count": 406.0,
    "announced_appart_avg_m2": 11331.49,
    "estimated_appart_m2_from_ann": 10340,
    "announced_maison_count": 384.0,
    "announced_maison_avg_m2": 8350.165,
    "estimated_maison_m2_from_ann": 7620
  },
  {
    "commune": "Bettembourg",
    "real_existing_count": 46.0,
    "real_existing_avg_m2": 7121.654,
    "real_existing_range": "5104 € - 9115 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 218.0,
    "announced_appart_avg_m2": 7522.348,
    "estimated_appart_m2_from_ann": 6864,
    "announced_maison_count": 128.0,
    "announced_maison_avg_m2": 6296.808,
    "estimated_maison_m2_from_ann": 5746
  },
  {
    "commune": "Bettendorf",
    "real_existing_count": 8.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 24.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 175.0,
    "announced_maison_avg_m2": 5566.074,
    "estimated_maison_m2_from_ann": 5079
  },
  {
    "commune": "Betzdorf",
    "real_existing_count": 2.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 6.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 90.0,
    "announced_maison_avg_m2": 6014.865,
    "estimated_maison_m2_from_ann": 5489
  },
  {
    "commune": "Bissen",
    "real_existing_count": 18.0,
    "real_existing_avg_m2": 6747.349,
    "real_existing_range": "3773 € - 10179 €",
    "real_vefa_count": 2.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 46.0,
    "announced_appart_avg_m2": 7664.87,
    "estimated_appart_m2_from_ann": 6994,
    "announced_maison_count": 52.0,
    "announced_maison_avg_m2": 5969.118,
    "estimated_maison_m2_from_ann": 5447
  },
  {
    "commune": "Biwer",
    "real_existing_count": 1.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 6.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 27.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Boulaide",
    "real_existing_count": 0.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 7.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 29.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Bourscheid",
    "real_existing_count": 6.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 21.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 22.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Bous-Waldbredimus",
    "real_existing_count": 6.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 35.0,
    "announced_appart_avg_m2": 8037.701,
    "estimated_appart_m2_from_ann": 7334,
    "announced_maison_count": 54.0,
    "announced_maison_avg_m2": 5916.055,
    "estimated_maison_m2_from_ann": 5398
  },
  {
    "commune": "Clervaux",
    "real_existing_count": 29.0,
    "real_existing_avg_m2": 5943.802,
    "real_existing_range": "4601 € - 7964 €",
    "real_vefa_count": 3.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 122.0,
    "announced_appart_avg_m2": 5898.5,
    "estimated_appart_m2_from_ann": 5382,
    "announced_maison_count": 224.0,
    "announced_maison_avg_m2": 5123.036,
    "estimated_maison_m2_from_ann": 4675
  },
  {
    "commune": "Colmar-Berg",
    "real_existing_count": 23.0,
    "real_existing_avg_m2": 6583.087,
    "real_existing_range": "5407 € - 7641 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 50.0,
    "announced_appart_avg_m2": 6927.78,
    "estimated_appart_m2_from_ann": 6322,
    "announced_maison_count": 44.0,
    "announced_maison_avg_m2": 5424.762,
    "estimated_maison_m2_from_ann": 4950
  },
  {
    "commune": "Consdorf",
    "real_existing_count": 4.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 26.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 44.0,
    "announced_maison_avg_m2": 5485.946,
    "estimated_maison_m2_from_ann": 5006
  },
  {
    "commune": "Contern",
    "real_existing_count": 27.0,
    "real_existing_avg_m2": 8570.014,
    "real_existing_range": "6168 € - 11016 €",
    "real_vefa_count": 9.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 246.0,
    "announced_appart_avg_m2": 9496.161,
    "estimated_appart_m2_from_ann": 8665,
    "announced_maison_count": 67.0,
    "announced_maison_avg_m2": 6328.366,
    "estimated_maison_m2_from_ann": 5775
  },
  {
    "commune": "Dalheim",
    "real_existing_count": 9.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 65.0,
    "announced_appart_avg_m2": 7051.553,
    "estimated_appart_m2_from_ann": 6435,
    "announced_maison_count": 459.0,
    "announced_maison_avg_m2": 6901.406,
    "estimated_maison_m2_from_ann": 6298
  },
  {
    "commune": "Diekirch",
    "real_existing_count": 39.0,
    "real_existing_avg_m2": 6806.282,
    "real_existing_range": "4821 € - 9207 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 126.0,
    "announced_appart_avg_m2": 7489.602,
    "estimated_appart_m2_from_ann": 6834,
    "announced_maison_count": 51.0,
    "announced_maison_avg_m2": 5232.472,
    "estimated_maison_m2_from_ann": 4775
  },
  {
    "commune": "Differdange",
    "real_existing_count": 233.0,
    "real_existing_avg_m2": 6790.91,
    "real_existing_range": "4675 € - 9103 €",
    "real_vefa_count": 10.0,
    "real_vefa_avg_m2": 7063.751,
    "real_vefa_range": "6323 € - 8051 €",
    "announced_appart_count": 1035.0,
    "announced_appart_avg_m2": 7220.824,
    "estimated_appart_m2_from_ann": 6589,
    "announced_maison_count": 370.0,
    "announced_maison_avg_m2": 5026.02,
    "estimated_maison_m2_from_ann": 4586
  },
  {
    "commune": "Dippach",
    "real_existing_count": 23.0,
    "real_existing_avg_m2": 7670.97,
    "real_existing_range": "5850 € - 9687 €",
    "real_vefa_count": 2.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 98.0,
    "announced_appart_avg_m2": 8480.572,
    "estimated_appart_m2_from_ann": 7739,
    "announced_maison_count": 241.0,
    "announced_maison_avg_m2": 5995.771,
    "estimated_maison_m2_from_ann": 5471
  },
  {
    "commune": "Dudelange",
    "real_existing_count": 146.0,
    "real_existing_avg_m2": 6390.285,
    "real_existing_range": "4462 € - 8732 €",
    "real_vefa_count": 15.0,
    "real_vefa_avg_m2": 8748.523,
    "real_vefa_range": "7009 € - 10420 €",
    "announced_appart_count": 710.0,
    "announced_appart_avg_m2": 7139.192,
    "estimated_appart_m2_from_ann": 6515,
    "announced_maison_count": 358.0,
    "announced_maison_avg_m2": 5489.796,
    "estimated_maison_m2_from_ann": 5009
  },
  {
    "commune": "Echternach",
    "real_existing_count": 31.0,
    "real_existing_avg_m2": 6083.979,
    "real_existing_range": "4056 € - 8657 €",
    "real_vefa_count": 1.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 74.0,
    "announced_appart_avg_m2": 6555.484,
    "estimated_appart_m2_from_ann": 5982,
    "announced_maison_count": 77.0,
    "announced_maison_avg_m2": 5257.337,
    "estimated_maison_m2_from_ann": 4797
  },
  {
    "commune": "Ell",
    "real_existing_count": 12.0,
    "real_existing_avg_m2": 7123.3,
    "real_existing_range": "5110 € - 9461 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 18.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 64.0,
    "announced_maison_avg_m2": 5380.54,
    "estimated_maison_m2_from_ann": 4910
  },
  {
    "commune": "Erpeldange",
    "real_existing_count": null,
    "real_existing_avg_m2": null,
    "real_existing_range": null,
    "real_vefa_count": null,
    "real_vefa_avg_m2": null,
    "real_vefa_range": null,
    "announced_appart_count": 10.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 12.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Erpeldange-sur-Sûre",
    "real_existing_count": 10.0,
    "real_existing_avg_m2": 6934.209,
    "real_existing_range": "4410 € - 9536 €",
    "real_vefa_count": 11.0,
    "real_vefa_avg_m2": 9039.224,
    "real_vefa_range": "7034 € - 10326 €",
    "announced_appart_count": null,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": null,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Esch-sur-Alzette",
    "real_existing_count": 269.0,
    "real_existing_avg_m2": 6365.475,
    "real_existing_range": "4147 € - 8881 €",
    "real_vefa_count": 30.0,
    "real_vefa_avg_m2": 8971.585,
    "real_vefa_range": "7929 € - 10573 €",
    "announced_appart_count": 1752.0,
    "announced_appart_avg_m2": 7391.681,
    "estimated_appart_m2_from_ann": 6745,
    "announced_maison_count": 436.0,
    "announced_maison_avg_m2": 5135.175,
    "estimated_maison_m2_from_ann": 4686
  },
  {
    "commune": "Esch-sur-Sûre",
    "real_existing_count": 7.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 4.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 35.0,
    "announced_appart_avg_m2": 5683.518,
    "estimated_appart_m2_from_ann": 5186,
    "announced_maison_count": 52.0,
    "announced_maison_avg_m2": 4310.81,
    "estimated_maison_m2_from_ann": 3934
  },
  {
    "commune": "Ettelbruck",
    "real_existing_count": 70.0,
    "real_existing_avg_m2": 6739.703,
    "real_existing_range": "4023 € - 8957 €",
    "real_vefa_count": 1.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 157.0,
    "announced_appart_avg_m2": 6854.177,
    "estimated_appart_m2_from_ann": 6254,
    "announced_maison_count": 170.0,
    "announced_maison_avg_m2": 4865.235,
    "estimated_maison_m2_from_ann": 4440
  },
  {
    "commune": "Feulen",
    "real_existing_count": 2.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 18.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 46.0,
    "announced_maison_avg_m2": 4901.569,
    "estimated_maison_m2_from_ann": 4473
  },
  {
    "commune": "Fischbach",
    "real_existing_count": 4.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 9.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 1.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Flaxweiler",
    "real_existing_count": 0.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 4.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 50.0,
    "announced_maison_avg_m2": 5495.506,
    "estimated_maison_m2_from_ann": 5015
  },
  {
    "commune": "Frisange",
    "real_existing_count": 33.0,
    "real_existing_avg_m2": 7391.674,
    "real_existing_range": "5937 € - 9108 €",
    "real_vefa_count": 6.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 142.0,
    "announced_appart_avg_m2": 7661.378,
    "estimated_appart_m2_from_ann": 6991,
    "announced_maison_count": 193.0,
    "announced_maison_avg_m2": 6242.726,
    "estimated_maison_m2_from_ann": 5696
  },
  {
    "commune": "Garnich",
    "real_existing_count": 4.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 1.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 17.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 75.0,
    "announced_maison_avg_m2": 6873.719,
    "estimated_maison_m2_from_ann": 6272
  },
  {
    "commune": "Goesdorf",
    "real_existing_count": 7.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 30.0,
    "announced_appart_avg_m2": 6151.176,
    "estimated_appart_m2_from_ann": 5613,
    "announced_maison_count": 35.0,
    "announced_maison_avg_m2": 4545.672,
    "estimated_maison_m2_from_ann": 4148
  },
  {
    "commune": "Grevenmacher",
    "real_existing_count": 42.0,
    "real_existing_avg_m2": 6130.562,
    "real_existing_range": "4584 € - 7724 €",
    "real_vefa_count": 5.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 367.0,
    "announced_appart_avg_m2": 8554.264,
    "estimated_appart_m2_from_ann": 7806,
    "announced_maison_count": 38.0,
    "announced_maison_avg_m2": 5646.952,
    "estimated_maison_m2_from_ann": 5153
  },
  {
    "commune": "Groussbus-Wal",
    "real_existing_count": 12.0,
    "real_existing_avg_m2": 6692.453,
    "real_existing_range": "4339 € - 8894 €",
    "real_vefa_count": 8.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 14.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 245.0,
    "announced_maison_avg_m2": 4212.025,
    "estimated_maison_m2_from_ann": 3843
  },
  {
    "commune": "Habscht",
    "real_existing_count": 16.0,
    "real_existing_avg_m2": 6835.006,
    "real_existing_range": "4129 € - 9933 €",
    "real_vefa_count": 2.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 153.0,
    "announced_appart_avg_m2": 7313.451,
    "estimated_appart_m2_from_ann": 6674,
    "announced_maison_count": 135.0,
    "announced_maison_avg_m2": 5358.353,
    "estimated_maison_m2_from_ann": 4889
  },
  {
    "commune": "Heffingen",
    "real_existing_count": 4.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 60.0,
    "announced_appart_avg_m2": 8311.34,
    "estimated_appart_m2_from_ann": 7584,
    "announced_maison_count": 35.0,
    "announced_maison_avg_m2": 5370.1,
    "estimated_maison_m2_from_ann": 4900
  },
  {
    "commune": "Helperknapp",
    "real_existing_count": 27.0,
    "real_existing_avg_m2": 7204.03,
    "real_existing_range": "3327 € - 9633 €",
    "real_vefa_count": 3.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 65.0,
    "announced_appart_avg_m2": 7366.098,
    "estimated_appart_m2_from_ann": 6722,
    "announced_maison_count": 70.0,
    "announced_maison_avg_m2": 5268.189,
    "estimated_maison_m2_from_ann": 4807
  },
  {
    "commune": "Hesperange",
    "real_existing_count": 102.0,
    "real_existing_avg_m2": 8423.363,
    "real_existing_range": "5874 € - 11034 €",
    "real_vefa_count": 22.0,
    "real_vefa_avg_m2": 12805.36,
    "real_vefa_range": "11651 € - 13933 €",
    "announced_appart_count": 866.0,
    "announced_appart_avg_m2": 10039.64,
    "estimated_appart_m2_from_ann": 9161,
    "announced_maison_count": 279.0,
    "announced_maison_avg_m2": 7863.955,
    "estimated_maison_m2_from_ann": 7176
  },
  {
    "commune": "Junglinster",
    "real_existing_count": 23.0,
    "real_existing_avg_m2": 8185.113,
    "real_existing_range": "6096 € - 9931 €",
    "real_vefa_count": 18.0,
    "real_vefa_avg_m2": 9654.185,
    "real_vefa_range": "8051 € - 11230 €",
    "announced_appart_count": 103.0,
    "announced_appart_avg_m2": 8801.918,
    "estimated_appart_m2_from_ann": 8032,
    "announced_maison_count": 244.0,
    "announced_maison_avg_m2": 7553.857,
    "estimated_maison_m2_from_ann": 6893
  },
  {
    "commune": "Kayl",
    "real_existing_count": 66.0,
    "real_existing_avg_m2": 7223.277,
    "real_existing_range": "5398 € - 8893 €",
    "real_vefa_count": 3.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 277.0,
    "announced_appart_avg_m2": 6963.505,
    "estimated_appart_m2_from_ann": 6354,
    "announced_maison_count": 131.0,
    "announced_maison_avg_m2": 5138.584,
    "estimated_maison_m2_from_ann": 4689
  },
  {
    "commune": "Kehlen",
    "real_existing_count": 23.0,
    "real_existing_avg_m2": 8558.188,
    "real_existing_range": "6930 € - 10141 €",
    "real_vefa_count": 12.0,
    "real_vefa_avg_m2": 8162.009,
    "real_vefa_range": "6405 € - 10857 €",
    "announced_appart_count": 215.0,
    "announced_appart_avg_m2": 8256.026,
    "estimated_appart_m2_from_ann": 7534,
    "announced_maison_count": 330.0,
    "announced_maison_avg_m2": 5952.723,
    "estimated_maison_m2_from_ann": 5432
  },
  {
    "commune": "Kiischpelt",
    "real_existing_count": 0.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 3.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 14.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Koerich",
    "real_existing_count": 7.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 2.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 197.0,
    "announced_appart_avg_m2": 6924.573,
    "estimated_appart_m2_from_ann": 6319,
    "announced_maison_count": 35.0,
    "announced_maison_avg_m2": 6403.819,
    "estimated_maison_m2_from_ann": 5843
  },
  {
    "commune": "Kopstal",
    "real_existing_count": 19.0,
    "real_existing_avg_m2": 9771.457,
    "real_existing_range": "5738 € - 12739 €",
    "real_vefa_count": 4.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 77.0,
    "announced_appart_avg_m2": 8935.269,
    "estimated_appart_m2_from_ann": 8153,
    "announced_maison_count": 92.0,
    "announced_maison_avg_m2": 8558.628,
    "estimated_maison_m2_from_ann": 7810
  },
  {
    "commune": "Käerjeng",
    "real_existing_count": 50.0,
    "real_existing_avg_m2": 7042.496,
    "real_existing_range": "5532 € - 9145 €",
    "real_vefa_count": 7.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 1358.0,
    "announced_appart_avg_m2": 8728.515,
    "estimated_appart_m2_from_ann": 7965,
    "announced_maison_count": 776.0,
    "announced_maison_avg_m2": 6051.063,
    "estimated_maison_m2_from_ann": 5522
  },
  {
    "commune": "Lac de la Haute-Sûre",
    "real_existing_count": 8.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 19.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 27.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Larochette",
    "real_existing_count": 12.0,
    "real_existing_avg_m2": 5714.908,
    "real_existing_range": "3942 € - 7471 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 34.0,
    "announced_appart_avg_m2": 6792.424,
    "estimated_appart_m2_from_ann": 6198,
    "announced_maison_count": 24.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Lenningen",
    "real_existing_count": 4.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 4.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 35.0,
    "announced_maison_avg_m2": 5496.232,
    "estimated_maison_m2_from_ann": 5015
  },
  {
    "commune": "Leudelange",
    "real_existing_count": 5.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 15.0,
    "real_vefa_avg_m2": 8849.33,
    "real_vefa_range": "7836 € - 11932 €",
    "announced_appart_count": 161.0,
    "announced_appart_avg_m2": 8759.538,
    "estimated_appart_m2_from_ann": 7993,
    "announced_maison_count": 48.0,
    "announced_maison_avg_m2": 7696.914,
    "estimated_maison_m2_from_ann": 7023
  },
  {
    "commune": "Lintgen",
    "real_existing_count": 21.0,
    "real_existing_avg_m2": 7410.135,
    "real_existing_range": "5323 € - 9145 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 70.0,
    "announced_appart_avg_m2": 9228.819,
    "estimated_appart_m2_from_ann": 8421,
    "announced_maison_count": 44.0,
    "announced_maison_avg_m2": 6124.392,
    "estimated_maison_m2_from_ann": 5589
  },
  {
    "commune": "Lorentzweiler",
    "real_existing_count": 23.0,
    "real_existing_avg_m2": 8099.51,
    "real_existing_range": "6623 € - 10013 €",
    "real_vefa_count": 5.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 168.0,
    "announced_appart_avg_m2": 9542.926,
    "estimated_appart_m2_from_ann": 8708,
    "announced_maison_count": 185.0,
    "announced_maison_avg_m2": 5432.159,
    "estimated_maison_m2_from_ann": 4957
  },
  {
    "commune": "Luxembourg",
    "real_existing_count": null,
    "real_existing_avg_m2": null,
    "real_existing_range": null,
    "real_vefa_count": null,
    "real_vefa_avg_m2": null,
    "real_vefa_range": null,
    "announced_appart_count": 6863.0,
    "announced_appart_avg_m2": 12362.33,
    "estimated_appart_m2_from_ann": 11281,
    "announced_maison_count": 818.0,
    "announced_maison_avg_m2": 8668.662,
    "estimated_maison_m2_from_ann": 7910
  },
  {
    "commune": "Luxembourg-Ville",
    "real_existing_count": 672.0,
    "real_existing_avg_m2": 10269.64,
    "real_existing_range": "6958 € - 14075 €",
    "real_vefa_count": 182.0,
    "real_vefa_avg_m2": 11990.01,
    "real_vefa_range": "8960 € - 15137 €",
    "announced_appart_count": null,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": null,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Mamer",
    "real_existing_count": 40.0,
    "real_existing_avg_m2": 8608.471,
    "real_existing_range": "6144 € - 10526 €",
    "real_vefa_count": 21.0,
    "real_vefa_avg_m2": 9919.137,
    "real_vefa_range": "8687 € - 12547 €",
    "announced_appart_count": 721.0,
    "announced_appart_avg_m2": 9766.282,
    "estimated_appart_m2_from_ann": 8912,
    "announced_maison_count": 291.0,
    "announced_maison_avg_m2": 7702.215,
    "estimated_maison_m2_from_ann": 7028
  },
  {
    "commune": "Manternach",
    "real_existing_count": 2.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 1.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 20.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Mersch",
    "real_existing_count": 47.0,
    "real_existing_avg_m2": 7364.382,
    "real_existing_range": "4745 € - 9429 €",
    "real_vefa_count": 12.0,
    "real_vefa_avg_m2": 10225.77,
    "real_vefa_range": "7687 € - 12983 €",
    "announced_appart_count": 927.0,
    "announced_appart_avg_m2": 9557.733,
    "estimated_appart_m2_from_ann": 8721,
    "announced_maison_count": 397.0,
    "announced_maison_avg_m2": 6265.377,
    "estimated_maison_m2_from_ann": 5717
  },
  {
    "commune": "Mertert",
    "real_existing_count": 36.0,
    "real_existing_avg_m2": 7395.4,
    "real_existing_range": "4573 € - 9685 €",
    "real_vefa_count": 11.0,
    "real_vefa_avg_m2": 8751.346,
    "real_vefa_range": "6887 € - 10095 €",
    "announced_appart_count": 159.0,
    "announced_appart_avg_m2": 7141.64,
    "estimated_appart_m2_from_ann": 6517,
    "announced_maison_count": 57.0,
    "announced_maison_avg_m2": 5618.957,
    "estimated_maison_m2_from_ann": 5127
  },
  {
    "commune": "Mertzig",
    "real_existing_count": 3.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 20.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 60.0,
    "announced_maison_avg_m2": 5770.799,
    "estimated_maison_m2_from_ann": 5266
  },
  {
    "commune": "Mondercange",
    "real_existing_count": 39.0,
    "real_existing_avg_m2": 7224.16,
    "real_existing_range": "5081 € - 9478 €",
    "real_vefa_count": 4.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 181.0,
    "announced_appart_avg_m2": 7225.58,
    "estimated_appart_m2_from_ann": 6593,
    "announced_maison_count": 327.0,
    "announced_maison_avg_m2": 6556.665,
    "estimated_maison_m2_from_ann": 5983
  },
  {
    "commune": "Mondorf-les-Bains",
    "real_existing_count": 46.0,
    "real_existing_avg_m2": 7057.24,
    "real_existing_range": "4607 € - 10215 €",
    "real_vefa_count": 2.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 145.0,
    "announced_appart_avg_m2": 7830.405,
    "estimated_appart_m2_from_ann": 7145,
    "announced_maison_count": 79.0,
    "announced_maison_avg_m2": 6170.447,
    "estimated_maison_m2_from_ann": 5631
  },
  {
    "commune": "Moyenne nationale",
    "real_existing_count": null,
    "real_existing_avg_m2": 7773.465,
    "real_existing_range": "4710 € - 12031 €",
    "real_vefa_count": null,
    "real_vefa_avg_m2": 10179.38,
    "real_vefa_range": "6941 € - 14106 €",
    "announced_appart_count": null,
    "announced_appart_avg_m2": 9463.98,
    "estimated_appart_m2_from_ann": 8636,
    "announced_maison_count": null,
    "announced_maison_avg_m2": 6058.961,
    "estimated_maison_m2_from_ann": 5529
  },
  {
    "commune": "Niederanven",
    "real_existing_count": 9.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 75.0,
    "announced_appart_avg_m2": 10326.85,
    "estimated_appart_m2_from_ann": 9423,
    "announced_maison_count": 150.0,
    "announced_maison_avg_m2": 7564.372,
    "estimated_maison_m2_from_ann": 6902
  },
  {
    "commune": "Nommern",
    "real_existing_count": 3.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 1.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 3.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 16.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Parc Hosingen",
    "real_existing_count": 14.0,
    "real_existing_avg_m2": 5844.435,
    "real_existing_range": "3859 € - 7479 €",
    "real_vefa_count": 1.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 31.0,
    "announced_appart_avg_m2": 5916.751,
    "estimated_appart_m2_from_ann": 5399,
    "announced_maison_count": 41.0,
    "announced_maison_avg_m2": 4763.413,
    "estimated_maison_m2_from_ann": 4347
  },
  {
    "commune": "Petange",
    "real_existing_count": 153.0,
    "real_existing_avg_m2": 6531.358,
    "real_existing_range": "4465 € - 8423 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": null,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": null,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Preizerdaul",
    "real_existing_count": 5.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": null,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": null,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Préizerdaul",
    "real_existing_count": null,
    "real_existing_avg_m2": null,
    "real_existing_range": null,
    "real_vefa_count": null,
    "real_vefa_avg_m2": null,
    "real_vefa_range": null,
    "announced_appart_count": 15.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 25.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Putscheid",
    "real_existing_count": 1.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 15.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 26.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Pétange",
    "real_existing_count": null,
    "real_existing_avg_m2": null,
    "real_existing_range": null,
    "real_vefa_count": null,
    "real_vefa_avg_m2": null,
    "real_vefa_range": null,
    "announced_appart_count": 654.0,
    "announced_appart_avg_m2": 7040.645,
    "estimated_appart_m2_from_ann": 6425,
    "announced_maison_count": 461.0,
    "announced_maison_avg_m2": 5037.115,
    "estimated_maison_m2_from_ann": 4596
  },
  {
    "commune": "Rambrouch",
    "real_existing_count": 5.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 1.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 22.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 215.0,
    "announced_maison_avg_m2": 4608.852,
    "estimated_maison_m2_from_ann": 4206
  },
  {
    "commune": "Reckange-sur-Mess",
    "real_existing_count": 6.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 19.0,
    "real_vefa_avg_m2": 8871.951,
    "real_vefa_range": "7838 € - 9625 €",
    "announced_appart_count": 51.0,
    "announced_appart_avg_m2": 8787.806,
    "estimated_appart_m2_from_ann": 8019,
    "announced_maison_count": 80.0,
    "announced_maison_avg_m2": 5739.013,
    "estimated_maison_m2_from_ann": 5237
  },
  {
    "commune": "Redange",
    "real_existing_count": 11.0,
    "real_existing_avg_m2": 6482.286,
    "real_existing_range": "4719 € - 8113 €",
    "real_vefa_count": 8.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": null,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": null,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Redange-sur-Attert",
    "real_existing_count": null,
    "real_existing_avg_m2": null,
    "real_existing_range": null,
    "real_vefa_count": null,
    "real_vefa_avg_m2": null,
    "real_vefa_range": null,
    "announced_appart_count": 55.0,
    "announced_appart_avg_m2": 6746.648,
    "estimated_appart_m2_from_ann": 6156,
    "announced_maison_count": 47.0,
    "announced_maison_avg_m2": 4629.79,
    "estimated_maison_m2_from_ann": 4225
  },
  {
    "commune": "Reisdorf",
    "real_existing_count": 2.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 11.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 53.0,
    "announced_maison_avg_m2": 6050.24,
    "estimated_maison_m2_from_ann": 5521
  },
  {
    "commune": "Remich",
    "real_existing_count": 33.0,
    "real_existing_avg_m2": 6693.958,
    "real_existing_range": "5057 € - 8925 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 126.0,
    "announced_appart_avg_m2": 8017.674,
    "estimated_appart_m2_from_ann": 7316,
    "announced_maison_count": 82.0,
    "announced_maison_avg_m2": 6499.894,
    "estimated_maison_m2_from_ann": 5931
  },
  {
    "commune": "Roeser",
    "real_existing_count": 54.0,
    "real_existing_avg_m2": 8157.803,
    "real_existing_range": "6424 € - 10385 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 153.0,
    "announced_appart_avg_m2": 8233.881,
    "estimated_appart_m2_from_ann": 7513,
    "announced_maison_count": 118.0,
    "announced_maison_avg_m2": 7174.908,
    "estimated_maison_m2_from_ann": 6547
  },
  {
    "commune": "Rosport-Mompach",
    "real_existing_count": 6.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 13.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 81.0,
    "announced_maison_avg_m2": 4806.72,
    "estimated_maison_m2_from_ann": 4386
  },
  {
    "commune": "Rumelange",
    "real_existing_count": 19.0,
    "real_existing_avg_m2": 5894.643,
    "real_existing_range": "3380 € - 9140 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 66.0,
    "announced_appart_avg_m2": 6475.025,
    "estimated_appart_m2_from_ann": 5908,
    "announced_maison_count": 86.0,
    "announced_maison_avg_m2": 4918.761,
    "estimated_maison_m2_from_ann": 4488
  },
  {
    "commune": "Saeul",
    "real_existing_count": 2.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 2.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 18.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Sandweiler",
    "real_existing_count": 19.0,
    "real_existing_avg_m2": 7792.366,
    "real_existing_range": "6085 € - 9676 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 26.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 31.0,
    "announced_maison_avg_m2": 7454.713,
    "estimated_maison_m2_from_ann": 6802
  },
  {
    "commune": "Sanem",
    "real_existing_count": 138.0,
    "real_existing_avg_m2": 7539.077,
    "real_existing_range": "5238 € - 10137 €",
    "real_vefa_count": 29.0,
    "real_vefa_avg_m2": 8937.283,
    "real_vefa_range": "7623 € - 10210 €",
    "announced_appart_count": 471.0,
    "announced_appart_avg_m2": 7459.496,
    "estimated_appart_m2_from_ann": 6807,
    "announced_maison_count": 491.0,
    "announced_maison_avg_m2": 5496.629,
    "estimated_maison_m2_from_ann": 5016
  },
  {
    "commune": "Schengen",
    "real_existing_count": 21.0,
    "real_existing_avg_m2": 6541.013,
    "real_existing_range": "5060 € - 8858 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 30.0,
    "announced_appart_avg_m2": 6969.232,
    "estimated_appart_m2_from_ann": 6359,
    "announced_maison_count": 114.0,
    "announced_maison_avg_m2": 5396.319,
    "estimated_maison_m2_from_ann": 4924
  },
  {
    "commune": "Schieren",
    "real_existing_count": 7.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 3.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 27.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 22.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Schifflange",
    "real_existing_count": 100.0,
    "real_existing_avg_m2": 7390.456,
    "real_existing_range": "4755 € - 9349 €",
    "real_vefa_count": 6.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 303.0,
    "announced_appart_avg_m2": 7298.821,
    "estimated_appart_m2_from_ann": 6660,
    "announced_maison_count": 107.0,
    "announced_maison_avg_m2": 5691.998,
    "estimated_maison_m2_from_ann": 5194
  },
  {
    "commune": "Schuttrange",
    "real_existing_count": 11.0,
    "real_existing_avg_m2": 8096.61,
    "real_existing_range": "5300 € - 9524 €",
    "real_vefa_count": 6.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 84.0,
    "announced_appart_avg_m2": 9432.296,
    "estimated_appart_m2_from_ann": 8607,
    "announced_maison_count": 81.0,
    "announced_maison_avg_m2": 7406.017,
    "estimated_maison_m2_from_ann": 6758
  },
  {
    "commune": "Stadtbredimus",
    "real_existing_count": 6.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 16.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 98.0,
    "announced_maison_avg_m2": 5837.951,
    "estimated_maison_m2_from_ann": 5327
  },
  {
    "commune": "Steinfort",
    "real_existing_count": 28.0,
    "real_existing_avg_m2": 7964.728,
    "real_existing_range": "4440 € - 10048 €",
    "real_vefa_count": 8.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 202.0,
    "announced_appart_avg_m2": 8734.896,
    "estimated_appart_m2_from_ann": 7971,
    "announced_maison_count": 197.0,
    "announced_maison_avg_m2": 6178.631,
    "estimated_maison_m2_from_ann": 5638
  },
  {
    "commune": "Steinsel",
    "real_existing_count": 26.0,
    "real_existing_avg_m2": 8433.582,
    "real_existing_range": "6069 € - 11177 €",
    "real_vefa_count": 29.0,
    "real_vefa_avg_m2": 9078.293,
    "real_vefa_range": "6537 € - 10813 €",
    "announced_appart_count": 196.0,
    "announced_appart_avg_m2": 9569.236,
    "estimated_appart_m2_from_ann": 8732,
    "announced_maison_count": 102.0,
    "announced_maison_avg_m2": 6931.09,
    "estimated_maison_m2_from_ann": 6325
  },
  {
    "commune": "Strassen",
    "real_existing_count": 79.0,
    "real_existing_avg_m2": 10031.07,
    "real_existing_range": "6974 € - 13337 €",
    "real_vefa_count": 27.0,
    "real_vefa_avg_m2": 12106.23,
    "real_vefa_range": "9686 € - 14914 €",
    "announced_appart_count": 263.0,
    "announced_appart_avg_m2": 10779.85,
    "estimated_appart_m2_from_ann": 9837,
    "announced_maison_count": 61.0,
    "announced_maison_avg_m2": 8733.636,
    "estimated_maison_m2_from_ann": 7969
  },
  {
    "commune": "Tandel",
    "real_existing_count": 1.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 0.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 0.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Troisvierges",
    "real_existing_count": 2.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 11.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 56.0,
    "announced_maison_avg_m2": 4077.889,
    "estimated_maison_m2_from_ann": 3721
  },
  {
    "commune": "Useldange",
    "real_existing_count": 4.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 11.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 69.0,
    "announced_maison_avg_m2": 5277.081,
    "estimated_maison_m2_from_ann": 4815
  },
  {
    "commune": "Vallée de l'Ernz",
    "real_existing_count": 5.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 1.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 12.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 179.0,
    "announced_maison_avg_m2": 4824.492,
    "estimated_maison_m2_from_ann": 4402
  },
  {
    "commune": "Vianden",
    "real_existing_count": 7.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 2.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 27.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 42.0,
    "announced_maison_avg_m2": 4223.038,
    "estimated_maison_m2_from_ann": 3854
  },
  {
    "commune": "Vichten",
    "real_existing_count": 4.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 7.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 22.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Waldbillig",
    "real_existing_count": 3.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 5.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 39.0,
    "announced_maison_avg_m2": 5277.722,
    "estimated_maison_m2_from_ann": 4816
  },
  {
    "commune": "Walferdange",
    "real_existing_count": 59.0,
    "real_existing_avg_m2": 8550.38,
    "real_existing_range": "6184 € - 11279 €",
    "real_vefa_count": 5.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 227.0,
    "announced_appart_avg_m2": 9583.645,
    "estimated_appart_m2_from_ann": 8745,
    "announced_maison_count": 95.0,
    "announced_maison_avg_m2": 7529.224,
    "estimated_maison_m2_from_ann": 6870
  },
  {
    "commune": "Weiler-la-Tour",
    "real_existing_count": 10.0,
    "real_existing_avg_m2": 7797.582,
    "real_existing_range": "6435 € - 9485 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 38.0,
    "announced_appart_avg_m2": 8386.918,
    "estimated_appart_m2_from_ann": 7653,
    "announced_maison_count": 94.0,
    "announced_maison_avg_m2": 6475.206,
    "estimated_maison_m2_from_ann": 5909
  },
  {
    "commune": "Weiswampach",
    "real_existing_count": 18.0,
    "real_existing_avg_m2": 5934.055,
    "real_existing_range": "3801 € - 7414 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 63.0,
    "announced_appart_avg_m2": 6679.935,
    "estimated_appart_m2_from_ann": 6095,
    "announced_maison_count": 21.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Wiltz",
    "real_existing_count": 30.0,
    "real_existing_avg_m2": 5274.524,
    "real_existing_range": "3514 € - 6770 €",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 196.0,
    "announced_appart_avg_m2": 5627.966,
    "estimated_appart_m2_from_ann": 5136,
    "announced_maison_count": 462.0,
    "announced_maison_avg_m2": 4213.139,
    "estimated_maison_m2_from_ann": 3844
  },
  {
    "commune": "Wincrange",
    "real_existing_count": 6.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 13.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 69.0,
    "announced_maison_avg_m2": 4291.768,
    "estimated_maison_m2_from_ann": 3916
  },
  {
    "commune": "Winseler",
    "real_existing_count": 6.0,
    "real_existing_avg_m2": null,
    "real_existing_range": "*",
    "real_vefa_count": 0.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 23.0,
    "announced_appart_avg_m2": null,
    "estimated_appart_m2_from_ann": null,
    "announced_maison_count": 19.0,
    "announced_maison_avg_m2": null,
    "estimated_maison_m2_from_ann": null
  },
  {
    "commune": "Wormeldange",
    "real_existing_count": 13.0,
    "real_existing_avg_m2": 6068.175,
    "real_existing_range": "3101 € - 9098 €",
    "real_vefa_count": 4.0,
    "real_vefa_avg_m2": null,
    "real_vefa_range": "*",
    "announced_appart_count": 179.0,
    "announced_appart_avg_m2": 8527.334,
    "estimated_appart_m2_from_ann": 7781,
    "announced_maison_count": 53.0,
    "announced_maison_avg_m2": 5181.871,
    "estimated_maison_m2_from_ann": 4728
  }
];

export const VDL_QUARTIERS_PRICES: VdlQuartierPrices[] = [
  {
    "quartier": "Beggen",
    "announced_appart_count": 72.0,
    "announced_appart_avg_m2": 10124.0,
    "estimated_appart_m2_from_ann": 9238,
    "announced_maison_count": 16.0,
    "announced_maison_avg_m2": 7149.152,
    "estimated_maison_m2_from_ann": 6524
  },
  {
    "quartier": "Belair",
    "announced_appart_count": 1314.0,
    "announced_appart_avg_m2": 14272.85,
    "estimated_appart_m2_from_ann": 13024,
    "announced_maison_count": 67.0,
    "announced_maison_avg_m2": 10966.7,
    "estimated_maison_m2_from_ann": 10007
  },
  {
    "quartier": "Bonnevoie",
    "announced_appart_count": 530.0,
    "announced_appart_avg_m2": 10560.37,
    "estimated_appart_m2_from_ann": 9636,
    "announced_maison_count": 64.0,
    "announced_maison_avg_m2": 7593.921,
    "estimated_maison_m2_from_ann": 6929
  },
  {
    "quartier": "Cents",
    "announced_appart_count": 94.0,
    "announced_appart_avg_m2": 8892.141,
    "estimated_appart_m2_from_ann": 8114,
    "announced_maison_count": 121.0,
    "announced_maison_avg_m2": 8181.7,
    "estimated_maison_m2_from_ann": 7466
  },
  {
    "quartier": "Cessange",
    "announced_appart_count": 141.0,
    "announced_appart_avg_m2": 10900.47,
    "estimated_appart_m2_from_ann": 9947,
    "announced_maison_count": 23.0,
    "announced_maison_avg_m2": 8749.626,
    "estimated_maison_m2_from_ann": 7984
  },
  {
    "quartier": "Clausen",
    "announced_appart_count": 14.0,
    "announced_appart_avg_m2": 9959.866,
    "estimated_appart_m2_from_ann": 9088,
    "announced_maison_count": 5.0,
    "announced_maison_avg_m2": null
  },
  {
    "quartier": "Dommeldange",
    "announced_appart_count": 36.0,
    "announced_appart_avg_m2": 9990.104,
    "estimated_appart_m2_from_ann": 9116,
    "announced_maison_count": 12.0,
    "announced_maison_avg_m2": 7256.224,
    "estimated_maison_m2_from_ann": 6621
  },
  {
    "quartier": "Eich",
    "announced_appart_count": 136.0,
    "announced_appart_avg_m2": 11182.46,
    "estimated_appart_m2_from_ann": 10204,
    "announced_maison_count": 10.0,
    "announced_maison_avg_m2": 7110.758,
    "estimated_maison_m2_from_ann": 6489
  },
  {
    "quartier": "Gare",
    "announced_appart_count": 212.0,
    "announced_appart_avg_m2": 10828.69,
    "estimated_appart_m2_from_ann": 9881,
    "announced_maison_count": 117.0,
    "announced_maison_avg_m2": 8092.067,
    "estimated_maison_m2_from_ann": 7384
  },
  {
    "quartier": "Gasperich",
    "announced_appart_count": 303.0,
    "announced_appart_avg_m2": 12289.33,
    "estimated_appart_m2_from_ann": 11214,
    "announced_maison_count": 28.0,
    "announced_maison_avg_m2": 9586.629,
    "estimated_maison_m2_from_ann": 8748
  },
  {
    "quartier": "Grund",
    "announced_appart_count": 2.0,
    "announced_appart_avg_m2": null,
    "announced_maison_count": 3.0,
    "announced_maison_avg_m2": null
  },
  {
    "quartier": "Hamm",
    "announced_appart_count": 52.0,
    "announced_appart_avg_m2": 10558.65,
    "estimated_appart_m2_from_ann": 9635,
    "announced_maison_count": 10.0,
    "announced_maison_avg_m2": 7674.495,
    "estimated_maison_m2_from_ann": 7003
  },
  {
    "quartier": "Hollerich",
    "announced_appart_count": 221.0,
    "announced_appart_avg_m2": 11406.47,
    "estimated_appart_m2_from_ann": 10408,
    "announced_maison_count": 19.0,
    "announced_maison_avg_m2": 9006.511,
    "estimated_maison_m2_from_ann": 8218
  },
  {
    "quartier": "Kirchberg",
    "announced_appart_count": 357.0,
    "announced_appart_avg_m2": 11407.35,
    "estimated_appart_m2_from_ann": 10409,
    "announced_maison_count": 15.0,
    "announced_maison_avg_m2": 7713.11,
    "estimated_maison_m2_from_ann": 7038
  },
  {
    "quartier": "Limpertsberg",
    "announced_appart_count": 362.0,
    "announced_appart_avg_m2": 11977.03,
    "estimated_appart_m2_from_ann": 10929,
    "announced_maison_count": 49.0,
    "announced_maison_avg_m2": 10880.44,
    "estimated_maison_m2_from_ann": 9928
  },
  {
    "quartier": "Luxembourg-Ville",
    "announced_appart_count": 6863.0,
    "announced_appart_avg_m2": 12362.33,
    "estimated_appart_m2_from_ann": 11281,
    "announced_maison_count": 818.0,
    "announced_maison_avg_m2": 8668.662,
    "estimated_maison_m2_from_ann": 7910
  },
  {
    "quartier": "Merl",
    "announced_appart_count": 325.0,
    "announced_appart_avg_m2": 11767.51,
    "estimated_appart_m2_from_ann": 10738,
    "announced_maison_count": 46.0,
    "announced_maison_avg_m2": 8989.389,
    "estimated_maison_m2_from_ann": 8203
  },
  {
    "quartier": "Moyenne nationale",
    "announced_appart_count": 22548.0,
    "announced_appart_avg_m2": 9463.98,
    "estimated_appart_m2_from_ann": 8636,
    "announced_maison_count": 13059.0,
    "announced_maison_avg_m2": 6058.961,
    "estimated_maison_m2_from_ann": 5529
  },
  {
    "quartier": "Mühlenbach",
    "announced_appart_count": 71.0,
    "announced_appart_avg_m2": 11694.98,
    "estimated_appart_m2_from_ann": 10672,
    "announced_maison_count": 32.0,
    "announced_maison_avg_m2": 8133.353,
    "estimated_maison_m2_from_ann": 7422
  },
  {
    "quartier": "Neudorf",
    "announced_appart_count": 1596.0,
    "announced_appart_avg_m2": 13600.66,
    "estimated_appart_m2_from_ann": 12411,
    "announced_maison_count": 23.0,
    "announced_maison_avg_m2": 8726.785,
    "estimated_maison_m2_from_ann": 7963
  },
  {
    "quartier": "Pfaffenthal",
    "announced_appart_count": 22.0,
    "announced_appart_avg_m2": 9665.391,
    "estimated_appart_m2_from_ann": 8820,
    "announced_maison_count": 8.0,
    "announced_maison_avg_m2": null
  },
  {
    "quartier": "Pulvermühle",
    "announced_appart_count": 12.0,
    "announced_appart_avg_m2": 10295.61,
    "estimated_appart_m2_from_ann": 9395,
    "announced_maison_count": 1.0,
    "announced_maison_avg_m2": null
  },
  {
    "quartier": "Rollingergrund",
    "announced_appart_count": 170.0,
    "announced_appart_avg_m2": 11014.29,
    "estimated_appart_m2_from_ann": 10051,
    "announced_maison_count": 32.0,
    "announced_maison_avg_m2": 8524.263,
    "estimated_maison_m2_from_ann": 7778
  },
  {
    "quartier": "Ville-Haute",
    "announced_appart_count": 189.0,
    "announced_appart_avg_m2": 11742.9,
    "estimated_appart_m2_from_ann": 10715,
    "announced_maison_count": 47.0,
    "announced_maison_avg_m2": 9054.428,
    "estimated_maison_m2_from_ann": 8262
  },
  {
    "quartier": "Weimerskirch",
    "announced_appart_count": 65.0,
    "announced_appart_avg_m2": 10062.35,
    "estimated_appart_m2_from_ann": 9182,
    "announced_maison_count": 27.0,
    "announced_maison_avg_m2": 7367.799,
    "estimated_maison_m2_from_ann": 6723
  }
];

/** Helper: trouve la baseline €/m² la plus fiable pour une commune + type. */
export function getBaselinePricePerSqm(
  commune: string,
  type: "appartement" | "maison" = "appartement",
  state: "existing" | "vefa" = "existing"
): { value: number; source: "real_notarial" | "announced_discounted" | "fallback"; confidence: "HIGH" | "MEDIUM" | "LOW" } | null {
  const key = commune.trim().toLowerCase();
  const row = LUXEMBOURG_COMMUNES_PRICES.find((r) => r.commune.toLowerCase() === key);
  if (!row) return null;
  // Priorité 1 : prix réel notarié
  if (type === "appartement") {
    if (state === "vefa" && row.real_vefa_avg_m2)
      return { value: row.real_vefa_avg_m2, source: "real_notarial", confidence: "HIGH" };
    if (state === "existing" && row.real_existing_avg_m2)
      return { value: row.real_existing_avg_m2, source: "real_notarial", confidence: "HIGH" };
    if (row.estimated_appart_m2_from_ann)
      return { value: row.estimated_appart_m2_from_ann, source: "announced_discounted", confidence: "MEDIUM" };
  } else if (type === "maison") {
    if (row.estimated_maison_m2_from_ann)
      return { value: row.estimated_maison_m2_from_ann, source: "announced_discounted", confidence: "MEDIUM" };
  }
  return null;
}

/** Helper: même chose pour un quartier de Luxembourg-Ville. */
export function getBaselinePriceVdlQuartier(
  quartier: string,
  type: "appartement" | "maison" = "appartement"
): { value: number; source: "announced_discounted"; confidence: "MEDIUM" } | null {
  const key = quartier.trim().toLowerCase();
  const row = VDL_QUARTIERS_PRICES.find((r) => r.quartier.toLowerCase() === key);
  if (!row) return null;
  if (type === "appartement" && row.estimated_appart_m2_from_ann)
    return { value: row.estimated_appart_m2_from_ann, source: "announced_discounted", confidence: "MEDIUM" };
  if (type === "maison" && row.estimated_maison_m2_from_ann)
    return { value: row.estimated_maison_m2_from_ann, source: "announced_discounted", confidence: "MEDIUM" };
  return null;
}

/*
 * Baselines €/m² appartements 2026 — calibrées MAPA Property.
 *
 * Méthodologie : prix de transaction réel = prix affiché × (1 − décote).
 * Décote MAPA Property : -6.5% appart sur prix affichés observés 2026.
 * Source : observation marché LU 2026 + Observatoire de l'Habitat
 * + STATEC + données internes MAPA Property (transactions notariales).
 *
 * Bonus "neuf" :
 * - Zone PRIME LU-Ville (19 quartiers) : +20% sur baseline ancien
 * - Reste LU : +10% sur baseline ancien
 */
export interface ApartmentBaseline {
  commune: string;
  /** Baseline marché (mix états) €/m². */
  pricePerM2_ancien: number;
  /** Baseline si state="new" €/m². */
  pricePerM2_neuf: number;
}

/** Clé normalisée : minuscules, sans accents, séparateurs → '-'. */
function normBaselineKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const APARTMENT_BASELINES: Record<string, ApartmentBaseline> = {
  // ============ LUXEMBOURG-VILLE (Zone PRIME, neuf +20%) ============
  weimershof: { commune: "Weimershof", pricePerM2_ancien: 12444, pricePerM2_neuf: 14933 },
  belair: { commune: "Belair", pricePerM2_ancien: 12008, pricePerM2_neuf: 11780 },
  hollerich: { commune: "Hollerich", pricePerM2_ancien: 11255, pricePerM2_neuf: 13506 },
  merl: { commune: "Merl", pricePerM2_ancien: 10752, pricePerM2_neuf: 12902 },
  "centre-ville": { commune: "Centre-ville", pricePerM2_ancien: 10449, pricePerM2_neuf: 12539 },
  centre: { commune: "Centre-ville", pricePerM2_ancien: 10449, pricePerM2_neuf: 12539 },
  luxembourg: { commune: "Luxembourg", pricePerM2_ancien: 10449, pricePerM2_neuf: 12539 },
  limpertsberg: { commune: "Limpertsberg", pricePerM2_ancien: 10385, pricePerM2_neuf: 12462 },
  kirchberg: { commune: "Kirchberg", pricePerM2_ancien: 10118, pricePerM2_neuf: 12142 },
  "gasperich-cloche-d-or": { commune: "Gasperich-Cloche-d-Or", pricePerM2_ancien: 9948, pricePerM2_neuf: 11938 },
  gasperich: { commune: "Gasperich-Cloche-d-Or", pricePerM2_ancien: 9948, pricePerM2_neuf: 11938 },
  "cloche-d-or": { commune: "Gasperich-Cloche-d-Or", pricePerM2_ancien: 9948, pricePerM2_neuf: 11938 },
  cessange: { commune: "Cessange", pricePerM2_ancien: 9809, pricePerM2_neuf: 11771 },
  muhlenbach: { commune: "Muhlenbach", pricePerM2_ancien: 9544, pricePerM2_neuf: 11453 },
  rollingergrund: { commune: "Rollingergrund", pricePerM2_ancien: 9515, pricePerM2_neuf: 11418 },
  neudorf: { commune: "Neudorf", pricePerM2_ancien: 9463, pricePerM2_neuf: 11356 },
  gare: { commune: "Gare", pricePerM2_ancien: 8200, pricePerM2_neuf: 9840 },
  beggen: { commune: "Beggen", pricePerM2_ancien: 9357, pricePerM2_neuf: 11228 },
  bonnevoie: { commune: "Bonnevoie", pricePerM2_ancien: 9334, pricePerM2_neuf: 11201 },
  eich: { commune: "Eich", pricePerM2_ancien: 8877, pricePerM2_neuf: 10652 },
  dommeldange: { commune: "Dommeldange", pricePerM2_ancien: 8786, pricePerM2_neuf: 10543 },
  cents: { commune: "Cents", pricePerM2_ancien: 8477, pricePerM2_neuf: 10172 },
  weimerskirch: { commune: "Weimerskirch", pricePerM2_ancien: 8030, pricePerM2_neuf: 9636 },

  // ============ 1ÈRE COURONNE (neuf +10%) ============
  strassen: { commune: "Strassen", pricePerM2_ancien: 9608, pricePerM2_neuf: 10569 },
  bertrange: { commune: "Bertrange", pricePerM2_ancien: 9122, pricePerM2_neuf: 10034 },
  bereldange: { commune: "Bereldange", pricePerM2_ancien: 9354, pricePerM2_neuf: 10289 },
  walferdange: { commune: "Walferdange", pricePerM2_ancien: 8935, pricePerM2_neuf: 9829 },
  steinsel: { commune: "Steinsel", pricePerM2_ancien: 8798, pricePerM2_neuf: 9678 },
  howald: { commune: "Howald", pricePerM2_ancien: 8693, pricePerM2_neuf: 9562 },
  helmsange: { commune: "Helmsange", pricePerM2_ancien: 8577, pricePerM2_neuf: 9435 },
  hesperange: { commune: "Hesperange", pricePerM2_ancien: 7968, pricePerM2_neuf: 8765 },
  bridel: { commune: "Bridel", pricePerM2_ancien: 7936, pricePerM2_neuf: 8730 },
  mamer: { commune: "Mamer", pricePerM2_ancien: 8704, pricePerM2_neuf: 9574 },
  leudelange: { commune: "Leudelange", pricePerM2_ancien: 7985, pricePerM2_neuf: 8784 },
  kopstal: { commune: "Kopstal", pricePerM2_ancien: 7700, pricePerM2_neuf: 8470 },

  // ============ 2ÈME COURONNE OUEST ============
  steinfort: { commune: "Steinfort", pricePerM2_ancien: 7814, pricePerM2_neuf: 8595 },
  capellen: { commune: "Capellen", pricePerM2_ancien: 7775, pricePerM2_neuf: 8553 },
  kehlen: { commune: "Kehlen", pricePerM2_ancien: 8414, pricePerM2_neuf: 9255 },
  hobscheid: { commune: "Hobscheid", pricePerM2_ancien: 5471, pricePerM2_neuf: 6018 },
  koerich: { commune: "Koerich", pricePerM2_ancien: 7295, pricePerM2_neuf: 8025 },
  kaerjeng: { commune: "Käerjeng", pricePerM2_ancien: 6732, pricePerM2_neuf: 7405 },
  mersch: { commune: "Mersch", pricePerM2_ancien: 7585, pricePerM2_neuf: 8344 },
  lorentzweiler: { commune: "Lorentzweiler", pricePerM2_ancien: 7743, pricePerM2_neuf: 8517 },

  // ============ NORD/EST ============
  schuttrange: { commune: "Schuttrange", pricePerM2_ancien: 8535, pricePerM2_neuf: 9388 },
  alzingen: { commune: "Alzingen", pricePerM2_ancien: 8480, pricePerM2_neuf: 9328 },
  itzig: { commune: "Itzig", pricePerM2_ancien: 8098, pricePerM2_neuf: 8908 },
  moutfort: { commune: "Moutfort", pricePerM2_ancien: 8079, pricePerM2_neuf: 8887 },
  fentange: { commune: "Fentange", pricePerM2_ancien: 8068, pricePerM2_neuf: 8875 },
  junglinster: { commune: "Junglinster", pricePerM2_ancien: 7904, pricePerM2_neuf: 8694 },
  contern: { commune: "Contern", pricePerM2_ancien: 7899, pricePerM2_neuf: 8689 },
  sandweiler: { commune: "Sandweiler", pricePerM2_ancien: 7480, pricePerM2_neuf: 8228 },
  heisdorf: { commune: "Heisdorf", pricePerM2_ancien: 7685, pricePerM2_neuf: 8454 },
  nospelt: { commune: "Nospelt", pricePerM2_ancien: 7728, pricePerM2_neuf: 8501 },
  olm: { commune: "Olm", pricePerM2_ancien: 7277, pricePerM2_neuf: 8005 },

  // ============ SUD (bassin minier) ============
  belval: { commune: "Belval", pricePerM2_ancien: 8000, pricePerM2_neuf: 8800 },
  "esch-sur-alzette": { commune: "Esch-sur-Alzette", pricePerM2_ancien: 6131, pricePerM2_neuf: 6744 },
  esch: { commune: "Esch-sur-Alzette", pricePerM2_ancien: 6131, pricePerM2_neuf: 6744 },
  differdange: { commune: "Differdange", pricePerM2_ancien: 6046, pricePerM2_neuf: 6651 },
  dudelange: { commune: "Dudelange", pricePerM2_ancien: 6298, pricePerM2_neuf: 6928 },
  petange: { commune: "Pétange", pricePerM2_ancien: 6217, pricePerM2_neuf: 6839 },
  belvaux: { commune: "Belvaux", pricePerM2_ancien: 6025, pricePerM2_neuf: 6628 },
  schifflange: { commune: "Schifflange", pricePerM2_ancien: 6735, pricePerM2_neuf: 7408 },
  bettembourg: { commune: "Bettembourg", pricePerM2_ancien: 6754, pricePerM2_neuf: 7429 },
  soleuvre: { commune: "Soleuvre", pricePerM2_ancien: 6005, pricePerM2_neuf: 6606 },
  sanem: { commune: "Sanem", pricePerM2_ancien: 6016, pricePerM2_neuf: 6618 },
  rumelange: { commune: "Rumelange", pricePerM2_ancien: 5734, pricePerM2_neuf: 6307 },
  kayl: { commune: "Kayl", pricePerM2_ancien: 6105, pricePerM2_neuf: 6716 },
  oberkorn: { commune: "Oberkorn", pricePerM2_ancien: 6060, pricePerM2_neuf: 6666 },
  niederkorn: { commune: "Niederkorn", pricePerM2_ancien: 6031, pricePerM2_neuf: 6634 },
  rodange: { commune: "Rodange", pricePerM2_ancien: 6012, pricePerM2_neuf: 6613 },

  // ============ NORD ============
  wiltz: { commune: "Wiltz", pricePerM2_ancien: 4640, pricePerM2_neuf: 5104 },
  clervaux: { commune: "Clervaux", pricePerM2_ancien: 4347, pricePerM2_neuf: 4782 },
  ettelbruck: { commune: "Ettelbruck", pricePerM2_ancien: 5541, pricePerM2_neuf: 6095 },
  diekirch: { commune: "Diekirch", pricePerM2_ancien: 6650, pricePerM2_neuf: 7315 },
  vianden: { commune: "Vianden", pricePerM2_ancien: 4470, pricePerM2_neuf: 4917 },
  mertzig: { commune: "Mertzig", pricePerM2_ancien: 5738, pricePerM2_neuf: 6312 },
  echternach: { commune: "Echternach", pricePerM2_ancien: 6119, pricePerM2_neuf: 6731 },
  beaufort: { commune: "Beaufort", pricePerM2_ancien: 6325, pricePerM2_neuf: 6958 },
  larochette: { commune: "Larochette", pricePerM2_ancien: 5504, pricePerM2_neuf: 6054 },
  consdorf: { commune: "Consdorf", pricePerM2_ancien: 5578, pricePerM2_neuf: 6136 },
  mondercange: { commune: "Mondercange", pricePerM2_ancien: 6034, pricePerM2_neuf: 6637 },
  bissen: { commune: "Bissen", pricePerM2_ancien: 6012, pricePerM2_neuf: 6613 },
};

/**
 * Baseline appartement MAPA pour une commune (+ quartier LU-Ville prioritaire).
 * Retourne null si aucune baseline (fallback géré en amont par le moteur).
 */
export function getApartmentBaseline(
  commune: string,
  quartier?: string,
): ApartmentBaseline | null {
  if (quartier) {
    const q = APARTMENT_BASELINES[normBaselineKey(quartier)];
    if (q) return q;
  }
  if (!commune) return null;
  return APARTMENT_BASELINES[normBaselineKey(commune)] ?? null;
}
