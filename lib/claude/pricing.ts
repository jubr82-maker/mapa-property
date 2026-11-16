// Modele et tarif de l'API Claude (nov. 2026) : UN SEUL endroit a changer.
// Module pur (ecran et serveur) : calcul du cout a partir des jetons
// renvoyes par l'API (champ usage), estimation avant l'appel, credit
// restant estime.

/** Modele utilise par le bouton "Traduire maintenant avec Claude API". */
export const CLAUDE_MODEL = "claude-sonnet-5-5";

/**
 * Tarif de Claude Sonnet 5.5, en dollars par million de jetons, releve le
 * 2026-11-16 (grille publique de l'API Claude). A mettre a jour ici si le
 * tarif ou le modele change.
 */
export const CLAUDE_PRICE = {
  model: CLAUDE_MODEL,
  inputUsdPerMTok: 2,
  outputUsdPerMTok: 10,
  asOf: "2026-11-16",
} as const;

/** Cout en dollars d'un appel, a partir des jetons lus et ecrits. */
export function claudeCostUsd(inputTokens: number, outputTokens: number): number {
  const i = Math.max(0, Number(inputTokens) || 0);
  const o = Math.max(0, Number(outputTokens) || 0);
  return (i * CLAUDE_PRICE.inputUsdPerMTok + o * CLAUDE_PRICE.outputUsdPerMTok) / 1_000_000;
}

/** Dollars vers euros (taux BCE : dollars pour 1 euro) ; null sans taux. */
export function usdToEur(usd: number, usdPerEur: number | null | undefined): number | null {
  return usdPerEur && usdPerEur > 0 ? usd / usdPerEur : null;
}

/** Jetons estimes d'un texte (environ 3,5 caracteres par jeton en francais). */
export function estimateTokens(text: string): number {
  return Math.ceil(String(text ?? "").length / 3.5);
}

/** Consigne de traduction : taille fixe estimee (system + cadre JSON). */
export const TRANSLATION_PROMPT_TOKENS = 900;

/**
 * Cout estime d'une traduction (anglais et allemand : deux appels), avant
 * l'appel : texte lu deux fois avec la consigne, texte ecrit environ 20 %
 * plus long en allemand et en anglais, plus le cadre JSON.
 */
export function estimateTranslationUsd(texts: string[]): number {
  const source = texts.reduce((n, t) => n + estimateTokens(t), 0);
  if (!source) return 0;
  const input = 2 * (TRANSLATION_PROMPT_TOKENS + source);
  const output = 2 * Math.ceil(source * 1.2 + 40);
  return claudeCostUsd(input, output);
}

/** Credit restant estime : credit charge moins la consommation depuis le chargement. */
export function remainingCreditUsd(creditUsd: number | null | undefined, spentSinceLoadUsd: number): number | null {
  if (creditUsd == null || !Number.isFinite(Number(creditUsd))) return null;
  return Math.round((Number(creditUsd) - Math.max(0, spentSinceLoadUsd)) * 1_000_000) / 1_000_000;
}

/** Montant lisible : 4 decimales sous 0,01, sinon 2 ("environ 0,03 €"). */
export function formatCost(amount: number, currency: "EUR" | "USD", locale = "fr-LU"): string {
  const digits = Math.abs(amount) > 0 && Math.abs(amount) < 0.01 ? 4 : 2;
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
}
