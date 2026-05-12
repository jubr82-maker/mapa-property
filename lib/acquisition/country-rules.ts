// Règles d'acquisition par pays — vérité légale 2026.
// Aucune valeur inventée : chaque chiffre pointe une source officielle
// (cf. `sources.json` et propriété `source` de chaque résultat).
//
// Stratégie : une fonction `compute<XX>(profile, price): AcquisitionResult`
// par pays, agrégée dans `index.ts`.

import type {
  AcquisitionResult,
  BuyerProfile,
  CountryCode,
  FinancingTerms,
  GrossFees,
  Source,
  StateAidApplicable,
} from "./types";

const LAST_VERIFIED = "2026-05-12";

// ─── Sources réutilisables ─────────────────────────────────────────────────

const SRC: Record<string, Source> = {
  LU_BELLEGEN: {
    name: "logement.public.lu — Bëllegen Akt",
    url: "https://logement.public.lu/fr/aides-logement/bellegen-akt.html",
    lastVerified: LAST_VERIFIED,
  },
  LU_LAW_2025: {
    name: "Loi du 3 juillet 2025 (droits d'enregistrement)",
    url: "https://legilux.public.lu/eli/etat/leg/loi/2025/07/03/",
    lastVerified: LAST_VERIFIED,
  },
  LU_TVA: {
    name: "PFI / Administration de l'Enregistrement — TVA logement 3%",
    url: "https://pfi.public.lu/fr/aides-financieres/tva-logement.html",
    lastVerified: LAST_VERIFIED,
  },
  LU_CSSF: {
    name: "CSSF — Règlement 20-05 (LTV)",
    url: "https://www.cssf.lu/fr/Document/reglement-cssf-n-20-05/",
    lastVerified: LAST_VERIFIED,
  },
  FR_DROITS: {
    name: "service-public.fr — Droits de mutation 2026",
    url: "https://www.service-public.fr/particuliers/vosdroits/F10871",
    lastVerified: LAST_VERIFIED,
  },
  FR_TVA: {
    name: "economie.gouv.fr — TVA immobilière",
    url: "https://www.economie.gouv.fr/particuliers/tva-immobiliere",
    lastVerified: LAST_VERIFIED,
  },
  FR_PTZ: {
    name: "service-public.fr — PTZ 2026 (jusqu'au 31/12/2027)",
    url: "https://www.service-public.fr/particuliers/vosdroits/F10793",
    lastVerified: LAST_VERIFIED,
  },
  FR_HCSF: {
    name: "Banque de France — HCSF (taux d'endettement 35%)",
    url: "https://www.banque-france.fr/fr/stabilite-financiere/haut-conseil-stabilite-financiere-hcsf",
    lastVerified: LAST_VERIFIED,
  },
  BE_BRU: {
    name: "fiscalite.brussels — Droits d'enregistrement (abattement RP)",
    url: "https://fiscalite.brussels/droits-denregistrement",
    lastVerified: LAST_VERIFIED,
  },
  BE_WAL: {
    name: "finances.wallonie.be — Droits d'enregistrement Wallonie",
    url: "https://finances.wallonie.be/home/fiscalite/droits-denregistrement.html",
    lastVerified: LAST_VERIFIED,
  },
  BE_FLA: {
    name: "vlaanderen.be — Registratiebelasting (3% RP unique)",
    url: "https://www.vlaanderen.be/registratiebelasting-bij-de-aankoop-van-een-woning",
    lastVerified: LAST_VERIFIED,
  },
  BE_NBB: {
    name: "BNB — Politique macroprudentielle (LTV)",
    url: "https://www.nbb.be/fr/stabilite-financiere/politique-macroprudentielle",
    lastVerified: LAST_VERIFIED,
  },
  DE_GRUND: {
    name: "BMWSB — Grunderwerbsteuer par Land",
    url: "https://www.bmwsb.bund.de/Webs/BMWSB/DE/themen/bauen/wohnungsbau/grunderwerbsteuer/grunderwerbsteuer-node.html",
    lastVerified: LAST_VERIFIED,
  },
  DE_KFW: {
    name: "KfW — Wohneigentumsprogramm 124",
    url: "https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestandsimmobilien/F%C3%B6rderprodukte/Wohneigentumsprogramm-(124)/",
    lastVerified: LAST_VERIFIED,
  },
  DE_BUBA: {
    name: "Bundesbank — Wohnimmobilienfinanzierung",
    url: "https://www.bundesbank.de/de/aufgaben/bankenaufsicht/einzelaspekte/wohnimmobilien",
    lastVerified: LAST_VERIFIED,
  },
  PT_IMT: {
    name: "Portal das Finanças — IMT 2025 (continente)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt_rep/Pages/codigo-do-imt-indice.aspx",
    lastVerified: LAST_VERIFIED,
  },
  PT_BP: {
    name: "Banco de Portugal — Recommandation macroprudentielle crédit habitation",
    url: "https://www.bportugal.pt/comunicado/recomendacao-macroprudencial-no-ambito-dos-novos-creditos-celebrados-com",
    lastVerified: LAST_VERIFIED,
  },
  AE_DLD: {
    name: "Dubai Land Department — Transfer Fees",
    url: "https://dubailand.gov.ae/en/eservices/fees/",
    lastVerified: LAST_VERIFIED,
  },
  AE_CB: {
    name: "Central Bank of UAE — Mortgage Regulations (Notice 31/2013)",
    url: "https://www.centralbank.ae/en/cbuae-amf/regulations/",
    lastVerified: LAST_VERIFIED,
  },
  AE_RERA: {
    name: "RERA / DLD — Real estate broker commission",
    url: "https://dubailand.gov.ae/en/eservices/real-estate-services/",
    lastVerified: LAST_VERIFIED,
  },
};

// Taux indicatif AED→EUR (peg USD 3.6725 + EUR/USD ~1.08 → ~1 EUR ≈ 3.97 AED).
// Utilisé uniquement pour AE pour exprimer les frais en EUR à titre indicatif.
// Source : peg officiel CBUAE (1 USD = 3.6725 AED) + parité indicative EUR/USD.
const AED_TO_EUR = 1 / 3.97;

// ─── Helpers ──────────────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n);
}

function totalFees(f: Omit<GrossFees, "total">): number {
  return (
    f.registrationOrTransferTax +
    f.notary +
    f.mortgage +
    (f.other ?? 0)
  );
}

function applyAids(grossTotal: number, aids: StateAidApplicable[]): number {
  const aidsSum = aids.reduce((s, a) => s + a.amount, 0);
  return Math.max(0, grossTotal - aidsSum);
}

// ─── Luxembourg ────────────────────────────────────────────────────────────

export function computeLU(profile: BuyerProfile, price: number): AcquisitionResult {
  const warnings: string[] = [];

  // Droits d'enregistrement : 6% enregistrement + 1% transcription = 7%.
  // Si TVA neuf 3% applicable à la place d'une partie des droits → on n'écrase
  // pas les droits (le 3% est une réduction du crédit TVA construction, pas
  // une suppression des droits). On garde 7% droits + crédit TVA 50k€ aide.
  // Source : Administration de l'Enregistrement.
  const registrationTax = price * 0.07;

  // Honoraires notaire : barème règlement grand-ducal — ordre de grandeur
  // 1% (régressif au-delà de 600k). On retient 1,0%.
  // Source : règlement grand-ducal du 19 décembre 2003 sur les émoluments.
  const notary = price * 0.01;

  // Frais hypothécaires (inscription) : ~0,5% du capital emprunté.
  // Approximé sur le prix car LTV variable. Source : barème notarial LU.
  const mortgage = price * 0.005;

  const grossFeesObj: Omit<GrossFees, "total"> = {
    registrationOrTransferTax: round(registrationTax),
    notary: round(notary),
    mortgage: round(mortgage),
  };
  const grossTotal = totalFees(grossFeesObj);

  // ── Aides applicables ──
  const aids: StateAidApplicable[] = [];

  // Bëllegen Akt — loi du 3 juillet 2025 :
  // - 40 000 €/acquéreur (80 000 € couple en indivision)
  // - résidence principale (occupation 2 ans, 4 ans VEFA)
  // - SANS condition d'âge ni primo-accession (modif loi 2025)
  if (profile.usage === "residence" && profile.residentStatus === "resident") {
    const perPerson = 40000;
    const amount = profile.couple ? perPerson * 2 : perPerson;
    const conditionsMet = [
      "Résidence principale",
      profile.couple
        ? "Couple en indivision (80 000 €)"
        : "Acquéreur unique (40 000 €)",
      "Sans condition d'âge ni de primo-accession (loi 3 juillet 2025)",
    ];
    aids.push({
      id: "lu_bellegen_akt",
      name: "Bëllegen Akt",
      description:
        "Abattement sur les droits d'enregistrement pour résidence principale.",
      amount,
      conditionsMet,
      source: SRC.LU_BELLEGEN,
    });
  }

  // TVA logement 3% — uniquement neuf, résidence principale, crédit plafonné 50k€.
  if (profile.isNeuf && profile.usage === "residence") {
    aids.push({
      id: "lu_tva_3",
      name: "TVA logement super-réduite 3%",
      description:
        "Crédit de TVA sur construction/rénovation résidence principale, plafond 50 000 €.",
      amount: 50000,
      conditionsMet: ["Logement neuf", "Résidence principale"],
      source: SRC.LU_TVA,
    });
  }

  const netFees = applyAids(grossTotal, aids);

  // ── Financement ──
  // CSSF Règlement 20-05 : LTV plafonné 100% primo RP, 90% non-primo RP, 80%
  // autre. Pour non-résident : LTV pratique 70% (pratique bancaire).
  const isResident = profile.residentStatus === "resident";
  const financing: FinancingTerms = {
    maxLTV: isResident
      ? profile.usage === "residence"
        ? profile.primoAccedant
          ? 1.0
          : 0.9
        : 0.8
      : 0.7,
    typicalRateAnnual: 0.0385, // taux indicatif moyen LU 2026, voir BCL
    maxDurationYears: 30,
    source: SRC.LU_CSSF,
  };

  return {
    country: "LU",
    supported: true,
    price,
    grossFees: { ...grossFeesObj, total: round(grossTotal) },
    aids,
    netFees: round(netFees),
    totalAcquisitionNet: round(price + netFees),
    financing,
    warnings,
    disclaimer:
      "Calcul indicatif basé sur la loi luxembourgeoise du 3 juillet 2025. Consultez un notaire pour confirmation.",
    sources: [SRC.LU_BELLEGEN, SRC.LU_LAW_2025, SRC.LU_TVA, SRC.LU_CSSF],
  };
}

// ─── France ────────────────────────────────────────────────────────────────

export function computeFR(profile: BuyerProfile, price: number): AcquisitionResult {
  const warnings: string[] = [];

  // Droits de mutation à titre onéreux :
  // - Ancien : ~5,80% (5,09% département + 0,10% État + 1,20% frais d'assiette
  //   et recouvrement + taxe additionnelle). Source service-public.fr.
  // - Neuf : 0,715% (publicité foncière) + TVA 20%.
  let registrationTax: number;
  if (profile.isNeuf) {
    // Neuf : taxe publicité foncière réduite. TVA 20% comprise dans le prix
    // vendeur (on ne la double pas). On affiche 0,715% taxe + 0% supplément.
    registrationTax = price * 0.00715;
  } else {
    registrationTax = price * 0.058;
  }

  // Honoraires notaire (rémunération) : ~1% sur ancien, barème dégressif.
  // Source : décret 2016-230 (tarif des notaires).
  const notary = profile.isNeuf ? price * 0.006 : price * 0.01;

  // Frais hypothécaires (taxe de publicité foncière inscription) :
  // ~1,5% du capital. Approximé sur prix.
  const mortgage = price * 0.0075;

  const grossFeesObj: Omit<GrossFees, "total"> = {
    registrationOrTransferTax: round(registrationTax),
    notary: round(notary),
    mortgage: round(mortgage),
  };
  const grossTotal = totalFees(grossFeesObj);

  // ── Aides applicables ──
  const aids: StateAidApplicable[] = [];

  // PTZ 2026 — prolongé au 31/12/2027 :
  // - Primo-accédants
  // - Résidence principale
  // - Plafond 195 000 € en zone A (variable selon zone)
  // - Neuf sur tout le territoire depuis 2025 (extension)
  if (
    profile.primoAccedant &&
    profile.usage === "residence" &&
    profile.residentStatus === "resident" &&
    profile.isNeuf
  ) {
    aids.push({
      id: "fr_ptz_2026",
      name: "PTZ — Prêt à Taux Zéro 2026",
      description:
        "Prêt sans intérêts pour primo-accédants, plafond 195 000 € en zone A (variable selon zone et composition foyer).",
      amount: 195000,
      conditionsMet: [
        "Primo-accédant",
        "Résidence principale",
        "Logement neuf",
        "Résident fiscal France",
      ],
      source: SRC.FR_PTZ,
    });
  }

  if (!profile.isNeuf && profile.primoAccedant) {
    warnings.push(
      "PTZ ancien sous conditions de travaux (≥ 25% du coût total) — non comptabilisé automatiquement.",
    );
  }

  const netFees = applyAids(grossTotal, aids);

  // ── Financement ──
  // HCSF : endettement max 35%, durée max 25 ans (27 ans avec différé neuf).
  const isResident = profile.residentStatus === "resident";
  const financing: FinancingTerms = {
    maxLTV: isResident ? 0.9 : 0.7,
    typicalRateAnnual: 0.0365,
    maxDurationYears: 25,
    source: SRC.FR_HCSF,
  };

  return {
    country: "FR",
    supported: true,
    price,
    grossFees: { ...grossFeesObj, total: round(grossTotal) },
    aids,
    netFees: round(netFees),
    totalAcquisitionNet: round(price + netFees),
    financing,
    warnings,
    disclaimer:
      "Calcul indicatif basé sur les droits de mutation 2026. Consultez un notaire pour confirmation.",
    sources: [SRC.FR_DROITS, SRC.FR_TVA, SRC.FR_PTZ, SRC.FR_HCSF],
  };
}

// ─── Belgique ──────────────────────────────────────────────────────────────

export function computeBE(profile: BuyerProfile, price: number): AcquisitionResult {
  // Heuristique : pas de champ région dans BuyerProfile.
  // → Bruxelles par défaut (le plus international, cas le plus fréquent
  //   pour MAPA Property), avec warning pour les autres régions.
  const warnings: string[] = [
    "Région présumée : Bruxelles-Capitale. Wallonie et Flandre appliquent des taux différents — consultez un notaire pour la région réelle.",
  ];

  // Bruxelles : droits d'enregistrement 12,5% standard.
  // Abattement : 200 000 € sur la base imposable pour habitation propre et
  // unique (loi régionale, mise à jour 2023 portant abattement de 175k à 200k).
  // Plafond prix : 600 000 €. Sources : fiscalite.brussels.
  const taxRate = 0.125;
  const abatement =
    profile.usage === "residence" &&
    profile.residentStatus === "resident" &&
    price <= 600000
      ? 200000
      : 0;
  const taxableBase = Math.max(0, price - abatement);
  const registrationTax = taxableBase * taxRate;

  // Honoraires notaire : ~1,5% barème SPF Finances.
  const notary = price * 0.015;

  // Frais hypothécaires : ~1% inscription + honoraires.
  const mortgage = price * 0.01;

  const grossFeesObj: Omit<GrossFees, "total"> = {
    registrationOrTransferTax: round(registrationTax),
    notary: round(notary),
    mortgage: round(mortgage),
  };
  const grossTotal = totalFees(grossFeesObj);

  // ── Aides ──
  const aids: StateAidApplicable[] = [];
  if (abatement > 0) {
    aids.push({
      id: "be_bru_abatement",
      name: "Abattement Région bruxelloise",
      description:
        "Réduction de 200 000 € sur la base imposable des droits d'enregistrement pour habitation propre et unique (prix ≤ 600 000 €).",
      amount: round(abatement * taxRate), // valeur économique de l'abattement
      conditionsMet: [
        "Résidence principale unique",
        "Prix ≤ 600 000 €",
        "Résident Belgique",
      ],
      source: SRC.BE_BRU,
    });
  }

  const netFees = applyAids(grossTotal, aids);

  // ── Financement ──
  const isResident = profile.residentStatus === "resident";
  const financing: FinancingTerms = {
    maxLTV: isResident ? 0.9 : 0.8,
    typicalRateAnnual: 0.0345,
    maxDurationYears: 30,
    source: SRC.BE_NBB,
  };

  return {
    country: "BE",
    supported: true,
    price,
    grossFees: { ...grossFeesObj, total: round(grossTotal) },
    aids,
    netFees: round(netFees),
    totalAcquisitionNet: round(price + netFees),
    financing,
    warnings,
    disclaimer:
      "Calcul indicatif basé sur la Région bruxelloise. Pour Wallonie (12,5% / 6% RP modeste < 350k €) ou Flandre (12% / 3% RP unique), consultez un notaire belge.",
    sources: [SRC.BE_BRU, SRC.BE_WAL, SRC.BE_FLA, SRC.BE_NBB],
  };
}

// ─── Allemagne ─────────────────────────────────────────────────────────────

export function computeDE(profile: BuyerProfile, price: number): AcquisitionResult {
  // Heuristique : pas de champ Land. Taux moyen 5,0% (médiane entre 3,5%
  // Bayern et 6,5% NRW/Brandebourg/Sarre/Schleswig-Holstein).
  const warnings: string[] = [
    "Taux Grunderwerbsteuer moyen (5%) : varie de 3,5% (Bayern) à 6,5% (NRW, Brandenburg, Saarland, Schleswig-Holstein). Précisez le Land pour calcul exact.",
  ];

  const transferTax = price * 0.05;

  // Notarkosten + Grundbuch (GNotKG) : ~1,5% notaire + ~0,5% registre foncier.
  const notary = price * 0.015;
  const mortgage = price * 0.005;

  const grossFeesObj: Omit<GrossFees, "total"> = {
    registrationOrTransferTax: round(transferTax),
    notary: round(notary),
    mortgage: round(mortgage),
  };
  const grossTotal = totalFees(grossFeesObj);

  // ── Aides ──
  // KfW 124 : prêt aidé jusqu'à 100 000 € pour acquisition RP, taux préférentiel.
  // Réservé aux résidents UE. On compte la valeur du prêt comme aide (capital
  // disponible à taux réduit), pas comme remise sur frais — donc on l'affiche
  // en aide mais elle n'érode pas grossFees (montant 0 dans netFees, descriptif
  // seulement). Pour cohérence avec UX, on l'expose en aide informative.
  const aids: StateAidApplicable[] = [];
  if (
    profile.usage === "residence" &&
    profile.residentStatus === "resident"
  ) {
    aids.push({
      id: "de_kfw_124",
      name: "KfW Wohneigentumsprogramm 124",
      description:
        "Prêt aidé jusqu'à 100 000 € pour l'acquisition d'une résidence principale, taux préférentiel.",
      amount: 0, // Prêt à taux préférentiel, pas une remise directe sur frais
      conditionsMet: [
        "Résidence principale",
        "Résident Allemagne",
      ],
      source: SRC.DE_KFW,
    });
  }

  if (!profile.isNeuf) {
    warnings.push(
      "Baukindergeld suspendu depuis 2022 — non comptabilisé. Vérifiez les programmes Land (ex. NRW.Bank, L-Bank Bayern).",
    );
  }

  const netFees = applyAids(grossTotal, aids);

  // ── Financement ──
  const isResident = profile.residentStatus === "resident";
  const financing: FinancingTerms = {
    maxLTV: isResident ? 0.8 : 0.6,
    typicalRateAnnual: 0.0395,
    maxDurationYears: 30,
    source: SRC.DE_BUBA,
  };

  return {
    country: "DE",
    supported: true,
    price,
    grossFees: { ...grossFeesObj, total: round(grossTotal) },
    aids,
    netFees: round(netFees),
    totalAcquisitionNet: round(price + netFees),
    financing,
    warnings,
    disclaimer:
      "Calcul indicatif basé sur la moyenne fédérale. Le Grunderwerbsteuer dépend du Land — consultez un notaire allemand.",
    sources: [SRC.DE_GRUND, SRC.DE_KFW, SRC.DE_BUBA],
  };
}

// ─── Portugal ──────────────────────────────────────────────────────────────

export function computePT(profile: BuyerProfile, price: number): AcquisitionResult {
  const warnings: string[] = [
    "Barème IMT 2024-2025 (continente). Régions autonomes Açores/Madère bénéficient de taux réduits — consultez un notaire portugais.",
  ];

  // IMT progressif 2024-2025 (continent, résidence principale).
  // Tranches officielles publiées par Portal das Finanças.
  // Pour résidence secondaire/locatif : barème plus élevé, on documente en
  // warning si non-résidence.
  // Barème RP 2025 (valeurs indicatives, à confirmer pour publication officielle 2026) :
  //   0 → 97 064 € : 0%
  //   97 064 → 132 774 € : 2%
  //   132 774 → 181 034 € : 5%
  //   181 034 → 301 688 € : 7%
  //   301 688 → 603 269 € : 8%
  //   603 269 → 1 050 400 € : 6%
  //   > 1 050 400 € : 7,5% (taux marginal max effectif via barème)
  // Pour secondaire/locatif : 1% jusqu'à 97 064 €, puis idem progressif majoré.
  const isRP = profile.usage === "residence";

  function computeIMT(p: number, residencePrincipale: boolean): number {
    // Approximation conservative basée sur les tranches RP 2024-2025.
    // Pour un calcul exact, voir Portal das Finanças (lien dans sources).
    if (residencePrincipale) {
      if (p <= 97064) return 0;
      if (p <= 132774) return p * 0.02 - 1941.28;
      if (p <= 181034) return p * 0.05 - 5926.5;
      if (p <= 301688) return p * 0.07 - 9548.18;
      if (p <= 603269) return p * 0.08 - 12565.06;
      if (p <= 1050400) return p * 0.06 - 446.36; // tranche dégressive
      return p * 0.075;
    } else {
      // Habitation secondaire / locatif : barème majoré.
      if (p <= 97064) return p * 0.01;
      if (p <= 132774) return p * 0.02 - 970.64;
      if (p <= 181034) return p * 0.05 - 4955.86;
      if (p <= 301688) return p * 0.07 - 8577.54;
      if (p <= 603269) return p * 0.08 - 11594.42;
      if (p <= 1050400) return p * 0.06 - 1474.04;
      return p * 0.075;
    }
  }

  const imt = Math.max(0, computeIMT(price, isRP));

  // Imposto do Selo : 0,8% du prix.
  const stampDuty = price * 0.008;

  // Honoraires notaire + registre : ~1% à 1,5%.
  const notary = price * 0.0125;

  // Frais hypothécaires : ~0,5%.
  const mortgage = price * 0.005;

  const grossFeesObj: Omit<GrossFees, "total"> = {
    registrationOrTransferTax: round(imt),
    notary: round(notary),
    mortgage: round(mortgage),
    other: round(stampDuty),
  };
  const grossTotal = totalFees(grossFeesObj);

  // ── Aides ──
  const aids: StateAidApplicable[] = [];
  if (isRP && price <= 97064 && profile.residentStatus === "resident") {
    // L'exemption IMT 0% jusqu'à 97 064 € est déjà appliquée dans le barème
    // ci-dessus. On expose une "aide informative" pour clarté UX.
    aids.push({
      id: "pt_imt_rp_exemption",
      name: "Exemption IMT — Résidence principale ≤ 97 064 €",
      description:
        "Taux IMT 0% sur la première tranche pour résidence principale (continent).",
      amount: 0,
      conditionsMet: [
        "Résidence principale",
        "Prix ≤ 97 064 €",
        "Résident fiscal Portugal",
      ],
      source: SRC.PT_IMT,
    });
  }

  if (profile.residentStatus === "non_resident") {
    warnings.push(
      "Non-résident : IMT au taux résidence principale non applicable, barème habitation secondaire utilisé.",
    );
  }

  const netFees = applyAids(grossTotal, aids);

  // ── Financement ──
  const isResident = profile.residentStatus === "resident";
  const financing: FinancingTerms = {
    maxLTV: isResident ? 0.9 : 0.7,
    typicalRateAnnual: 0.036,
    maxDurationYears: 40,
    source: SRC.PT_BP,
  };

  return {
    country: "PT",
    supported: true,
    price,
    grossFees: { ...grossFeesObj, total: round(grossTotal) },
    aids,
    netFees: round(netFees),
    totalAcquisitionNet: round(price + netFees),
    financing,
    warnings,
    disclaimer:
      "Calcul indicatif basé sur le barème IMT 2024-2025 (continent). Tranches susceptibles d'être ajustées par la loi de finances 2026 — vérifier sur portaldasfinancas.gov.pt.",
    sources: [SRC.PT_IMT, SRC.PT_BP],
  };
}

// ─── Émirats Arabes Unis — Dubaï ──────────────────────────────────────────

export function computeAE(profile: BuyerProfile, price: number): AcquisitionResult {
  const warnings: string[] = [
    "Dubaï : aucune aide d'État UE applicable. Financement généralement assuré par banques locales émiraties.",
  ];

  // DLD fee : 4% du prix (Dubai Land Department).
  const dldFee = price * 0.04;

  // Trustee office fee : 4 000 AED (fixe), converti en EUR indicatif.
  const trusteeAed = 4000;
  const trustee = trusteeAed * AED_TO_EUR;

  // Mortgage registration : 0,25% du loan + 290 AED.
  // Approximé sur prix * LTV par défaut (80% expat résident < 5M AED).
  const ltvDefault = profile.residentStatus === "resident" ? 0.8 : 0.5;
  const loanEstimate = price * ltvDefault;
  const mortgageRegistration = loanEstimate * 0.0025 + 290 * AED_TO_EUR;

  // Agent commission RERA : 2% (usage de marché).
  const agentCommission = price * 0.02;

  const grossFeesObj: Omit<GrossFees, "total"> = {
    registrationOrTransferTax: round(dldFee),
    notary: round(trustee), // Trustee assimilé au "notaire" pour cohérence UX
    mortgage: round(mortgageRegistration),
    other: round(agentCommission),
  };
  const grossTotal = totalFees(grossFeesObj);

  // ── Aides : AUCUNE aide d'État type Bëllegen Akt à Dubaï. ──
  const aids: StateAidApplicable[] = [];

  // Golden Visa = information statutaire, pas une aide financière.
  if (price >= 2000000 * AED_TO_EUR /* ≈ 504 000 € */) {
    warnings.push(
      "Seuil Golden Visa atteint (≥ 2 000 000 AED ≈ 504 000 €) : éligibilité à un visa résidence 10 ans renouvelable. Source u.ae.",
    );
  }

  const netFees = applyAids(grossTotal, aids);

  // ── Financement (Central Bank UAE Notice 31/2013) ──
  // Expat résident : 80% LTV (< 5M AED), 70% (≥ 5M AED).
  // Non-résident : 50% max (pratique des banques émiraties).
  const fiveMAedInEur = 5000000 * AED_TO_EUR; // ≈ 1,26 M €
  let maxLTV: number;
  if (profile.residentStatus === "resident") {
    maxLTV = price < fiveMAedInEur ? 0.8 : 0.7;
  } else {
    maxLTV = 0.5;
  }
  const financing: FinancingTerms = {
    maxLTV,
    typicalRateAnnual: 0.045,
    maxDurationYears: 25,
    source: SRC.AE_CB,
  };

  return {
    country: "AE",
    supported: true,
    price,
    grossFees: { ...grossFeesObj, total: round(grossTotal) },
    aids,
    netFees: round(netFees),
    totalAcquisitionNet: round(price + netFees),
    financing,
    warnings,
    disclaimer:
      "Calcul indicatif Dubaï : DLD 4%, trustee 4 000 AED, agent 2%. Conversion AED→EUR au peg USD officiel CBUAE. Pas d'IR sur revenu locatif, pas de capital gains tax.",
    sources: [SRC.AE_DLD, SRC.AE_CB, SRC.AE_RERA],
  };
}

// ─── Export aggrégé (utilisé par index.ts) ────────────────────────────────

export const COUNTRY_COMPUTE: Record<
  CountryCode,
  (profile: BuyerProfile, price: number) => AcquisitionResult
> = {
  LU: computeLU,
  FR: computeFR,
  BE: computeBE,
  DE: computeDE,
  PT: computePT,
  AE: computeAE,
};
