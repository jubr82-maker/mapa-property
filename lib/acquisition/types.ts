export type CountryCode = 'LU' | 'FR' | 'BE' | 'DE' | 'MC' | 'CH' | 'IT' | 'ES' | 'PT';

export type AcquisitionInput = {
  countryCode: CountryCode | string;
  city: string;
  price: number;
  propertyType: 'new' | 'old';
  usage: 'primary' | 'secondary' | 'investment';
  buyerProfile: {
    isResident: boolean;
    isFirstTimeBuyer: boolean;
    age?: number;
    isFamily?: boolean;
    isEUCitizen?: boolean;
    nationality?: string;
  };
  downPaymentPercent: number;
};

export type AcquisitionLineItem = {
  label: string;
  amount: number;
  rate?: number;
  isPercentage: boolean;
  notes?: string;
};

export type AcquisitionSource = {
  label: string;
  url: string;
  verifiedDate: string; // YYYY-MM-DD
};

export type LegalNotice = {
  shortDisclaimer: string;
  fullLegalUrl: string;
  sourcesVerifiedDate: string;
  lastReviewDate: string;
};

export type AcquisitionResult = {
  countryCode: string;
  countryName: string;
  region?: string;
  totalCost: number;
  totalCostPercent: number;
  lineItems: AcquisitionLineItem[];
  warnings: string[];
  sources: AcquisitionSource[];
  legalNotice: LegalNotice;
  notCovered?: boolean;
  contactMessage?: string;
};
