// Frais notaire et acquisition par pays — vérité légale 2026.
// Sources officielles citées par aide. À utiliser dans :
// - /fr/services/estimer (simulateur)
// - /fr/services/simulateurs/financement
// - mini-simulateur sur fiches biens (pré-rempli pays + prix)
// - articles /fr/blog sur la fiscalité

export type CountryCode = "LU" | "FR" | "BE" | "DE" | "PT" | "AE";

export interface CountryFees {
  name: string;
  registration_rights: number;
  /** Sous-detail de registration_rights pour le Luxembourg (droits
   * d'enregistrement proprement dits). Optionnel : seul LU le renseigne
   * pour le moment. Utilise par le chatbot (mission "chiffres verrouilles")
   * pour ne jamais fusionner taxes et honoraires de notaire en un total. */
  registration_duty_pct?: number;
  /** Sous-detail de registration_rights pour le Luxembourg (droit de
   * transcription). Meme usage que registration_duty_pct. */
  transcription_duty_pct?: number;
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
  /** Traduction de `conditions` pour les contextes multilingues (ex.
   * chatbot). Optionnel : `conditions` (FR) reste la valeur affichee par
   * les composants existants (simulateurs), inchangee. */
  conditions_i18n?: { fr: string; en: string; de: string };
  legal_ref?: string;
  source_url?: string;
}

// Oct. 2026 : seules les donnees sourcees sont conservees. Les taux,
// frais et aides de France, Belgique, Allemagne, Portugal et Emirats
// (sans source verifiable pour chaque chiffre) ont ete retires ; le
// simulateur de financement ne propose plus que le Luxembourg.
export const LEGAL_FEES: { LU: CountryFees } & Partial<Record<CountryCode, CountryFees>> = {
  LU: {
    name: "Luxembourg",
    registration_rights: 0.07,
    registration_duty_pct: 0.06,
    transcription_duty_pct: 0.01,
    notary_fees_pct: 0.01,
    mortgage_fees: 5000,
    aids: [
      {
        name: "Bëllegen Akt",
        amount_per_person: 45000,
        conditions: "Résidence principale (occupation 2 ans, 4 ans VEFA), sans condition d'âge ni de primo-accession",
        conditions_i18n: {
          fr: "résidence principale (occupation 2 ans, 4 ans en VEFA), sans condition d'âge ni de primo-accession",
          en: "primary residence (2 years of occupancy, 4 years for off-plan/VEFA purchases), no age or first-time buyer condition",
          de: "Hauptwohnsitz (2 Jahre Nutzung, 4 Jahre bei Kauf vom Plan/VEFA), ohne Alters- oder Erstkäuferbedingung",
        },
        legal_ref: "Communiqué du gouvernement du 16 juillet 2026 : 45 000 euros par acquéreur",
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
};

// Helper : calcul des frais d'acquisition totaux pour un prix donné.
export function computeAcquisitionCosts(price: number, country: CountryCode) {
  const c = LEGAL_FEES[country] ?? LEGAL_FEES.LU;
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
  const c = LEGAL_FEES[country] ?? LEGAL_FEES.LU;
  return c.aids.reduce((acc, a) => {
    if (typeof a.amount_per_person === "number") return acc + a.amount_per_person * persons;
    if (typeof a.amount === "number") return acc + a.amount;
    return acc;
  }, 0);
}
