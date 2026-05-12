// Types du moteur de calcul d'acquisition par pays.
// Toutes les valeurs sont en EUR sauf mention explicite (AE = AED converti
// en EUR au taux indicatif documenté dans country-rules.ts).
//
// Source de vérité : `lib/acquisition/sources.json` (URLs + date vérification).

export type CountryCode = "LU" | "FR" | "BE" | "DE" | "PT" | "AE";

export type BuyerProfile = {
  country: CountryCode;
  primoAccedant: boolean;
  couple: boolean;
  usage: "residence" | "locatif" | "secondaire";
  residentStatus: "resident" | "non_resident";
  isNeuf: boolean;
};

export type Source = {
  name: string;
  url: string;
  lastVerified: string; // ISO date YYYY-MM-DD
};

export type StateAidApplicable = {
  id: string;
  name: string;
  description: string;
  /** EUR (ou équivalent local converti). */
  amount: number;
  /** Conditions vérifiées qui rendent l'aide applicable pour le profil courant. */
  conditionsMet: string[];
  source: Source;
};

export type FinancingTerms = {
  /** Loan-to-Value max (0..1). */
  maxLTV: number;
  /** Taux annuel indicatif (ex. 0.038 = 3,8%). */
  typicalRateAnnual: number;
  maxDurationYears: number;
  source: Source;
};

export type GrossFees = {
  /** Droit d'enregistrement / transfer tax / DLD / IMT / Grunderwerbsteuer. */
  registrationOrTransferTax: number;
  /** Honoraires notaire / trustee. */
  notary: number;
  /** Frais hypothécaires / mortgage registration. */
  mortgage: number;
  /** Autres frais fixes (commission agent, registre, etc.). */
  other?: number;
  total: number;
};

export type AcquisitionResult = {
  country: CountryCode;
  /** True si le pays est couvert par le moteur. */
  supported: boolean;
  /** Si supported=false, raison à afficher à l'utilisateur. */
  unsupportedReason?: string;
  price: number;
  grossFees: GrossFees;
  aids: StateAidApplicable[];
  /** grossFees.total - sum(aids.amount), borné à 0. */
  netFees: number;
  /** price + netFees. */
  totalAcquisitionNet: number;
  financing: FinancingTerms;
  /** Avertissements contextuels (région présumée, Land moyen, etc.). */
  warnings: string[];
  /** Disclaimer permanent à afficher en bas. */
  disclaimer: string;
  /** Bibliographie générale du calcul. */
  sources: Source[];
};
