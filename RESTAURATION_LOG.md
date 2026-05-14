# Restauration travail amont V29/V30 — Bilan

Date : 2026-05-14
Mission : retrouver et restaurer le travail amont sur les règles d'estimation Luxembourg.

## Verdict : RIEN N'A ÉTÉ PERDU

L'investigation git history a permis d'identifier les 3 commits clés (mai 2026) qui constituent le "travail amont V29/V30" évoqué par Julien — **et les fichiers sont tous encore présents en main**.

## Commits clés identifiés

### `7d6ec2b` — 2026-05-10 — 52 villes long-tail + référentiel €/m²
**Message** : `feat(seo): 52 pages villes long-tail FR/EN/DE + sitemap dynamique`

Apports :
- `lib/cities.ts` (881 lignes) : 24 communes/quartiers LU + 28 villes internationales avec data structurée
- Belair : floor 8500 / ceiling 16000 €/m² (règle Julien explicite : pas de 6500-7500 sur classes E/F)
- 156 URLs sitemap avec alternates FR/EN/DE
- Sources STATEC + Observatoire de l'Habitat

→ **FICHIER INTACT** : `lib/cities.ts` (881 lignes en main, identique au commit).

### `75e17c2` — Coefficients estimation enrichis
**Message** : `feat(estimation): coefficients enrichis lib/estimate.ts (phase 3 partielle)`

Apports :
- `lib/estimate.ts` (280 lignes) : moteur hédoniste 10 pays
- Coefficients CPE LU 10 niveaux (A++ à I)
- Multipliers par quartier (Belair 1.4, Limpertsberg 1.3, etc.)
- Coefficients état, type, étage, spécificités

→ **FICHIER INTACT** : `lib/estimate.ts` (280 lignes en main).

### `b081591` — Simulateur financement enrichi (C8+C9+C10+C11)
**Message** : `feat: C8 + C9 + C10 + C11 (partiel)`

Apports :
- `lib/legal-fees.ts` (204 lignes) : droits d'enregistrement, notaire, aides par pays
- `lib/finance-sim.ts` (87 lignes) : computeMortgage, computeDebtRatio, schéma amortissement
- `app/[locale]/services/simulateurs/financement/page.tsx` (45 lignes) : tunnel financement
- `components/simulators/FinancingSimulator.tsx` (307 lignes) : simulateur complet 6 pays
- DEFAULT_RATES_BY_COUNTRY (LU 3.85%, FR 3.65%, BE 3.45%, DE 3.95%, PT 3.6%, AE 4.5%)
- Taux endettement avec warn rouge > 35%
- Aides applicables avec liens sources officielles

→ **FICHIERS INTACTS** : tous présents en main, à l'exception de `components/property/MiniFinanceSimulator.tsx` qui a été supprimé (composant compact pour fiche bien — non bloquant pour la mission scission).

## Vrai problème identifié — `EstimateForm.tsx` mélange les outils

Le tunnel `/fr/services/estimer` (composant `components/forms/EstimateForm.tsx`, 700 lignes) comporte **3 steps** :
- Step 1 : Le bien (type, surface, pièces, année, état, CPE, spécificités)
- Step 2 : Localisation (pays, commune, code postal)
- **Step 3** : ❌ MÉLANGE FAUX → buyersCount, age, monthlyIncome, monthlyCharges, downPayment, isPrimoLu, isPrimaryResidence

Step 3 contient des champs **capacité d'emprunt / aides** qui n'ont **rien à voir avec l'estimation de prix d'un bien**. C'est cette confusion qui produit les captures Julien :
> "À un moment on passe de l'estimation à quels sont les salaires et les capacités d'acquisition... rien à voir t'as tout mélangé"

## Plan correctif (Phase 1 du brief)

1. Step 3 d'EstimateForm → supprimé / remplacé par étape "Coordonnées client" (email + tel uniquement)
2. Les champs revenus/charges/apport/primo-LU/résidence principale → déplacés sur nouvelle route `/fr/services/capacite-emprunt` (composant nouveau ou réutilisation FinancingSimulator)
3. Sortie estimation = uniquement 3 prix (bas/mid/haut) + CTA "Estimation approfondie par notre Real Estate Director"

## Conclusion

**Aucune perte de code amont.** Le travail Belair 8500/16000 + CPE 10 niveaux + simulateur financement 6 pays est **intégralement présent** dans `lib/cities.ts`, `lib/estimate.ts`, `lib/legal-fees.ts`, `lib/finance-sim.ts`. La mission de Phase 0 (restauration depuis git) est sans objet.

La cause de l'impression "tout est mélangé" : **un seul tunnel UX** (`EstimateForm`) traite à la fois estimation + capacité d'emprunt. La scission à faire est purement frontale/architecturale, pas un sauvetage de code perdu.

Branche de backup créée par sécurité avant Phase 1 : `backup/avant-refonte-estimation-evs`.
