import type {
  AcquisitionInput,
  AcquisitionResult,
  CountryCode,
} from './types';
import { DEFAULT_LEGAL_NOTICE } from './legal-notice';
import { computeLuxembourg } from './countries/luxembourg';
import { computeFrance } from './countries/france';
import { computeBelgium } from './countries/belgium';
import { computeGermany } from './countries/germany';
import { computeMonaco } from './countries/monaco';
import { computeSwitzerland } from './countries/switzerland';
import { computeItaly } from './countries/italy';
import { computeSpain } from './countries/spain';
import { computePortugal } from './countries/portugal';

const SUPPORTED: CountryCode[] = [
  'LU', 'FR', 'BE', 'DE', 'MC', 'CH', 'IT', 'ES', 'PT',
];

export function computeAcquisitionCost(
  input: AcquisitionInput,
): AcquisitionResult {
  if (!SUPPORTED.includes(input.countryCode as CountryCode)) {
    return notCoveredResult(input.countryCode);
  }

  let result: AcquisitionResult;
  switch (input.countryCode) {
    case 'LU':
      result = computeLuxembourg(input);
      break;
    case 'FR':
      result = computeFrance(input);
      break;
    case 'BE':
      result = computeBelgium(input);
      break;
    case 'DE':
      result = computeGermany(input);
      break;
    case 'MC':
      result = computeMonaco(input);
      break;
    case 'CH':
      result = computeSwitzerland(input);
      break;
    case 'IT':
      result = computeItaly(input);
      break;
    case 'ES':
      result = computeSpain(input);
      break;
    case 'PT':
      result = computePortugal(input);
      break;
    default:
      result = notCoveredResult(input.countryCode);
  }

  // ── Warning apport < 20%
  if (input.downPaymentPercent < 20 && !result.notCovered) {
    result.warnings.push(
      "Apport <20% : financement à conditions strictes selon banque (LTV maximum, garanties supplémentaires, profil emprunteur exigeant). Contactez-nous pour conseil personnalisé.",
    );
  }

  // ── Note importante systématique
  if (!result.notCovered) {
    result.lineItems.push({
      label: 'Note importante',
      amount: 0,
      isPercentage: false,
      notes: `Cette estimation exclut les honoraires d'agence, diagnostics, frais bancaires, assurances et taxes locales annuelles. Pour ${result.countryName}, consultez impérativement un notaire local et un conseiller fiscal indépendant avant toute décision.`,
    });
  }

  result.legalNotice = { ...DEFAULT_LEGAL_NOTICE };
  return result;
}

export function notCoveredResult(countryCode: string): AcquisitionResult {
  return {
    countryCode,
    countryName: countryCode,
    totalCost: 0,
    totalCostPercent: 0,
    lineItems: [],
    warnings: [],
    sources: [],
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
    notCovered: true,
    contactMessage: `Pour une acquisition immobilière dans ce pays (${countryCode}), MAPA Property vous propose une analyse complète personnalisée avec ses partenaires locaux. Contactez-nous : +352 691 620 127 | j.brebion@mapagroup.org`,
  };
}

export type { AcquisitionInput, AcquisitionResult } from './types';
