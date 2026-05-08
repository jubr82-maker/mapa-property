// Calcul mensualité d'un prêt amortissable classique
// principal: capital emprunté, annualRate: taux annuel en % (ex: 3.5), years: durée
export const monthlyPayment = (
  principal: number,
  annualRate: number,
  years: number,
): number => {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
};

export const formatEuro = (value: number, locale = "fr-LU"): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
