// Frais notaire et acquisition par pays — vérité légale 2026.
// Sources officielles citées par aide. À utiliser dans :
// - /fr/services/estimer (simulateur)
// - /fr/services/simulateurs/financement
// - mini-simulateur sur fiches biens (pré-rempli pays + prix)
// - articles /fr/journal sur la fiscalité

export type CountryCode = "LU" | "FR" | "BE" | "DE" | "PT" | "AE";

export interface CountryFees {
  name: string;
  registration_rights: number;
  notary_fees_pct: number;
  mortgage_fees: number;
  aids: Aid[];
  notes?: string;
}

export interface Aid {
  name: string;
  amount_per_person?: number;
  amount_per_child?: number;
  amount?: number;
  max_amount?: number;
  rate?: string;
  type?: string;
  conditions?: string;
  legal_ref?: string;
  source_url?: string;
}

export const LEGAL_FEES: Record<CountryCode, CountryFees> = {
  LU: {
    name: "Luxembourg",
    registration_rights: 0.07,
    notary_fees_pct: 0.01,
    mortgage_fees: 5000,
    aids: [
      {
        name: "Bëllegen Akt",
        amount_per_person: 40000,
        conditions: "Résidence principale (occupation 2 ans, 4 ans VEFA), sans condition d'âge ni de primo-accession",
        legal_ref: "Loi du 3 juillet 2025 (définitif)",
        source_url: "https://logement.public.lu/fr/aides-logement/bellegen-akt.html",
      },
      {
        name: "Prêt climatique",
        type: "PTZ équivalent",
        max_amount: 100000,
        conditions: "Rénovation énergétique classe A+",
        source_url: "https://logement.public.lu/",
      },
      {
        name: "TVA réduite 3%",
        conditions: "Construction neuve résidence principale jusqu'à 50k€ de crédit",
        source_url: "https://logement.public.lu/",
      },
    ],
  },
  FR: {
    name: "France",
    registration_rights: 0.058,
    notary_fees_pct: 0.008,
    mortgage_fees: 1500,
    aids: [
      {
        name: "PTZ (Prêt à Taux Zéro)",
        max_amount: 100000,
        conditions: "Primo-accédant, plafond revenus, zones A/B1/B2",
        source_url: "https://www.service-public.fr/particuliers/vosdroits/F10871",
      },
      {
        name: "Prêt Action Logement",
        max_amount: 40000,
        conditions: "Salarié entreprise > 10 employés",
        source_url: "https://www.actionlogement.fr/",
      },
      {
        name: "Pinel / Denormandie",
        conditions: "Investissement locatif neuf zones tendues, réduction fiscale 12-21%",
        source_url: "https://www.service-public.fr/",
      },
      {
        name: "MaPrimeRénov'",
        conditions: "Rénovation énergétique, montant variable selon revenus et travaux",
        source_url: "https://www.maprimerenov.gouv.fr/",
      },
    ],
  },
  BE: {
    name: "Belgique",
    registration_rights: 0.12,
    notary_fees_pct: 0.012,
    mortgage_fees: 1800,
    aids: [
      {
        name: "Abattement Région Bruxelloise",
        amount: 200000,
        conditions: "Habitation propre, unique, < 600k€",
        source_url: "https://fiscalite.brussels/",
      },
      {
        name: "Chèque-Habitat (Wallonie)",
        conditions: "Acquéreur < 65 ans, revenus modestes",
        source_url: "https://www.wallonie.be/",
      },
      {
        name: "Réduction droits Région Flamande",
        conditions: "Habitation propre unique, taux préférentiel 3%",
        source_url: "https://www.vlaanderen.be/",
      },
    ],
  },
  DE: {
    name: "Allemagne",
    registration_rights: 0.05,
    notary_fees_pct: 0.015,
    mortgage_fees: 2000,
    aids: [
      {
        name: "KfW-Wohneigentumsprogramm 124",
        max_amount: 100000,
        rate: "À partir de 2.5%",
        conditions: "Résidence principale, achat ou construction",
        source_url: "https://www.kfw.de/",
      },
      {
        name: "Baukindergeld (suspendu 2024, peut être réactivé)",
        amount_per_child: 12000,
        conditions: "Familles avec enfants, revenus plafonnés",
        source_url: "https://www.kfw.de/",
      },
      {
        name: "KfW-Energieeffizient Bauen 261/262",
        conditions: "Construction efficiente énergétiquement",
        source_url: "https://www.kfw.de/",
      },
    ],
  },
  PT: {
    name: "Portugal",
    registration_rights: 0.064,
    notary_fees_pct: 0.01,
    mortgage_fees: 800,
    aids: [
      {
        name: "IMT — Exemption résidence principale",
        conditions: "< 92k€ valeur (continental), résidence permanente",
        source_url: "https://www.portaldasfinancas.gov.pt/",
      },
      {
        name: "Programa Porta 65 — Jovem",
        conditions: "Locataires 18-35 ans, subvention loyer",
        source_url: "https://www.portadahabitacao.pt/",
      },
    ],
  },
  AE: {
    name: "Émirats Arabes Unis (Dubaï)",
    registration_rights: 0.04,
    notary_fees_pct: 0,
    mortgage_fees: 3500,
    aids: [
      {
        name: "Golden Visa",
        conditions: "Achat > 2M AED (~500k€), résidence 10 ans renouvelable",
        source_url: "https://u.ae/",
      },
      {
        name: "First-Time Buyer Mortgage 80% LTV",
        conditions: "UAE residents, max 25 ans durée",
        source_url: "https://www.centralbank.ae/",
      },
    ],
    notes:
      "Pas d'IRPP sur revenus locatifs. DLD 4% partagé acheteur/vendeur (négociable). Frais agent RERA ~2%.",
  },
};

// Helper : calcul des frais d'acquisition totaux pour un prix donné.
export function computeAcquisitionCosts(price: number, country: CountryCode) {
  const c = LEGAL_FEES[country];
  const registration = price * c.registration_rights;
  const notary = price * c.notary_fees_pct;
  const mortgage = c.mortgage_fees;
  const total = registration + notary + mortgage;
  return {
    registration,
    notary,
    mortgage,
    total,
    total_with_price: price + total,
  };
}

// Helper : déduit l'aide max applicable (Bëllegen Akt, abattement, etc.)
export function computeMaxAidsDeduction(country: CountryCode, persons = 1) {
  const c = LEGAL_FEES[country];
  return c.aids.reduce((acc, a) => {
    if (typeof a.amount_per_person === "number") return acc + a.amount_per_person * persons;
    if (typeof a.amount === "number") return acc + a.amount;
    return acc;
  }, 0);
}
