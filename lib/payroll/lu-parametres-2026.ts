// Parametres de paie au Luxembourg, annee 2026 (nov. 2026). Valeurs seules,
// aucun calcul. Chaque valeur : source, date, statut ("verifie" ou
// "suppose"). Mise a jour : copier ce fichier pour l'annee suivante.
//
// Statuts :
//   verifie : lu dans la source citee (ou recoupe sur l'extrait de compte
//             salaire 2025 de Julien Brebion) ;
//   suppose : tire d'une source secondaire ou deduit, non recoupe.

export type ParamStatus = "verifie" | "suppose";

export type TaxBracket = {
  /** Borne haute de la tranche (revenu imposable annuel, euros) ; Infinity pour la derniere. */
  upTo: number;
  /** Taux marginal de la tranche (0,08 = 8 %). */
  rate: number;
};

export type LuPayrollParams = {
  year: number;
  indice: number;
  ssmNonQualifie: number;
  ssmQualifie: number;
  plafondMensuel: number;
  pensionSalarie: number;
  maladieSalarie: number;
  dependanceSalarie: number;
  dependanceAbattementMensuel: number;
  pensionEmployeur: number;
  maladieEmployeur: number;
  accidentEmployeur: number;
  santeTravailEmployeur: number;
  baremeClasse1: readonly TaxBracket[];
  fondsEmploiTaux: number;
  fondsEmploiTauxMajore: number;
  fondsEmploiSeuilClasse1: number;
  fondsEmploiSeuilClasse2: number;
  forfaitFraisObtention: number;
  forfaitDepensesSpeciales: number;
  cis: { debut: number; finPente: number; base: number; pente: number; plateau: number; debutDegressif: number; fin: number; degressif: number };
  co2: { debut: number; plateau: number; debutDegressif: number; fin: number; degressif: number };
};

/** Date de mise a jour des parametres, affichee a l'ecran. */
export const PARAMS_2026_UPDATED = "2026-06-01";

/** Tranches de 16 % a 38 %, 2 295 euros chacune, de 26 550 a 54 090 euros. */
function trancheDe2295(): TaxBracket[] {
  const out: TaxBracket[] = [];
  for (let i = 0, rate = 16; rate <= 38; i++, rate += 2) out.push({ upTo: 26550 + 2295 * (i + 1), rate: rate / 100 });
  return out;
}

export const PARAMS_2026: LuPayrollParams = {
  year: 2026,
  // Indice ponderal de l'echelle mobile des salaires au 1er juin 2026.
  // Source : BDO, parametres sociaux au 01/06/2026. Verifie (source secondaire).
  indice: 992.24,
  // Salaire social minimum mensuel, 18 ans et plus, non qualifie / qualifie (+20 %).
  // Source : BDO, parametres sociaux au 01/06/2026. Verifie (source secondaire).
  ssmNonQualifie: 2771.33,
  ssmQualifie: 3325.59,
  // Plafond cotisable mensuel (5 fois le salaire social minimum).
  // Source : BDO, parametres sociaux au 01/06/2026. Verifie (source secondaire).
  plafondMensuel: 13856.63,

  // Cotisations salarie. Pension 8,50 % et maladie 3,05 % sur le brut plafonne.
  // Source : BDO, parametres sociaux au 01/06/2026. Verifie (source secondaire).
  pensionSalarie: 0.085,
  maladieSalarie: 0.0305,
  // Dependance 1,40 % sur le brut moins un abattement d'un quart du salaire
  // social minimum (692,83 euros par mois), non plafonnee.
  // Source : BDO, parametres sociaux au 01/06/2026. Verifie (source secondaire).
  dependanceSalarie: 0.014,
  dependanceAbattementMensuel: 692.83,

  // Cotisations employeur. Pension 8,50 % et maladie 3,05 % sur le brut plafonne.
  // Source : BDO, parametres sociaux au 01/06/2026. Verifie (source secondaire).
  pensionEmployeur: 0.085,
  maladieEmployeur: 0.0305,
  // Assurance accident 0,65 %, multipliee par le facteur bonus-malus de
  // l'employeur (0,85 a 1,5, reglages). Source : BDO, parametres sociaux au
  // 01/06/2026 ; facteurs : AAA, presentation du systeme bonus-malus. Verifie.
  // Base : brut plafonne. Suppose (meme regle que pension et maladie).
  accidentEmployeur: 0.0065,
  // Sante au travail 0,14 %. Source : BDO, parametres sociaux au 01/06/2026.
  // Verifie (source secondaire). Base : brut plafonne. Suppose.
  // Mutualite des employeurs : taux des reglages (0,23, 0,95, 1,56 ou 2,66 %),
  // meme base. Taux : verifie (meme source) ; base plafonnee : suppose.
  santeTravailEmployeur: 0.0014,

  // Bareme annuel de l'impot, classe 1, sur le revenu imposable.
  // Source : financialservices.lu, bareme 2025 inchange en 2026. Verifie sur
  // l'extrait de compte salaire 2025 de Julien (ecart de 9,65 euros sur l'annee).
  // Classe 2 : deux fois l'impot de la classe 1 sur la moitie du revenu
  // (splitting). Meme source ; suppose (non recoupe sur un extrait en
  // classe 2). Classe 1a : non implementee.
  baremeClasse1: [
    { upTo: 13230, rate: 0 },
    { upTo: 15435, rate: 0.08 },
    { upTo: 17640, rate: 0.09 },
    { upTo: 19845, rate: 0.1 },
    { upTo: 22050, rate: 0.11 },
    { upTo: 24255, rate: 0.12 },
    { upTo: 26550, rate: 0.14 },
    ...trancheDe2295(),
    { upTo: 117450, rate: 0.39 },
    { upTo: 176160, rate: 0.4 },
    { upTo: 234870, rate: 0.41 },
    { upTo: Infinity, rate: 0.42 },
  ],

  // Contribution au fonds pour l'emploi, ajoutee a l'impot : 7 %, 9 % au-dela
  // de 150 000 euros de revenu imposable (classe 1) ou 300 000 euros (classe 2).
  // Source : financialservices.lu (secondaire). Suppose, coherent avec l'extrait 2025.
  fondsEmploiTaux: 0.07,
  fondsEmploiTauxMajore: 0.09,
  fondsEmploiSeuilClasse1: 150000,
  fondsEmploiSeuilClasse2: 300000,

  // Forfaits annuels deduits du revenu imposable : frais d'obtention 540 euros,
  // depenses speciales 480 euros. Verifie sur l'extrait 2025 de Julien.
  forfaitFraisObtention: 540,
  forfaitDepensesSpeciales: 480,

  // Credit d'impot salarie (CIS) 2026, sur le brut annuel :
  //   936 a 11 265 : 300 + (brut - 936) x 0,029
  //   11 266 a 40 000 : 600
  //   40 001 a 79 999 : 600 - (brut - 40 000) x 0,015
  //   sous 936 et a partir de 80 000 : 0
  // Source : impotsdirects.public.lu, CIS 2026. Verifie.
  cis: { debut: 936, finPente: 11265, base: 300, pente: 0.029, plateau: 600, debutDegressif: 40000, fin: 80000, degressif: 0.015 },
  // Credit d'impot CO2 salarie 2026, sur le brut annuel :
  //   936 a 40 000 : 216 ; jusqu'a 79 999 : 216 - (brut - 40 000) x 0,0054 ; sinon 0.
  // Source : impotsdirects.public.lu, CIS 2026. Verifie.
  co2: { debut: 936, plateau: 216, debutDegressif: 40000, fin: 80000, degressif: 0.0054 },
};

/** Liste des parametres et de leur statut, pour l'ecran (bandeau depliable). */
export const PARAMS_2026_LIST: readonly { key: string; status: ParamStatus }[] = [
  { key: "indice", status: "verifie" },
  { key: "ssm", status: "verifie" },
  { key: "plafond", status: "verifie" },
  { key: "cotisations_salarie", status: "verifie" },
  { key: "dependance", status: "verifie" },
  { key: "cotisations_employeur", status: "verifie" },
  { key: "accident_facteur", status: "verifie" },
  { key: "base_plafonnee_accident_sante_mutualite", status: "suppose" },
  { key: "bareme_classe_1", status: "verifie" },
  { key: "classe_2", status: "suppose" },
  { key: "fonds_emploi", status: "suppose" },
  { key: "forfaits", status: "verifie" },
  { key: "cis", status: "verifie" },
  { key: "co2", status: "verifie" },
];
