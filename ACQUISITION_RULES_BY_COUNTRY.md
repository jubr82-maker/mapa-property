# ACQUISITION_RULES_BY_COUNTRY

Référence officielle du moteur `lib/acquisition/` — calcul des frais
d'acquisition immobilière et aides d'État applicables par pays.

**Date de dernière vérification : 2026-05-12.**

Tous les chiffres ci-dessous proviennent de sources officielles
(administrations fiscales, banques centrales). Aucune valeur n'est inventée.

---

## Luxembourg (LU)

### Frais d'acquisition
- **Droits d'enregistrement** : **7,0 %** du prix (6 % enregistrement + 1 % transcription)
- **TVA logement neuf** : **3 %** super-réduite, plafond crédit **50 000 €**
- **Honoraires notaire** : **~1,0 %** (règlement grand-ducal du 19/12/2003, barème dégressif)
- **Frais hypothécaires** : **~0,5 %** du prix (inscription)

### Aides d'État
- **Bëllegen Akt** — **40 000 € / acquéreur** (80 000 € pour couple en indivision)
  - Conditions : résidence principale (occupation 2 ans, 4 ans VEFA)
  - **SANS condition d'âge ni de primo-accession** (loi du 3 juillet 2025)
  - Source : <https://logement.public.lu/fr/aides-logement/bellegen-akt.html>
  - Loi : <https://legilux.public.lu/eli/etat/leg/loi/2025/07/03/>

- **Crédit TVA logement 3 %** — plafond **50 000 €**
  - Conditions : logement neuf + résidence principale
  - Source : <https://pfi.public.lu/fr/aides-financieres/tva-logement.html>

### Financement (CSSF Règlement 20-05)
- **LTV résident primo RP** : 100 %
- **LTV résident non-primo RP** : 90 %
- **LTV résident locatif/secondaire** : 80 %
- **LTV non-résident** : 70 % (pratique bancaire)
- **Endettement max** : 35 % (cadre macroprudentiel BCL)
- Source : <https://www.cssf.lu/fr/Document/reglement-cssf-n-20-05/>

---

## France (FR)

### Frais d'acquisition
- **Droits de mutation ancien** : **~5,80 %** (5,09 % département + 0,10 % État + frais d'assiette)
- **Droits neuf (publicité foncière)** : **0,715 %** + TVA 20 % (déjà incluse au prix vendeur en VEFA)
- **Honoraires notaire (rémunération)** : **~1,0 %** ancien · **~0,6 %** neuf (décret 2016-230)
- **Frais hypothécaires** : **~0,75 %** (taxe publicité foncière inscription)

### Aides d'État
- **PTZ 2026 (Prêt à Taux Zéro)** — plafond **195 000 € en zone A** (variable selon zone et composition foyer)
  - Conditions : primo-accédant + résidence principale + logement neuf + résident fiscal France
  - **Prolongé jusqu'au 31/12/2027** (loi de finances 2025-2026)
  - Source : <https://www.service-public.fr/particuliers/vosdroits/F10793>

- **PTZ ancien sous travaux** (≥ 25 % du coût total) : warning, non automatique
- **MaPrimeRénov'** : non comptabilisé dans le calcul d'acquisition (post-achat)

### Financement (HCSF — Haut Conseil de Stabilité Financière)
- **Endettement max** : **35 %**
- **Durée max** : **25 ans** (27 ans avec différé neuf)
- **LTV résident** : ~90 %
- **LTV non-résident** : ~70 %
- Source : <https://www.banque-france.fr/fr/stabilite-financiere/haut-conseil-stabilite-financiere-hcsf>

---

## Belgique (BE)

### Frais d'acquisition (par région — **moteur prend Bruxelles par défaut**)

| Région | Droits standard | Taux RP réduit | Plafond RP |
|---|---|---|---|
| Bruxelles | 12,5 % | 12,5 % avec abattement 200 000 € | 600 000 € |
| Wallonie | 12,5 % | 6 % | 350 000 € (RP modeste) |
| Flandre | 12 % | 3 % | RP unique |

- **Honoraires notaire** : **~1,5 %**
- **Frais hypothécaires** : **~1,0 %**

### Aides d'État (Bruxelles)
- **Abattement Région bruxelloise** — réduction de **200 000 € sur la base imposable**
  - Conditions : habitation propre et unique + prix ≤ 600 000 € + résident
  - Source : <https://fiscalite.brussels/droits-denregistrement>

### Aides régionales (non implémentées — Phase B)
- Wallonie : chèque-habitat (sur revenus)
- Flandre : taux 3 % RP unique (intégré dans le taux, pas séparé)

### Financement (BNB)
- **LTV résident** : ~90 %
- **LTV non-résident** : ~80 %
- Source : <https://www.nbb.be/fr/stabilite-financiere/politique-macroprudentielle>

### Limitations
- **Région présumée : Bruxelles-Capitale.** Pas de champ région dans le profil.
- Pour Wallonie ou Flandre : consulter un notaire belge.

---

## Allemagne (DE)

### Frais d'acquisition (par Land — **moteur prend la moyenne 5,0 %**)

| Land | Grunderwerbsteuer |
|---|---|
| Bayern, Sachsen | 3,5 % |
| Hamburg | 4,5 % |
| Baden-Württemberg, Bremen, Niedersachsen, Rheinland-Pfalz, Sachsen-Anhalt | 5,0 % |
| Berlin, Hessen, Mecklenburg-Vorpommern, Thüringen | 6,0 % |
| Brandenburg, Nordrhein-Westfalen, Saarland, Schleswig-Holstein | 6,5 % |

- **Notarkosten** : **~1,5 %** (GNotKG — Gerichts- und Notarkostengesetz)
- **Grundbuch (registre foncier)** : **~0,5 %**

### Aides d'État
- **KfW Wohneigentumsprogramm 124** — prêt jusqu'à **100 000 €** à taux préférentiel
  - Conditions : résidence principale + résident Allemagne
  - Source : <https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestandsimmobilien/F%C3%B6rderprodukte/Wohneigentumsprogramm-(124)/>
  - **Exposé comme aide informative** (prêt, pas remise directe sur frais)

- **Baukindergeld** : **suspendu depuis 2022**, warning affiché
- Programmes Land (NRW.Bank, L-Bank Bayern) : à vérifier au cas par cas

### Financement (Bundesbank)
- **LTV résident** : ~80 %
- **LTV non-résident** : ~60 %
- Source : <https://www.bundesbank.de/de/aufgaben/bankenaufsicht/einzelaspekte/wohnimmobilien>

### Limitations
- **Taux moyen 5,0 % utilisé** (médiane fédérale). Pour calcul exact, préciser le Land.

---

## Portugal (PT)

### Frais d'acquisition (continent — Açores/Madère ont des taux réduits)

#### IMT (Imposto Municipal sobre Transmissões) — barème progressif 2024-2025

**Résidence principale (continent) :**

| Tranche | Taux |
|---|---|
| 0 → 97 064 € | **0 %** (exemption) |
| 97 064 → 132 774 € | 2 % |
| 132 774 → 181 034 € | 5 % |
| 181 034 → 301 688 € | 7 % |
| 301 688 → 603 269 € | 8 % |
| 603 269 → 1 050 400 € | 6 % (taux unique) |
| > 1 050 400 € | 7,5 % (taux marginal) |

**Habitation secondaire / locatif :** barème majoré (1 % dès le premier €).

- **Imposto do Selo** : **0,8 %** du prix
- **Honoraires notaire + registre** : **~1,25 %**
- **Frais hypothécaires** : **~0,5 %**

### Aides d'État
- **Exemption IMT résidence principale** ≤ 97 064 € (intégrée au barème ci-dessus)
  - Conditions : résidence principale + résident fiscal Portugal
  - Source : <https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt_rep/Pages/codigo-do-imt-indice.aspx>

### Financement (Banco de Portugal)
- **LTV résident** : ~90 %
- **LTV non-résident** : ~70 %
- **Durée max** : 40 ans
- Source : <https://www.bportugal.pt/comunicado/recomendacao-macroprudencial-no-ambito-dos-novos-creditos-celebrados-com>

### Limitations
- Barème basé sur 2024-2025. **À reconfirmer après loi de finances 2026**.
- Régions autonomes Açores/Madère non couvertes.

---

## Émirats Arabes Unis — Dubaï (AE)

### Frais d'acquisition
- **DLD fee (Dubai Land Department)** : **4 %** du prix
  - Source : <https://dubailand.gov.ae/en/eservices/fees/>
- **Trustee office fee** : **4 000 AED** (fixe, ≈ 1 008 €)
- **Mortgage registration** : **0,25 %** du loan + 290 AED (≈ 73 €)
- **Agent commission RERA** : **2 %** (usage de marché)

Conversion AED→EUR : taux indicatif **1 EUR ≈ 3,97 AED** (peg USD officiel CBUAE 1 USD = 3,6725 AED + parité EUR/USD ≈ 1,08).

### Aides d'État
- **AUCUNE** aide d'État type Bëllegen Akt à Dubaï. Le simulateur **n'applique aucune aide UE**.
- **Golden Visa** (information statutaire, pas une aide financière) :
  - Seuil : **2 000 000 AED** (≈ 504 000 €)
  - Avantage : résidence 10 ans renouvelable
  - Source : <https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa>

### Financement (Central Bank of UAE — Notice 31/2013)

| Profil | Prix | LTV max |
|---|---|---|
| Expat résident UAE | < 5 M AED (≈ 1,26 M €) | 80 % |
| Expat résident UAE | ≥ 5 M AED | 70 % |
| Non-résident | tout prix | 50 % (pratique bancaire) |

- **Durée max** : 25 ans
- **Pas d'IR sur revenu locatif, pas de capital gains tax**
- Source : <https://www.centralbank.ae/en/cbuae-amf/regulations/>

### Banner UX
- "L'acquisition d'un bien hors Union européenne est généralement financée par les banques locales du pays concerné."

---

## Limitations connues (à traiter en Phase B)

1. **BE** : pas de champ `region` dans `BuyerProfile` → Bruxelles par défaut. Évolution : ajouter un sélecteur Bruxelles / Wallonie / Flandre.
2. **DE** : pas de champ `land` → moyenne 5,0 %. Évolution : 16 Länder à exposer.
3. **PT** : barème IMT 2024-2025 à reconfirmer après loi de finances 2026. Açores/Madère non couvertes.
4. **AE** : taux AED→EUR indicatif fixe. Pour valeur de marché, brancher cron BCE/CBUAE.
5. **DE** : KfW 124 exposé en aide informative (amount=0). À affiner pour calculer économies réelles (intérêts évités).
6. **LU/FR** : LTV indicatifs basés sur la pratique bancaire et la réglementation publique. Les banques peuvent appliquer leurs propres règles internes plus strictes.

---

## Sources globales

- **Luxembourg** : logement.public.lu · legilux.public.lu · cssf.lu · bcl.lu
- **France** : service-public.fr · economie.gouv.fr · banque-france.fr
- **Belgique** : fiscalite.brussels · finances.wallonie.be · vlaanderen.be · nbb.be
- **Allemagne** : bmwsb.bund.de · kfw.de · bundesbank.de · gesetze-im-internet.de
- **Portugal** : portaldasfinancas.gov.pt · bportugal.pt
- **Émirats** : dubailand.gov.ae · centralbank.ae · u.ae

JSON consolidé : `lib/acquisition/sources.json`.
