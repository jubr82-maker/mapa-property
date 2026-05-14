# Audit Chiffres Marché — 2026-05-12

## Résumé

- Occurrences chiffrées trouvées : ~130 lignes (€/m², %, abattements) sur ~14 fichiers.
- Sources interdites détectées : **0** (aucune mention de `mortgage.lu`, `athome.lu`, `seloger.lu`, etc.).
- Sources autorisées citées : **STATEC implicite (non cité)**, **Observatoire de l'Habitat**, **BCL**, **CSSF**, **BCE**, **Ministère du Logement**, **AEFE** (écoles).
- Erreurs critiques : **3** (loi Bëllegen Akt 3 juillet 2025 — condition primo-accédant erronée à plusieurs endroits).
- "Écoles publiques internationales" : **aucune occurrence**. Toutes les écoles internationales (ISL, Vauban, École Européenne I/II, St. George's) sont correctement marquées "(privé)" / "(privé EU)" / "(privé AEFE)" / "(privé britannique)".

## Sources interdites (suppression immédiate)

| Fichier | Ligne | Mention |
|---|---|---|
| — | — | aucune |

Aucune occurrence de `mortgage.lu`, `athome.lu` / `atHome.lu` (graphies courantes), `seloger.lu` n'a été détectée dans `app/`, `components/`, `messages/`, `lib/`, ni dans les fichiers markdown du repo.

## Prix m² cités — Luxembourg (LU)

### Quartiers de Luxembourg-Ville

| Fichier | Ligne | Lieu | Valeur | Statut |
|---|---|---|---|---|
| `lib/cities.ts` | 41-43 | Luxembourg-Ville (global) | 7 500 - 18 000 €/m² | À confirmer (cohérent avec la dispersion) |
| `lib/cities.ts` | 46-48 | Luxembourg-Ville (meta) | 7500-18000 €/m² | À confirmer |
| `lib/cities.ts` | 67-74 | **Belair** | **8 500 - 16 000 €/m²** (médian 11 500) | **CONFORME à la règle Julien** |
| `lib/cities.ts` | 87-94 | Limpertsberg | 8 000 - 14 500 €/m² | À confirmer |
| `lib/cities.ts` | 107-114 | Kirchberg | 8 500 - 14 000 €/m² | À confirmer |
| `lib/cities.ts` | 157-159 | Bonnevoie | 6 500 - 11 000 €/m² | À confirmer |
| `lib/cities.ts` | 169-171 | Cents | 7 500 - 12 500 €/m² | À confirmer |
| `lib/cities.ts` | 181-183 | Cessange | 6 500 - 10 500 €/m² | À confirmer |
| `lib/cities.ts` | 193-195 | Clausen | 7 000 - 13 000 €/m² | À confirmer |
| `lib/cities.ts` | 205-207 | Eich | 6 500 - 11 000 €/m² | À confirmer |
| `lib/cities.ts` | 218-220 | Gasperich | 7 500 - 12 500 €/m² | À confirmer |
| `lib/cities.ts` | 230-232 | Grund | 7 000 - 13 500 €/m² | À confirmer |
| `lib/cities.ts` | 243-245 | Hamm | 7 000 - 11 500 €/m² | À confirmer |
| `lib/cities.ts` | 255-257 | Hollerich | 6 500 - 11 000 €/m² | À confirmer |
| `lib/cities.ts` | 268-270 | Merl | 8 000 - 14 000 €/m² | À confirmer |
| `lib/cities.ts` | 280-282 | Neudorf | 7 000 - 12 000 €/m² | À confirmer |
| `lib/cities.ts` | 292-294 | Pfaffenthal | 6 500 - 12 000 €/m² | À confirmer |
| `lib/cities.ts` | 304-306 | Weimerskirch | 6 500 - 11 000 €/m² | À confirmer |

### Autres communes LU

| Fichier | Ligne | Lieu | Valeur | Statut |
|---|---|---|---|---|
| `lib/cities.ts` | 319-326 | Esch-sur-Alzette | 5 500 - 9 500 €/m² | À confirmer |
| `lib/cities.ts` | 339-346 | Differdange | 5 000 - 8 500 €/m² | À confirmer |
| `lib/cities.ts` | 358-365 | Dudelange | 5 500 - 9 000 €/m² | À confirmer |
| `lib/cities.ts` | 378-385 | Mamer | 7 000 - 12 000 €/m² | À confirmer |
| `lib/cities.ts` | 397-404 | Strassen | 7 500 - 13 000 €/m² | À confirmer |
| `lib/cities.ts` | 416-423 | Bertrange | 7 000 - 12 500 €/m² | À confirmer |
| `lib/cities.ts` | 435-442 | Walferdange | 6 500 - 11 500 €/m² | À confirmer |

### Coefficients estimateur (lib/estimate.ts)

| Fichier | Ligne | Donnée | Valeur | Statut |
|---|---|---|---|---|
| `lib/estimate.ts` | 6 | BASE LU | 12 000 €/m² | À confirmer (calibrage 2024-2025) |
| `lib/estimate.ts` | 53 | Multiplicateur Belair | 1.4 | À confirmer (donne ≈16 800 €/m² avec état "good"+énergie C) |
| `lib/estimate.ts` | 54 | Multiplicateur Limpertsberg | 1.35 | À confirmer |
| `lib/estimate.ts` | 55 | Multiplicateur Kirchberg | 1.3 | À confirmer |
| `lib/estimate.ts` | 56 | Multiplicateur Merl | 1.2 | À confirmer |
| `lib/estimate.ts` | 57 | "Luxembourg-Ville" | 1.45 | À confirmer (s'applique si commune == "Luxembourg-Ville", pas un quartier listé) |
| `lib/estimate.ts` | 58 | Strassen | 1.15 | À confirmer |
| `lib/estimate.ts` | 59 | Bertrange | 1.1 | À confirmer |
| `lib/estimate.ts` | 60 | Walferdange | 1.05 | À confirmer |

Note : le multiplicateur Belair (1.4) appliqué à un bien "to_renovate" (0.7) + énergie I (0.72) → ≈ 8 467 €/m², juste en dessous du plancher Belair de 8 500 € défini dans `lib/cities.ts`. Léger écart à signaler.

## Prix m² cités — International

| Fichier | Ligne | Lieu | Valeur | Statut |
|---|---|---|---|---|
| `lib/cities.ts` | 484-486 | Paris | 10 000 - 35 000 €/m² | À confirmer (hors périmètre LU) |
| `lib/cities.ts` | 498-500 | Cannes | 8 000 - 30 000 €/m² | À confirmer |
| `lib/cities.ts` | 512-514 | Nice | 5 500 - 18 000 €/m² | À confirmer |
| `lib/cities.ts` | 526-528 | Saint-Tropez | 12 000 - 60 000 €/m² | À confirmer |
| `lib/cities.ts` | 540-542 | Monaco | 40 000 - 120 000 €/m² | À confirmer |
| `lib/cities.ts` | 553-555 | Genève | 14 000 - 35 000 €/m² | À confirmer |
| `lib/cities.ts` | 566-568 | Lausanne | 9 500 - 22 000 €/m² | À confirmer |
| `lib/cities.ts` | 579-581 | Zurich | 13 000 - 30 000 €/m² | À confirmer |
| `lib/cities.ts` | 592-594 | Bruxelles | 6 000 - 12 000 €/m² (premium) / 3 500 - 6 000 €/m² (reste) | À confirmer |
| `lib/cities.ts` | 605-607 | Anvers | 2 800 - 8 500 €/m² | À confirmer |
| `lib/cities.ts` | 618-620 | Amsterdam | 7 500 - 18 000 €/m² | À confirmer |
| `lib/cities.ts` | 629-633 | Londres (Prime Central) | 16 000 - 50 000 €/m² | À confirmer |
| `lib/cities.ts` | 644-646 | Madrid | 7 000 - 14 000 €/m² | À confirmer |
| `lib/cities.ts` | 657-659 | Barcelone | 4 500 - 15 000 €/m² | À confirmer |
| `lib/cities.ts` | 670-672 | Lisbonne | 6 000 - 11 000 €/m² | À confirmer |
| `lib/cities.ts` | 683-685 | Porto | 2 800 - 8 500 €/m² | À confirmer |
| `lib/cities.ts` | 696-698 | Rome | 8 000 - 18 000 €/m² | À confirmer |
| `lib/cities.ts` | 709-711 | Milan | 5 500 - 22 000 €/m² | À confirmer |
| `lib/cities.ts` | 723-725 | Florence | 4 500 - 14 000 €/m² | À confirmer |
| `lib/cities.ts` | 736-738 | Vienne | 5 000 - 16 000 €/m² | À confirmer |
| `lib/cities.ts` | 749-751 | Berlin | 7 000 - 14 000 €/m² (premium) / 4 500 - 7 000 €/m² (reste) | À confirmer |
| `lib/cities.ts` | 762-764 | Munich | 9 000 - 22 000 €/m² | À confirmer |
| `lib/cities.ts` | 775-777 | Francfort | 5 500 - 14 000 €/m² | À confirmer |
| `lib/cities.ts` | 788-790 | Hambourg | 4 500 - 13 000 €/m² | À confirmer |
| `lib/cities.ts` | 801-803 | Dubaï | 4 500 - 30 000 €/m² | À confirmer |
| `lib/cities.ts` | 814-816 | New York | 12 000 - 60 000 €/m²-eq. | À confirmer |
| `lib/cities.ts` | 827-829 | Miami | 8 000 - 25 000 €/m² (premium) / 4 500 - 8 000 €/m² | À confirmer |
| `lib/cities.ts` | 841-843 | Saint-Barthélemy | 18 000 - 80 000 €/m² | À confirmer |

## Bëllegen Akt / droits LU / TVA LU

### Bëllegen Akt — 40 000 €/acquéreur (loi du 3 juillet 2025)

| Fichier | Ligne | Mention | Conforme ? |
|---|---|---|---|
| `lib/state-aids.ts` | 47-64 | Abattement 40 000 EUR/acquéreur, `primoAccedant: null`, `couple.multiplier: 2`, `legalRef: "Loi du 3 juillet 2025"` | **OK** |
| `lib/legal-fees.ts` | 40-44 | `amount_per_person: 40000`, `conditions: "Première acquisition + résidence principale + âge 18+"`, `legal_ref: "Loi du 3 juillet 2025"` | **ERREUR** — la loi de juillet 2025 a supprimé la condition primo-accédant ("première acquisition") |
| `lib/legal/honoraires.ts` | 75 | "abattement de 40 000 € par acquéreur, **sans condition d'âge ni de primo-accession**, pour toute résidence principale (loi du 3 juillet 2025)" | **OK** (formulation correcte) |
| `lib/legal/honoraires.ts` | 146 | EN : "rebate for **first-time buyer** / primary residence" | **ERREUR** (incompatible avec ligne 75 FR) |
| `lib/legal/honoraires.ts` | 217 | DE : "Rabatt bei **Erstkauf** / Hauptwohnsitz" | **ERREUR** (incompatible avec ligne 75 FR) |
| `lib/estimate.ts` | 173 | "Abattement 40 000 € par acquéreur (${buyers} personne${buyers > 1 ? "s" : ""})" | **OK** |
| `lib/estimate.ts` | 197 | helps : "Primo-acquéreur, revenus modestes" | À vérifier — semble être un autre dispositif (Garantie d'État), pas Bëllegen Akt |
| `components/chatbot/chatbot-knowledge.ts` | 50 | FR : "Frais de notaire : ~7 % du prix d'acquisition, dont 1 % Bëllegen Akt (avec abattement 40 000 € par **primo-acquéreur** résidence principale)" | **ERREUR** |
| `components/chatbot/chatbot-knowledge.ts` | 55 | FR : "Bëllegen Akt : abattement droits enregistrement 40 000 € par **primo-acquéreur** résidence principale" | **ERREUR** |
| `components/chatbot/chatbot-knowledge.ts` | 137 | EN : "€40,000 rebate per **first-time buyer** / primary residence" | **ERREUR** |
| `components/chatbot/chatbot-knowledge.ts` | 192 | DE : "1% Bëllegen Akt" (sans précision condition) | OK partiel |
| `messages/fr.json` | 555-566 | UI : "Bëllegen Akt (abattement droits d'enregistrement)" + disclaimer "1% Bëllegen Akt **avec abattement éventuel**" | OK (n'affirme pas condition primo) |
| `messages/en.json` | 555-566 | idem EN | OK |
| `messages/de.json` | 555-566 | idem DE | OK |

### Droits d'enregistrement LU 7%

| Fichier | Ligne | Mention | Conforme ? |
|---|---|---|---|
| `lib/legal-fees.ts` | 35-36 | `registration_rights: 0.07` + `notary_fees_pct: 0.01` (total ~7-8%) | OK (cohérent avec règle 7% = 6% enregistrement + 1% transcription, présentation différente mais montant total juste) |
| `lib/estimate.ts` | 253-254 | commentaire `registrationDuty: number; // 7% LU` | OK |
| messages/fr.json, en.json, de.json | 286, 553, 566 | "frais notaire 7%" / "notary fees ~7%" / "Notarkosten ~7%" | OK |
| `lib/legal/honoraires.ts` | 75 | "Frais d'enregistrement et de notaire : payés au notaire (~7 % au Luxembourg)" | OK |
| `components/chatbot/chatbot-knowledge.ts` | 50, 137, 192 | "~7%" | OK |

**Remarque** : la décomposition canonique de Julien est 6% enregistrement + 1% transcription = 7%. Dans `lib/legal-fees.ts` LU, c'est exprimé comme `registration_rights: 7% + notary_fees_pct: 1%` (=8%). Sémantiquement incorrect (le 1% c'est la transcription, pas les honoraires notaire), mais le total ≈ 7-8% est défendable. **À clarifier avec Julien.**

### TVA LU 3% logement neuf

| Fichier | Ligne | Mention | Conforme ? |
|---|---|---|---|
| `lib/state-aids.ts` | 66-83 | "TVA super-réduite à 3% pour la construction/rénovation de la résidence principale, plafond crédit ~50 000 EUR" | OK |
| `lib/legal-fees.ts` | 54-57 | "TVA réduite 3% — Construction neuve résidence principale jusqu'à 50k€ de crédit" | OK |
| `components/chatbot/chatbot-knowledge.ts` | 49, 136, 181 | "TVA neuf résidence principale : 3 %" | OK |

### TVA Lux "17%" (honoraires)

Pas une erreur : la TVA luxembourgeoise sur les **services d'honoraires** est bien 17% (taux standard LU). Documentée correctement dans `lib/mandates.ts`, `lib/legal/honoraires.ts`, `lib/legal/cgv.ts`, messages.

## Écoles "publiques internationales" (erreur classique)

**Aucune occurrence.** Toutes les écoles internationales sont correctement étiquetées :
- `lib/cities.ts:32` : `"École Européenne I (Kirchberg, privé EU)", "Vauban (privé AEFE Gasperich)", "ISL (privé Merl)", "EIGT Luxembourg-Ville (public)"` — note : EIGT est une école publique luxembourgeoise (Ecole Internationale Differdange et Esch / Gaston Thorn) — pas une école internationale "premium" mais utilisée par la classe internationale, à valider sémantiquement.
- `lib/cities.ts:58` : Belair — "(privé AEFE)" / "(privé EU)" / "(privé)" — OK
- `lib/cities.ts:84` : Limpertsberg — "(privé AEFE)" + "Lycée Michel Lucius (public, EIMAB partenaire)" — OK
- `lib/cities.ts:104` : Kirchberg — "(privé EU)" / "(privé AEFE)" — OK
- `lib/cities.ts:215-216` : Gasperich — "(privé AEFE, sur place)" / "(Kirchberg, à 10 min)" — OK
- `lib/cities.ts:240-241` : Hamm — "St. George's (privé britannique)" — OK
- `lib/cities.ts:265-266` : Merl — "ISL (privé international)" — OK
- `lib/cities.ts:375-376` : Mamer — "École Européenne II (privé EU)" — OK

Le libellé de section générique `"Écoles internationales"` / `"International schools"` / `"Internationale Schulen"` dans `app/[locale]/villes/[ville]/page.tsx:59,70,81` est neutre (titre de section listant un tableau) — non problématique.

## Sources autorisées effectivement citées

| Source autorisée Julien | Cité dans le repo ? | Où |
|---|---|---|
| STATEC | Non explicitement | — |
| Observatoire de l'Habitat | OUI | `messages/fr.json:498,500,565` + en/de + `components/chatbot/chatbot-knowledge.ts:61` + `lib/estimate.ts:3` |
| ABBL | Non explicitement | — |
| BCE | OUI (rates cron) | `app/api/cron/bce-rates/route.ts:61` |
| BCL | OUI | `messages/*.json` (multiples), `components/simulators/SimulatorTabs.tsx:112` |
| CSSF | OUI (mention recommandations 35%) | `messages/*.json`, chatbot |
| Immotop.lu | Non | — |
| Chambre Immobilière | Non | — |
| TEGoVA | Non | — |
| Ministère du Logement | OUI | `messages/*.json:500,565` ("Ministère du Logement luxembourgeois") |

## Erreurs critiques à corriger

1. **Bëllegen Akt — condition primo-accédant ERRONÉE** : la loi du 3 juillet 2025 a supprimé la condition de primo-accession ; l'abattement de 40 000 €/acquéreur s'applique désormais à **toute résidence principale**, sans condition d'âge ni de première acquisition. Cette formulation correcte n'existe **que** dans `lib/legal/honoraires.ts:75` (FR). Les autres endroits sont à corriger :
   - `lib/legal-fees.ts:42` (`"Première acquisition + résidence principale + âge 18+"`)
   - `lib/legal/honoraires.ts:146` (EN : "first-time buyer")
   - `lib/legal/honoraires.ts:217` (DE : "Erstkauf")
   - `components/chatbot/chatbot-knowledge.ts:50,55,137` (FR/EN : "primo-acquéreur" / "first-time buyer")

2. **Décomposition droits LU 6%+1% non explicitée** : `lib/legal-fees.ts:33-36` exprime LU comme `registration_rights: 0.07` + `notary_fees_pct: 0.01`, ce qui peut donner l'impression d'un total de 8%. La réalité légale Julien : 7% TOTAL = 6% enregistrement + 1% transcription (et les honoraires de notaire eux-mêmes sont indépendants, ~1-1.5% additionnel). **Confusion sémantique à clarifier.**

3. **STATEC non cité comme source** : alors qu'il fait partie des sources autorisées par Julien, aucune mention dans le repo. Recommandation : citer STATEC dans les disclaimers prix m².

## Données à confirmer

- Les fourchettes €/m² des **23 communes/quartiers LU** dans `lib/cities.ts` (hors Belair qui est conforme à la règle) : Julien doit valider chaque fourchette versus ses observations terrain. Le brief ne donne explicitement que Belair (8500-16000 €/m²).
- Le multiplicateur Belair 1.4 dans `lib/estimate.ts:53` couplé au BASE LU 12000 €/m² donne 16 800 €/m² avant facteurs d'état/énergie/type. Avec un appartement neuf énergie A++, le calcul donne ≈ 20 866 €/m² (1.0 × 1.15 × 1.08), au-dessus du plafond Belair de 16 000 €/m². **Risque de sortie de fourchette dans l'estimateur**.
- Pertinence des fourchettes Luxembourg-Ville globales (7 500 - 18 000 €/m²) au regard de la fourchette Belair (8 500 - 16 000 €/m²) : le plafond global > plafond Belair, ce qui suppose qu'un autre micro-marché (centre historique UNESCO ?) dépasse Belair. À valider.
- Coefficients DPE LU 10 niveaux dans `lib/estimate.ts:37-49` (A++/A+ +8% jusqu'à I -28%) : cohérence avec calibrage Observatoire de l'Habitat à valider.
- L'EIGT (`lib/cities.ts:32`) classée "(public)" — vérifier la sémantique vs école internationale privée. EIGT est une école publique d'État luxembourgeoise (gratuite) avec un volet international ; OK si on l'oppose explicitement aux écoles privées internationales.

## Recommandations

1. **Corriger en priorité la formulation Bëllegen Akt** dans 4 fichiers (cf. erreurs critiques #1) pour aligner avec la loi du 3 juillet 2025 et le texte FR de `lib/legal/honoraires.ts:75`.
2. **Clarifier la décomposition LU 7% = 6% + 1%** dans `lib/legal-fees.ts:33-36` (ajouter un champ `transcription_rights: 0.01` distinct, ou commentaire JSDoc).
3. **Ajouter STATEC** comme source citée à côté d'Observatoire de l'Habitat dans les disclaimers prix m² (`messages/*.json:498,500,565`).
4. **Valider les 23 fourchettes LU dans `lib/cities.ts`** avec une revue Julien — proposer un script de cohérence interne (le plafond LU global ≥ plafond du quartier le plus cher).
5. **Borner l'estimateur Belair** dans `lib/estimate.ts` pour ne pas dépasser 16 000 €/m² (clamp final sur la valeur `pricePerSqm` selon la commune, conforme aux fourchettes `lib/cities.ts`).
6. **Aucune source interdite à supprimer** — le repo est propre sur ce point.
