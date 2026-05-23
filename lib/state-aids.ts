// Aides d'État applicables à l'acquisition immobilière, par pays.
// Vérité légale 2026 — sources officielles citées dans `legalRef`.
// LU et FR vérifiés (Bëllegen Akt 2025, PTZ 2026). BE/DE/PT/UAE = TODO Phase C.
//
// Cette bibliothèque alimente le mini-simulateur de financement et la page
// /services/simulateurs/financement. Elle est complémentaire de `lib/legal-fees.ts`
// (qui gère les frais bruts d'acquisition).

import type { CountryCode } from "@/lib/legal-fees";

export type StateAid = {
  id: string;
  country: CountryCode;
  name: string;
  description: string;
  /** EUR — montant fixe ou plafond max. */
  maxAmount: number;
  conditions: {
    /** null = non requis ; true = exige primo-accédant. */
    primoAccedant: boolean | null;
    /** null = non requis ; true = exige résidence principale. */
    residencePrincipale: boolean | null;
    /** Si éligible et couple acquéreur, multiplier le montant. */
    couple: { eligible: boolean; multiplier: number };
    /** null = non requis ; true = exige neuf. */
    neufOnly: boolean | null;
    /** null = non requis ; true = exige ancien. */
    ancientOnly: boolean | null;
    /** null = non spécifié ; false = exclut locatif. */
    locatif: boolean | null;
  };
  /** IDs d'autres aides cumulables avec celle-ci. */
  stackable: string[];
  legalRef: string;
  appliesTo:
    | "registration_rights"
    | "notary_fees"
    | "capital"
    | "interest"
    | "vat";
};

// ─── Luxembourg ────────────────────────────────────────────────────────────

export const STATE_AIDS_LU: StateAid[] = [
  {
    id: "lu_bellegen_akt",
    country: "LU",
    name: "Bëllegen Akt",
    description:
      "Crédit d'impôt jusqu'à 40 000 EUR par acquéreur sur les droits d'enregistrement, pour toute résidence principale, sans condition d'âge ni de primo-accession.",
    maxAmount: 40000,
    conditions: {
      primoAccedant: null,
      residencePrincipale: true,
      couple: { eligible: true, multiplier: 2 },
      neufOnly: null,
      ancientOnly: null,
      locatif: false,
    },
    stackable: ["lu_tva_3"],
    legalRef: "Loi du 3 juillet 2025 — abattement droits d'enregistrement",
    appliesTo: "registration_rights",
  },
  {
    id: "lu_tva_3",
    country: "LU",
    name: "TVA logement super-réduite 3%",
    description:
      "TVA super-réduite à 3% pour la construction/rénovation de la résidence principale, plafond crédit ~50 000 EUR.",
    maxAmount: 50000,
    conditions: {
      primoAccedant: null,
      residencePrincipale: true,
      couple: { eligible: false, multiplier: 1 },
      neufOnly: true,
      ancientOnly: null,
      locatif: false,
    },
    stackable: ["lu_bellegen_akt"],
    legalRef: "Code TVA, art. 39 bis — logement résidence principale",
    appliesTo: "vat",
  },
];

// ─── France ────────────────────────────────────────────────────────────────

export const STATE_AIDS_FR: StateAid[] = [
  {
    id: "fr_ptz_2026",
    country: "FR",
    name: "PTZ 2026 (Prêt à Taux Zéro)",
    description:
      "Étendu à tous logements neufs sur tout le territoire, prolongé jusqu'au 31/12/2027. Réservé primo-accédants.",
    maxAmount: 195000,
    conditions: {
      primoAccedant: true,
      residencePrincipale: true,
      couple: { eligible: false, multiplier: 1 },
      neufOnly: true,
      ancientOnly: null,
      locatif: false,
    },
    stackable: ["fr_maprimerenov"],
    legalRef: "Décret 2025 — art. L31-10-1 CCH (extension PTZ 2026-2027)",
    appliesTo: "capital",
  },
];

// ─── Placeholders TODO Phase C ────────────────────────────────────────────
// À documenter avec sources officielles :
// - BE : abattement Bruxelles 200k, chèque-habitat Wallonie, taux 3% Flandre
// - DE : KfW 124, Baukindergeld (si réactivé), KfW 261/262
// - PT : exemption IMT résidence principale, Porta 65 Jovem
// - AE : Golden Visa (achat > 2M AED), First-Time Buyer 80% LTV

export const STATE_AIDS_BE: StateAid[] = [];
export const STATE_AIDS_DE: StateAid[] = [];
export const STATE_AIDS_PT: StateAid[] = [];
export const STATE_AIDS_AE: StateAid[] = [];

const AIDS_BY_COUNTRY: Record<CountryCode, StateAid[]> = {
  LU: STATE_AIDS_LU,
  FR: STATE_AIDS_FR,
  BE: STATE_AIDS_BE,
  DE: STATE_AIDS_DE,
  PT: STATE_AIDS_PT,
  AE: STATE_AIDS_AE,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getApplicableAids(params: {
  country: CountryCode;
  primoAccedant: boolean;
  couple: boolean;
  usage: "residence" | "locatif";
  isNeuf: boolean;
}): StateAid[] {
  const aids = AIDS_BY_COUNTRY[params.country] ?? [];
  return aids.filter((a) => {
    if (a.conditions.primoAccedant === true && !params.primoAccedant) return false;
    if (a.conditions.residencePrincipale === true && params.usage !== "residence") return false;
    if (a.conditions.neufOnly === true && !params.isNeuf) return false;
    if (a.conditions.ancientOnly === true && params.isNeuf) return false;
    if (a.conditions.locatif === false && params.usage === "locatif") return false;
    return true;
  });
}

export function totalAidsAmount(aids: StateAid[], couple: boolean): number {
  return aids.reduce((sum, a) => {
    const multiplier =
      couple && a.conditions.couple.eligible ? a.conditions.couple.multiplier : 1;
    return sum + a.maxAmount * multiplier;
  }, 0);
}

/** Montant unitaire (avec multiplicateur couple appliqué). */
export function aidAmountFor(aid: StateAid, couple: boolean): number {
  const multiplier =
    couple && aid.conditions.couple.eligible ? aid.conditions.couple.multiplier : 1;
  return aid.maxAmount * multiplier;
}
