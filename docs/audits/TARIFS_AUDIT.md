# Audit Tarifs MAPA Property — 2026-05-12

> Phase A-quinquies · Agent AUDIT 1 · MODE LECTURE SEULE
> Périmètre : `app/`, `components/`, `lib/`, `messages/` (FR/EN/DE).
> Référence : règles MAPA officielles (Julien) — voir brief mission.

---

## Résumé exécutif

- **Occurrences chiffrées trouvées : 95+** (mandats vente, recherche, location, gestion, TVA, plafonds, simulateurs, aides).
- **Verdict global :**
  - **5 SUSPECTS critiques** (incohérence interne flagrante mandat vente 3% vs 3,5% vs 3 %)
  - **2 SUSPECTS supplémentaires** (taux 4 % vs 4,0 % vs 4 ; 5 % vs 4,5 %)
  - **~20 À CONFIRMER** avec Julien (taux exact mandats, gestion locative, EVS absent)
  - **~25 VÉRIFIÉS** (cadre légal LU : TVA 17 %, plafond loyer 5 %, frais notaire ~7 %, abattement Bëllegen Akt 40 000 €, plafond endettement 35 %, TVA réduite 3 %).

### Incohérence MAJEURE détectée

Le projet contient **TROIS valeurs différentes** pour le même mandat exclusif, à des endroits différents :

| Source | Mandat Exclusif | Mandat Semi | Mandat Simple | Mandat Autonome |
|---|---|---|---|---|
| `lib/mandates.ts` (source de vérité pages mandats) | **3 %** | **4 %** | **5 %** | **1 %** |
| `messages/{fr,en,de}.json` (i18n descriptions) | **3 %** | **4 %** | **5 %** | **1 %** |
| `components/home/MandatesGrid.tsx` (carte home) | **3,5%** | **4,0%** | **4,5%** | — |
| `lib/legal/honoraires.ts` (page /legal/honoraires) | **3,5 %** | **4,0 %** | **4,5 %** | devis |
| `components/chatbot/chatbot-knowledge.ts` (Eléna) | **3,5 %** | **4,0 %** | **4,5 %** | devis |
| `app/api/chatbot/route.ts` (fallback chatbot) | **3,5 %** | **4,0 %** | **4,5 %** | devis |

**Le visiteur voit donc 3% sur la page mandat exclusif, mais 3,5% sur la home et la page honoraires.**

Selon le brief : "3,5% / 4,0% / 4,5%" sur mandats vente = SUSPECT (probablement inventé selon Julien).
Par cohérence avec `lib/mandates.ts` qui est la source unique des pages /mandats/[type], les valeurs **3 / 4 / 5 / 1** semblent plus récentes (commit 75e17c2 phase 3 ?), mais ne sont pas non plus officiellement validées.

---

## Table exhaustive

### A. Mandats de vente — INCOHÉRENT (zone critique)

| Fichier | Ligne | Contexte | Valeur | Statut |
|---|---|---|---|---|
| `lib/mandates.ts` | 19 | `rate: "3 %"` (exclusif) | **3 %** | SUSPECT (à confirmer) |
| `lib/mandates.ts` | 20 | `rateNote: "HT + 17 % TVA · prix net vendeur"` | 17 % | VÉRIFIÉ (TVA LU) |
| `lib/mandates.ts` | 32 | `rate: "4 %"` (semi-exclusif) | **4 %** | SUSPECT (à confirmer) |
| `lib/mandates.ts` | 45 | `rate: "5 %"` (simple) | **5 %** | SUSPECT (à confirmer) |
| `lib/mandates.ts` | 58 | `rate: "1 %"` (autonome) | **1 %** | SUSPECT (à confirmer) |
| `lib/mandates.ts` | 72 | `rateNote: "+ 17 % TVA · barème selon juridiction"` (recherche) | 17 % | VÉRIFIÉ |
| `components/home/MandatesGrid.tsx` | 6 | `{ key: "exclusive", rate: "3,5%" }` | **3,5 %** | SUSPECT — contredit `lib/mandates.ts` |
| `components/home/MandatesGrid.tsx` | 7 | `{ key: "semi", rate: "4,0%" }` | **4,0 %** | SUSPECT — contredit `lib/mandates.ts` |
| `components/home/MandatesGrid.tsx` | 8 | `{ key: "simple", rate: "4,5%" }` | **4,5 %** | SUSPECT — contredit `lib/mandates.ts` |
| `lib/legal/honoraires.ts` | 29 | "Mandat Exclusif : 3,5 % HT du prix net vendeur" (FR) | **3,5 %** | SUSPECT — contredit `lib/mandates.ts` |
| `lib/legal/honoraires.ts` | 30 | "Mandat Semi-Exclusif : 4,0 % HT" (FR) | **4,0 %** | SUSPECT — contredit |
| `lib/legal/honoraires.ts` | 31 | "Mandat Simple : 4,5 % HT" (FR) | **4,5 %** | SUSPECT — contredit |
| `lib/legal/honoraires.ts` | 101–103 | Mêmes valeurs version EN | 3.5/4.0/4.5 % | SUSPECT — contredit |
| `lib/legal/honoraires.ts` | 172–174 | Mêmes valeurs version DE | 3,5/4,0/4,5 % | SUSPECT — contredit |
| `messages/fr.json` | 171 | `exclusive_text: "...3% HT + 17% TVA..."` | 3 % / 17 % | SUSPECT — cohérent avec `lib/mandates.ts` |
| `messages/fr.json` | 173 | `semi_text: "...4% HT + 17% TVA..."` | 4 % | SUSPECT |
| `messages/fr.json` | 175 | `simple_text: "...5% HT + 17% TVA..."` | 5 % | SUSPECT |
| `messages/fr.json` | 177 | `autonomous_text: "...1% HT + 17% TVA..."` | 1 % | SUSPECT |
| `messages/fr.json` | 373 | `mandate_exclusif.highlight_4_text: "3% HT (+ 17% TVA)..."` | 3 % | SUSPECT |
| `messages/fr.json` | 386 | `mandate_semi_exclusif.intro: "4% HT (+ 17% TVA)..."` | 4 % | SUSPECT |
| `messages/fr.json` | 405 | `mandate_simple.intro: "5% HT (+ 17% TVA)..."` | 5 % | SUSPECT |
| `messages/fr.json` | 411 | `mandate_simple.highlight_3_text: "5% HT (+ 17% TVA)..."` | 5 % | SUSPECT |
| `messages/fr.json` | 424 | `mandate_autonome.intro: "1% HT (+ 17% TVA)..."` | 1 % | SUSPECT |
| `messages/fr.json` | 430 | `mandate_autonome.highlight_3_text: "1% HT (+ 17% TVA)..."` | 1 % | SUSPECT |
| `messages/en.json` | 171/173/175/177 | "3/4/5/1% excl. VAT + 17% VAT" | 3/4/5/1 % | SUSPECT |
| `messages/en.json` | 373/386/405/411/424/430 | Mêmes valeurs sur pages mandats EN | idem | SUSPECT |
| `messages/de.json` | 171/173/175/177 | "3/4/5/1% zzgl. 17% MwSt." | 3/4/5/1 % | SUSPECT |
| `messages/de.json` | 373/386/405/411/424/430 | Mêmes valeurs sur pages mandats DE | idem | SUSPECT |
| `components/chatbot/chatbot-knowledge.ts` | 18 | "Mandat Exclusif (3,5 % HT)" (FR) | **3,5 %** | SUSPECT — contredit |
| `components/chatbot/chatbot-knowledge.ts` | 19 | "Mandat Semi-Exclusif (4,0 %)" (FR) | **4,0 %** | SUSPECT — contredit |
| `components/chatbot/chatbot-knowledge.ts` | 20 | "Mandat Simple (4,5 %)" (FR) | **4,5 %** | SUSPECT — contredit |
| `components/chatbot/chatbot-knowledge.ts` | 36 | "Vente : 3,5 / 4,0 / 4,5 % HT selon mandat" (FR) | **3,5/4,0/4,5 %** | SUSPECT — contredit |
| `components/chatbot/chatbot-knowledge.ts` | 106–108 | Mêmes valeurs en EN (3.5/4.0/4.5%) | **3.5/4.0/4.5 %** | SUSPECT — contredit |
| `components/chatbot/chatbot-knowledge.ts` | 123 | "Sale: 3.5 / 4.0 / 4.5%" (EN) | **3.5/4.0/4.5 %** | SUSPECT — contredit |
| `components/chatbot/chatbot-knowledge.ts` | 162–164 | Mêmes valeurs DE | **3,5/4,0/4,5 %** | SUSPECT — contredit |
| `components/chatbot/chatbot-knowledge.ts` | 178 | "Verkauf: 3,5 / 4,0 / 4,5%" (DE) | **3,5/4,0/4,5 %** | SUSPECT — contredit |
| `app/api/chatbot/route.ts` | 79 | Fallback EN: "Exclusive 3.5%, Semi 4.0%, Simple 4.5%" | **3.5/4.0/4.5 %** | SUSPECT — contredit |
| `app/api/chatbot/route.ts` | 88 | Fallback DE: "Exklusiv 3,5%, Halb 4,0%, Einfach 4,5%" | **3,5/4,0/4,5 %** | SUSPECT — contredit |
| `app/api/chatbot/route.ts` | 94 | Fallback FR: "Exclusif 3,5 %, Semi 4,0 %, Simple 4,5 %" | **3,5/4,0/4,5 %** | SUSPECT — contredit |

### B. Mandat de recherche

| Fichier | Ligne | Contexte | Valeur | Statut |
|---|---|---|---|---|
| `lib/legal/honoraires.ts` | 38 | "1 % à 3 % HT du prix d'acquisition selon juridiction et complexité" | **1 % → 3 %** | À CONFIRMER (brief mentionne 3 % min à 8 % max) |
| `lib/legal/honoraires.ts` | 110 | "1% to 3% (excl. VAT)" (EN) | 1–3 % | À CONFIRMER |
| `lib/legal/honoraires.ts` | 181 | "1 % bis 3 % zzgl. MwSt." (DE) | 1–3 % | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 24 | "1 % à 3 % HT du prix d'acquisition selon juridiction et complexité" | 1–3 % | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 37 | "Recherche : 1-3 % HT" | 1–3 % | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 112 | "1% to 3% (excl. VAT) of acquisition price" (EN) | 1–3 % | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 124 | "Search: 1-3%" (EN) | 1–3 % | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 168 | "1% bis 3% (zzgl. MwSt.)" (DE) | 1–3 % | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 179 | "Suche: 1-3%" (DE) | 1–3 % | À CONFIRMER |
| `app/api/chatbot/route.ts` | 79 | "Search mandate 1-3%" (EN) | 1–3 % | À CONFIRMER |
| `app/api/chatbot/route.ts` | 88 | "Suchmandat 1-3%" (DE) | 1–3 % | À CONFIRMER |
| `app/api/chatbot/route.ts` | 94 | "Mandat de recherche 1-3 %" (FR) | 1–3 % | À CONFIRMER |
| `lib/mandates.ts` | 71 | `rate: "Selon mission"` (recherche) | — | OK (texte générique) |

**Pas trouvé : avance sur frais 1 500–5 000 €.** Le code mentionne "avance sur frais peut être demandée, déductible" sans montant (cgv.ts L106, honoraires.ts L39) — manque le barème indicatif.

### C. Mise en location & gestion locative

| Fichier | Ligne | Contexte | Valeur | Statut |
|---|---|---|---|---|
| `lib/legal/honoraires.ts` | 46 | "un mois de loyer HT, partagé selon usage (50 % bailleur / 50 % locataire)" | 1 mois ; 50/50 | À CONFIRMER |
| `lib/legal/honoraires.ts` | 47 | "Gestion locative : 6 % à 8 % HT des loyers encaissés" | 6–8 % | À CONFIRMER |
| `lib/legal/honoraires.ts` | 118 | "Letting: one month's rent" (EN) | 1 mois | À CONFIRMER |
| `lib/legal/honoraires.ts` | 119 | "Property management: 6% to 8%" (EN) | 6–8 % | À CONFIRMER |
| `lib/legal/honoraires.ts` | 190 | "Hausverwaltung: 6 % bis 8 %" (DE) | 6–8 % | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 38 | "Location : 1 mois de loyer HT (mise en location) + 6-8 % HT (gestion locative)" | 1 mois ; 6–8 % | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 125 | "Rental: 1 month rent (letting) + 6-8% (management)" (EN) | idem | À CONFIRMER |
| `components/chatbot/chatbot-knowledge.ts` | 180 | "Vermietung: 1 Monatsmiete + 6-8% Verwaltung" (DE) | idem | À CONFIRMER |
| `components/simulators/SimulatorTabs.tsx` | 128 | Slider gestion locative `mgmtRate = 8 // %` (par défaut) | 8 % (slider 0–15 %) | À CONFIRMER (cohérent avec 6–8 %) |

### D. EVS (Estimation Visite & rapport)

> Brief : "gratuit avec exclusif, 250 € avec semi/simple, 500 € standalone".

| Fichier | Ligne | Contexte | Valeur | Statut |
|---|---|---|---|---|
| `lib/legal/honoraires.ts` | 60–63 | "Estimation indicative en ligne : gratuite … Estimation visite & rapport écrit : gratuite dans le cadre d'un mandat de vente potentiel ; sur devis hors mandat." | — | **MANQUE LES MONTANTS** : 250 € (semi/simple) et 500 € (standalone) ne figurent NULLE PART dans le code. Soit le brief diffère du code, soit le code est incomplet. |

### E. Cadre légal Luxembourg (vérifié)

| Fichier | Ligne | Contexte | Valeur | Statut |
|---|---|---|---|---|
| `lib/legal/honoraires.ts` | 23, 95, 166 | "TVA luxembourgeoise … 17 %" (FR/EN/DE) | 17 % | VÉRIFIÉ |
| `lib/legal/cgv.ts` | 83 | "TVA luxembourgeoise applicable est de 17 %" | 17 % | VÉRIFIÉ |
| `components/chatbot/chatbot-knowledge.ts` | 40, 127, 182 | TVA LU 17 % | 17 % | VÉRIFIÉ |
| `lib/legal/honoraires.ts` | 48 | "plafond loyer 5 % du capital investi par an (loi du 21 septembre 2006)" | 5 % | VÉRIFIÉ |
| `lib/legal/honoraires.ts` | 75 | "Frais d'enregistrement et de notaire : payés au notaire (~7 % au Luxembourg). Bëllegen Akt 40 000 € par acquéreur … loi du 3 juillet 2025" | 7 % ; 40 000 € | VÉRIFIÉ |
| `lib/legal/honoraires.ts` | 146, 217 | "Notary fees ~7% … 1% Bëllegen Akt" / "Notarkosten ~7% … 1% Bëllegen Akt" | 7 % ; 1 % | VÉRIFIÉ |
| `lib/legal-fees.ts` | 35 | `registration_rights: 0.07` (LU) | 7 % | VÉRIFIÉ |
| `lib/legal-fees.ts` | 36 | `notary_fees_pct: 0.01` (LU) | 1 % | À CONFIRMER (cf. incohérence §F) |
| `lib/legal-fees.ts` | 41 | `Bëllegen Akt: amount_per_person: 40000` | 40 000 € | VÉRIFIÉ |
| `lib/legal-fees.ts` | 43 | "Loi du 3 juillet 2025 (définitif)" | — | VÉRIFIÉ |
| `lib/legal-fees.ts` | 49 | Prêt climatique max 100 000 € | 100 000 € | À CONFIRMER (source officielle ?) |
| `lib/state-aids.ts` | 51 | "Abattement 40 000 EUR par acquéreur (loi du 3 juillet 2025)" | 40 000 € | VÉRIFIÉ |
| `lib/state-aids.ts` | 68–71 | "TVA logement super-réduite 3% … plafond crédit ~50 000 EUR" | 3 % ; 50 000 € | VÉRIFIÉ |
| `lib/state-aids.ts` | 94–96 | "PTZ 2026 … Étendu à tous logements neufs … jusqu'au 31/12/2027. maxAmount: 195000" | 195 000 € | À CONFIRMER (FR) |
| `messages/fr.json` | 150, 482, 493 | Plafond loyer 5 % (loi 21.09.2006) | 5 % | VÉRIFIÉ |
| `messages/fr.json` | 286 | "frais notaire 7%" (simulator) | 7 % | VÉRIFIÉ |
| `messages/fr.json` | 553, 566 | "Frais de notaire ~7%", "1% Bëllegen Akt" | 7 % ; 1 % | VÉRIFIÉ |
| `messages/fr.json` | 556 | "TVA réduite 3% (logement neuf, résidence principale)" | 3 % | VÉRIFIÉ |
| `messages/fr.json` | 550, 566, 593, 596 | "Plafond endettement 35%" (BCL/CSSF) | 35 % | VÉRIFIÉ |
| `messages/fr.json` | 587 | "Net après abattement fiscal LU 35%" | 35 % | À CONFIRMER (abattement locatif ?) |
| `components/chatbot/chatbot-knowledge.ts` | 49 | "TVA neuf résidence principale : 3 % réduit jusqu'à 50 000 € de crédit" | 3 % ; 50 000 € | VÉRIFIÉ |
| `components/chatbot/chatbot-knowledge.ts` | 50 | "Frais de notaire : ~7 %, dont 1 % Bëllegen Akt (avec abattement 40 000 €)" | 7 % ; 1 % ; 40 000 € | VÉRIFIÉ |
| `components/chatbot/chatbot-knowledge.ts` | 52 | "Plafond endettement : 35 % (BCL/CSSF)" | 35 % | VÉRIFIÉ |
| `lib/cities.ts` | 41 | "plafond légal de 5 % du capital investi par an (loi du 21 septembre 2006)" | 5 % | VÉRIFIÉ |

### F. Incohérences moteur estimateur / simulateur

| Fichier | Ligne | Contexte | Valeur | Statut |
|---|---|---|---|---|
| `lib/estimate.ts` | 151 | `notaryFees = mid * 0.07` (financement post-estimation) | 7 % | VÉRIFIÉ (alias frais notaire+enregistrement total) |
| `lib/estimate.ts` | 262 | `registrationDuty = priceEur * 0.07` | 7 % | VÉRIFIÉ |
| `lib/estimate.ts` | 264 | `notaryFees = priceEur * 0.0175` (~1,75 %) | **1,75 %** | **INCOHÉRENT** avec `lib/legal-fees.ts:36` (LU: 0.01 = 1 %). Deux moteurs concurrents. |
| `lib/estimate.ts` | 266 | `vatOnFees = mapaFees * 0.17` (TVA 17 % LU sur honoraires MAPA) | 17 % | VÉRIFIÉ |
| `lib/estimate.ts` | 226 | `capRate?: number; // 4.5% LU centre, 5.5% sud — par défaut 4.5%` | 4,5 % / 5,5 % | À CONFIRMER (méthode rendement) |
| `lib/estimate.ts` | 236 | `const capRate = input.capRate ?? 0.045` | 4,5 % | À CONFIRMER |
| `lib/estimate.ts` | 36 | "Coefficients CPE LU 10 niveaux : A++/A+ +8%, A +5%, B +2%, C 0% (base), D -3%, E -7%, F -12%, G -17%, H -22%, I -28%" | gamme | À CONFIRMER (source ?) |
| `lib/estimate.ts` | 5–16 | `BASE_PRICE_PER_SQM` : LU 12 000 €/m², FR 7 500, BE 5 500, MC 50 000, etc. | calibration | À CONFIRMER |
| `lib/estimate.ts` | 18–26 | `TYPE_FACTOR` : appart 1.0, maison 0.85, penthouse 1.35, duplex 1.1, villa 1.2, immeuble 0.7, terrain 0.3 | calibration | À CONFIRMER |
| `lib/estimate.ts` | 28–33 | `STATE_FACTOR` : to_renovate 0.7, good 0.95, renovated 1.05, new 1.15 | calibration | À CONFIRMER |
| `lib/estimate.ts` | 52–61 | `LU_COMMUNE_MULTIPLIER` : Belair 1.4, Lux-Ville 1.45, Limpertsberg 1.35, Kirchberg 1.3, Merl 1.2, Strassen 1.15, Bertrange 1.1, Walferdange 1.05 | calibration | À CONFIRMER |
| `lib/estimate.ts` | 125–127 | `low: mid * 0.85 / high: mid * 1.15` (fourchette ±15 %) | ±15 % | À CONFIRMER (mais cohérent avec biens similaires `app/[locale]/biens/[slug]/page.tsx:86,103`) |
| `lib/finance-sim.ts` | 80–87 | `DEFAULT_RATES_BY_COUNTRY` : LU 3.85, FR 3.65, BE 3.45, DE 3.95, PT 3.6, AE 4.5 (% taux fixe indicatif) | indicatif | VÉRIFIÉ (commentaire ligne 78 dit "mise à jour manuelle ou via le cron refresh-rates") |
| `components/property/MiniFinanceSimulator.tsx` | 43 | `const rate = DEFAULT_RATES_BY_COUNTRY[safeCountry] ?? 3.85` | 3,85 % | VÉRIFIÉ |
| `components/property/MiniFinanceSimulator.tsx` | 36 | Apport initial 20 % | 20 % | OK (paramètre simulateur) |
| `components/property/MiniFinanceSimulator.tsx` | 89 | `incomeRequired = mortgage.monthlyPayment / 0.35` (35 % endettement) | 35 % | VÉRIFIÉ |
| `components/simulators/SimulatorTabs.tsx` | 50 | `rate = rates?.rates?.fixed_25 ?? 3.6` (taux 25 ans par défaut) | 3,6 % | À CONFIRMER (fallback) |
| `components/simulators/SimulatorTabs.tsx` | 135 | `taxFactor = 0.65; // abattement fiscal 35% LU` | 35 % | À CONFIRMER (abattement locatif LU = 50 % réel selon code général, à vérifier) |
| `components/simulators/SimulatorTabs.tsx` | 137 | `overCap = grossYield > 5;` (alerte plafond 5 %) | 5 % | VÉRIFIÉ |
| `components/simulators/SimulatorTabs.tsx` | 217 | `rate = rates?.rates?.[fixed_${years}] ?? 3.6` | 3,6 % | À CONFIRMER (fallback) |
| `components/simulators/SimulatorTabs.tsx` | 219 | `dispo = Math.max(0, (income - charges) * 0.35);` | 35 % | VÉRIFIÉ |
| `components/simulators/SimulatorTabs.tsx` | 224 | `indicativeAcquisition = totalBudget / 1.07; // moins frais notaire` | 7 % | VÉRIFIÉ |
| `messages/fr.json` | 284 | "Apport (20%)" | 20 % | OK (paramètre) |
| `messages/fr.json` | 286 | "Calcul indicatif … apport 20%, durée 25 ans, frais notaire 7%" | 20 % ; 7 % | VÉRIFIÉ |
| `messages/en.json` | 284, 286 | Idem EN | idem | VÉRIFIÉ |
| `messages/de.json` | 284, 286 | Idem DE | idem | VÉRIFIÉ |

### G. Aides France / autres pays

| Fichier | Ligne | Contexte | Valeur | Statut |
|---|---|---|---|---|
| `lib/state-aids.ts` | 94 | "PTZ 2026 … prolongé jusqu'au 31/12/2027 … maxAmount: 195000" | 195 000 € | À CONFIRMER (réf décret 2025) |
| `lib/legal-fees.ts` | 62 | FR `registration_rights: 0.058` | 5,8 % | À CONFIRMER (DMTO départemental variable 4,5–5,8 %) |
| `lib/legal-fees.ts` | 63 | FR `notary_fees_pct: 0.008` (0,8 %) | 0,8 % | À CONFIRMER |
| `lib/legal-fees.ts` | 68 | FR PTZ `max_amount: 100000` | 100 000 € | **INCOHÉRENT** avec `lib/state-aids.ts:94` (195 000 €) |
| `lib/legal-fees.ts` | 74 | "Prêt Action Logement max_amount: 40 000" | 40 000 € | À CONFIRMER |
| `lib/legal-fees.ts` | 80 | "Pinel / Denormandie … réduction fiscale 12-21%" | 12–21 % | À CONFIRMER (dispositif Pinel fermé fin 2024) |
| `lib/legal-fees.ts` | 92 | BE `registration_rights: 0.12` | 12 % | À CONFIRMER (varie 12,5 % Bruxelles ; 12 % Wallonie ; 3 % Flandre PR) |
| `lib/legal-fees.ts` | 98 | "Abattement Région Bruxelloise amount: 200000 … < 600k€" | 200 000 € ; 600 000 € | À CONFIRMER |
| `lib/legal-fees.ts` | 109 | "Région Flamande … taux préférentiel 3%" | 3 % | À CONFIRMER |
| `lib/legal-fees.ts` | 116 | DE `registration_rights: 0.05` | 5 % | À CONFIRMER (Grunderwerbsteuer varie 3,5–6,5 % par Land) |
| `lib/legal-fees.ts` | 117 | DE `notary_fees_pct: 0.015` | 1,5 % | À CONFIRMER |
| `lib/legal-fees.ts` | 122 | KfW 124 max 100 000 € | 100 000 € | À CONFIRMER |
| `lib/legal-fees.ts` | 123 | KfW 124 rate "À partir de 2.5%" | 2,5 % | À CONFIRMER |
| `lib/legal-fees.ts` | 129 | "Baukindergeld amount_per_child: 12000" | 12 000 € | À CONFIRMER (programme suspendu) |
| `lib/legal-fees.ts` | 142 | PT `registration_rights: 0.064` | 6,4 % | À CONFIRMER (IMT progressif) |
| `lib/legal-fees.ts` | 143 | PT `notary_fees_pct: 0.01` | 1 % | À CONFIRMER |
| `lib/legal-fees.ts` | 149 | "IMT — Exemption résidence principale < 92k€" | 92 000 € | À CONFIRMER |
| `lib/legal-fees.ts` | 160 | AE `registration_rights: 0.04` | 4 % | VÉRIFIÉ (DLD Dubaï 4 %) |
| `lib/legal-fees.ts` | 165 | "Golden Visa … > 2M AED (~500k€), 10 ans" | 2 M AED ; 500 000 € | VÉRIFIÉ |
| `lib/legal-fees.ts` | 170 | "First-Time Buyer Mortgage 80% LTV" | 80 % LTV | À CONFIRMER |
| `lib/legal-fees.ts` | 176 | "DLD 4% partagé acheteur/vendeur (négociable). Frais agent RERA ~2%." | 4 % ; 2 % | VÉRIFIÉ (DLD) ; à confirmer (RERA) |

### H. Métadonnées / divers

| Fichier | Ligne | Contexte | Valeur | Statut |
|---|---|---|---|---|
| `lib/cities.ts` | 41 | "prix médians de 7 500 à 18 000 €/m²" (Luxembourg-Ville, FR) | 7 500–18 000 € | À CONFIRMER (source ?) |
| `lib/cities.ts` | 42, 43 | Idem EN, DE | idem | À CONFIRMER |
| `lib/legal/cgv.ts` | 84 | "L'honoraire est dû … vingt-quatre (24) mois" (survival clause) | 24 mois | VÉRIFIÉ (usage standard) |
| `lib/legal/cgv.ts` | 107 | Recherche : "vingt-quatre (24) mois" | 24 mois | VÉRIFIÉ |
| `lib/legal/cgv.ts` | 128 | "Plafond annuel de responsabilité … douze (12) mois" | 12 mois | VÉRIFIÉ |
| `lib/legal/honoraires.ts` | 77 | "Frais de déplacement … au-delà de 200 km du siège : forfait kilométrique sur devis" | 200 km | À CONFIRMER |
| `lib/legal/honoraires.ts` | 69 | "vente se conclut postérieurement à la fin du mandat dans un délai de 24 mois" | 24 mois | VÉRIFIÉ |

---

## Erreurs critiques à corriger (PRIORITÉ HAUTE)

### 1. Incohérence taux mandats vente entre 6 fichiers

- `lib/mandates.ts` et `messages/*.json` (descriptions mandats) affichent **3 / 4 / 5 / 1 %**.
- `components/home/MandatesGrid.tsx`, `lib/legal/honoraires.ts`, `components/chatbot/chatbot-knowledge.ts`, `app/api/chatbot/route.ts` affichent **3,5 / 4,0 / 4,5 % / devis**.

**Conséquence utilisateur :** la home dit "Exclusif 3,5 %" puis la page mandat dit "3 %" puis la page honoraires dit "3,5 %" puis le chatbot dit "3,5 %". Risque juridique et de confiance.

**Trancher avec Julien** : laquelle des deux grilles est la bonne ?

### 2. EVS (Estimation Visite & rapport) — montants absents

Brief : 250 € (semi/simple) et 500 € (standalone). Le code dit seulement "gratuite dans le cadre d'un mandat de vente potentiel ; sur devis hors mandat". **Les montants explicites n'apparaissent NULLE PART.** Soit le brief diffère, soit le code est incomplet.

### 3. Mandat de recherche — brief vs code

Le brief mentionne **3 % HT min à 8 % HT max** + avance 1 500–5 000 €. Le code affiche **partout 1 % à 3 %** (cgv, honoraires, chatbot, fallback) sans montant d'avance. Discordance complète à arbitrer.

### 4. Incohérence frais notaire LU dans le code

- `lib/legal-fees.ts:36` : `notary_fees_pct: 0.01` (1 %)
- `lib/estimate.ts:264` : `notaryFees = priceEur * 0.0175` (1,75 %)
- `lib/estimate.ts:151` : `notaryFees = mid * 0.07` (7 % — alias bloc total frais notaire+enregistrement)

Trois conventions différentes coexistent. Aligner ou commenter explicitement (ex. `notary_pct` = honoraires notaire stricts vs frais d'enregistrement séparés).

### 5. PTZ FR — incohérence montant max

- `lib/legal-fees.ts:68` : max 100 000 €
- `lib/state-aids.ts:94` : max 195 000 €

Aligner (le décret 2025 fixe désormais 195 000 € — `state-aids.ts` semble à jour, `legal-fees.ts` obsolète).

---

## Données à confirmer avec Julien

| # | Question | Référence à proposer |
|---|---|---|
| 1 | Taux exact **mandat exclusif** : 3 % ou 3,5 % HT ? | `lib/mandates.ts` vs `lib/legal/honoraires.ts` |
| 2 | Taux exact **mandat semi-exclusif** : 4 % ou 4,0 % ? (cohérence purement typographique, mais à figer) | idem |
| 3 | Taux exact **mandat simple** : 5 % ou 4,5 % ? | idem |
| 4 | Taux exact **mandat autonome** : 1 % ou forfait sur devis ? | idem |
| 5 | **Mandat de recherche** : 1–3 % ou 3–8 % ? | `lib/legal/honoraires.ts:38`, brief mission |
| 6 | **Avance sur frais mandat recherche** : montants 1 500–5 000 € ? Forfait fixe ? % du prix d'objectif ? | `lib/legal/honoraires.ts:39` (texte vague) |
| 7 | **EVS** (Estimation visite & rapport écrit) : tarif 250 €/500 € à publier ? | `lib/legal/honoraires.ts:60–63` (texte vague "sur devis") |
| 8 | **Mise en location** : 1 mois loyer 50/50 bailleur/locataire confirmé ? | `lib/legal/honoraires.ts:46` |
| 9 | **Gestion locative** : fourchette 6–8 % confirmée ? Tranches précises ? | `lib/legal/honoraires.ts:47` |
| 10 | **Mandat semi-exclusif** : "owner doit commission s'il utilise MAPA materials/buyers" — formulation dans CGV/honoraires ? | À vérifier dans `lib/legal/cgv.ts` |
| 11 | **Pack Vidéo en option** : tarif à publier ou maintenir "sur devis" ? | `messages/fr.json:369,376,390`, `lib/legal/honoraires.ts:54` |
| 12 | **Forfait kilométrique international > 200 km** : tarif fixe ou sur devis seulement ? | `lib/legal/honoraires.ts:77` |
| 13 | **Cap rate** estimateur : 4,5 % LU centre / 5,5 % sud — source ? | `lib/estimate.ts:226,236` |
| 14 | **Coefficients CPE** : A++ +8 % à I -28 % — source officielle ? | `lib/estimate.ts:36–49` |
| 15 | **Multiplicateurs communes LU** : Belair 1,4 ; Lux-Ville 1,45 ; etc. — source ? | `lib/estimate.ts:52–61` |
| 16 | **Prix médian Lux-Ville** "7 500 à 18 000 €/m²" — source ? | `lib/cities.ts:41` |
| 17 | **Abattement fiscal locatif LU 35 %** dans simulateur rendement — source ? | `components/simulators/SimulatorTabs.tsx:135`, `messages/fr.json:587` |
| 18 | **Frais d'enregistrement par pays** (FR 5,8 %, BE 12 %, DE 5 %, PT 6,4 %) — à actualiser ? | `lib/legal-fees.ts:62,92,116,142` |
| 19 | **Pinel/Denormandie 12–21 %** : dispositif Pinel fermé 31/12/2024 — encore mentionner ? | `lib/legal-fees.ts:80` |
| 20 | **Baukindergeld 12 000 €/enfant** : programme suspendu 2024 — encore mentionner ? | `lib/legal-fees.ts:129` |

---

## Recommandations correctifs (SANS appliquer)

### Court terme — bloquer la confusion utilisateur

1. **Trancher la grille mandats vente** (Julien). Une fois choisie, faire un seul `find/replace` :
   - Soit aligner `home/MandatesGrid.tsx`, `lib/legal/honoraires.ts`, `chatbot-knowledge.ts`, `app/api/chatbot/route.ts` sur `lib/mandates.ts` (3 / 4 / 5 / 1 %).
   - Soit l'inverse (3,5 / 4,0 / 4,5 % + devis autonome) en réécrivant `lib/mandates.ts` et tous les `messages/*.json`.
2. **Centraliser** les taux dans `lib/mandates.ts` (déjà la source de vérité pour pages mandats). Faire pointer `home/MandatesGrid.tsx`, `chatbot-knowledge.ts` et le fallback chatbot vers cette constante au lieu de chaînes en dur.
3. **Couper les valeurs SUSPECT en attente de validation** : remplacer temporairement les % par placeholders i18n "Taux sur demande / Quote on request / Auf Anfrage" dans :
   - `components/home/MandatesGrid.tsx` (rate)
   - `messages/{fr,en,de}.json` (clés `mandate_*.intro`, `highlight_*_text` avec un %)
   - `lib/legal/honoraires.ts` (paragraphes mandats vente FR/EN/DE)
   - `components/chatbot/chatbot-knowledge.ts` (sections 4 mandats + Honoraires résumé)
   - `app/api/chatbot/route.ts` (3 fallbacks linguistiques)
   - `lib/mandates.ts` (`rate` champ) → string `"Sur demande"`

### Moyen terme — robustesse données

4. **Aligner notaire LU** : harmoniser `lib/legal-fees.ts:36` (1 %) avec `lib/estimate.ts:264` (1,75 %). Documenter explicitement ce que chaque clé désigne (notaire pur vs notaire + droits totaux).
5. **Aligner PTZ FR** : `lib/legal-fees.ts:68` (100 000 €) à mettre à jour vers 195 000 € (cf. `lib/state-aids.ts:94` à jour avec décret 2025).
6. **Ajouter EVS** : créer une sous-section "Estimation visite & rapport écrit" dans `lib/legal/honoraires.ts` avec les montants confirmés (250 € / 500 €).
7. **Documenter sources** : pour les calibrations (`lib/estimate.ts`, `lib/cities.ts`), ajouter un commentaire `// Source: Observatoire de l'Habitat, rapport YYYY-MM, p.X` ou marquer `// CALIBRATION TODO — pas de source officielle citée`.
8. **Retirer programmes obsolètes** ou les flagger : Pinel (fermé 2024), Baukindergeld (suspendu).

### Long terme — hygiène

9. **Test snapshot i18n** : créer un test qui asserte que chaque mention de "%" dans `messages/*.json` matche les taux de `lib/mandates.ts` / `lib/legal-fees.ts` pour empêcher la dérive.
10. **PDF officiel** : la mention "le PDF officiel prime en cas de différence avec la version web" (`lib/legal/honoraires.ts:23,95,166`) suppose un PDF accessible — vérifier qu'il existe et qu'il est cohérent.

---

## Annexe — fichiers inspectés

- `app/[locale]/services/vendre/page.tsx` ✓ (utilise i18n + `lib/mandates.ts`, pas de chiffre en dur)
- `app/[locale]/services/estimer/page.tsx` ✓ (i18n only)
- `app/[locale]/services/simulateurs/page.tsx` ✓ (i18n + composant)
- `app/[locale]/legal/honoraires/page.tsx` ✓ (passe par `lib/legal/honoraires.ts`)
- `app/[locale]/mandats/[type]/page.tsx` ✓ (utilise `lib/mandates.ts`)
- `app/api/chatbot/route.ts` ✓ (fallbacks linguistiques)
- `components/home/MandatesGrid.tsx` ✓
- `components/property/MiniFinanceSimulator.tsx` ✓
- `components/simulators/FinancingSimulator.tsx` ✓
- `components/simulators/SimulatorTabs.tsx` ✓
- `components/chatbot/chatbot-knowledge.ts` ✓
- `lib/mandates.ts` ✓
- `lib/legal/honoraires.ts` ✓
- `lib/legal/cgv.ts` ✓
- `lib/legal-fees.ts` ✓
- `lib/state-aids.ts` ✓
- `lib/estimate.ts` ✓
- `lib/finance-sim.ts` ✓
- `lib/cities.ts` ✓ (seulement Luxembourg-Ville sondée pour exemple, 24 villes au total contiennent vraisemblablement des chiffres similaires non audités)
- `messages/fr.json` ✓
- `messages/en.json` ✓
- `messages/de.json` ✓

**Pas trouvé / inexistants :**
- `app/[locale]/services/mandat-de-recherche/page.tsx` → n'existe pas (la page mandat de recherche est `app/[locale]/mandats/recherche` via `[type]`).

---

*Fin du rapport — Agent AUDIT 1, Phase A-quinquies, 2026-05-12.*
*Aucune modification de code source. Aucun commit. Aucun push.*
