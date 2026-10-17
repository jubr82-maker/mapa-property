// Fourchette de valeurs dans la langue de la page (oct. 2026) : "a" / "to"
// / "bis" entre les deux valeurs, jamais de tiret long ou moyen (regle du
// site). Mot de liaison de mise en forme, comme les separateurs de nombres.
const JOIN: Record<string, string> = { fr: "à", en: "to", de: "bis" };

export function rangeText(min: string, max: string, locale: string): string {
  return `${min} ${JOIN[locale] ?? JOIN.fr} ${max}`;
}
