# Sources données prix immobilier Luxembourg

Date : 2026-05-14
Statut : ✅ Sources légales identifiées et intégrées

## Verdict : zéro scraping, 100% données gouvernementales open data

Le **Ministère du Logement et de l'Aménagement du Territoire — Observatoire de l'Habitat** publie sur le portail open data gouvernemental **`data.public.lu`** plusieurs datasets contenant à la fois :

1. Les **prix RÉELS de vente** (issus des actes notariés transmis par l'Administration de l'Enregistrement et des Domaines via la Publicité Foncière)
2. Les **prix annoncés** (issus du portail IMMOTOP.LU et de la presse spécialisée, via un partenariat officiel entre IMMOTOP et l'Observatoire)

Tous ces datasets sont publiés sous licence **Creative Commons Zero (CC0)** — utilisation totalement libre, y compris commerciale, sans aucune restriction.

**Implication clé** : nous accédons **uniquement** aux fichiers `.xls`/`.xlsx` officiels du gouvernement. Nous ne contactons **jamais directement** athome.lu, immotop.lu, nextimmo.lu ou tout autre portail commercial. Le scraping de ces sites reste strictement interdit (CGU/CGV) et nous ne le pratiquons pas.

## Datasets utilisés

| Dataset | URL data.public.lu | Format | Mise à jour | Couverture |
|---|---|---|---|---|
| Prix de vente des appartements par commune | [link](https://data.public.lu/en/datasets/prix-de-vente-des-appartements-par-commune/) | XLS (20 fichiers, un par année 2007→2025) | Trimestrielle | 101 communes LU, appartements existants + VEFA, basé actes notariés |
| Prix annoncés des logements par commune | [link](https://data.public.lu/en/datasets/prix-annonces-des-logements-par-commune/) | XLS + XLSX (séries rétrospectives 2010→2025) | Trimestrielle | Appartements + maisons, prix demandés annonces |
| Prix annoncés Luxembourg-Ville par quartier | [link](https://data.public.lu/en/datasets/prix-annonces-des-logements-a-luxembourg-ville-par-quartier/) | XLSX | Trimestrielle | 25 quartiers VDL (Belair, Limpertsberg, Kirchberg, etc.) appart + maison |
| Page institutionnelle | [logement.public.lu/observatoire-habitat/prix-de-vente](https://logement.public.lu/fr/observatoire-habitat/prix-de-vente.html) | HTML méthodo | — | Documentation officielle |

### URLs directes des fichiers utilisés (snapshot 2026-05-14)

```
https://download.data.public.lu/resources/prix-de-vente-des-appartements-par-commune/20260326-094317/prix-moyen-au-metre-carre-enregistre-par-commune-2025t4.xls
https://download.data.public.lu/resources/prix-annonces-des-logements-par-commune/20260326-095720/vente-appartement-2025.xls
https://download.data.public.lu/resources/prix-annonces-des-logements-par-commune/20260326-095743/vente-maison-2025.xls
https://download.data.public.lu/resources/prix-annonces-des-logements-a-luxembourg-ville-par-quartier/20260326-100323/vdl-vente-appartements-2025.xlsx
https://download.data.public.lu/resources/prix-annonces-des-logements-a-luxembourg-ville-par-quartier/20260326-100343/vdl-vente-maisons-2025.xlsx
```

## Méthodologie officielle (rappel)

### Prix de vente réels (actes notariés)
- Source : Publicité Foncière (Administration de l'Enregistrement et des Domaines)
- Données mensuelles transmises à l'Observatoire de l'Habitat
- Distinction appartements existants (marché ancien) vs VEFA (marché neuf)
- **Confidentialité statistique** : prix non publié si <10 transactions / commune / période
- Fourchettes calculées en excluant les 5% plus bas et 5% plus hauts

### Prix annoncés
- Source : annonces IMMOTOP.LU + presse spécialisée
- **Confidentialité statistique** : prix non publié si <30 annonces / commune / période
- **Limitation explicite** : prix demandés au moment de la mise en vente, avant négociation

### Décote MAPA appliquée : -8.75% (annoncé → vente effective)

Règle métier MAPA : l'écart moyen entre prix annoncé et prix de vente effectif est typiquement **7,5 à 10 %**. Nous appliquons la moyenne (**8,75 %**) sur les prix annoncés pour estimer un prix de vente probable. Cette décote n'est appliquée que lorsque le prix réel notarié n'est pas disponible (commune <10 ventes).

Formule : `estimated_real_m2 = announced_avg_m2 × 0.9125`

## Couverture obtenue (année 2025)

| Source | Couverture |
|---|---|
| Communes LU totales | 101 (toutes recensées) |
| Communes avec prix RÉEL appart existant publié (≥10 ventes) | 55 |
| Communes avec prix RÉEL VEFA publié (≥10 ventes) | 18 |
| Communes avec prix annoncé appart (≥30 offres) | 62 |
| Communes avec prix annoncé maison (≥30 offres) | 81 |
| Quartiers Luxembourg-Ville (annoncés) | 25 (Belair, Limpertsberg, Kirchberg, Bonnevoie, etc.) |

**Combinaison réel + annoncé décoté** : couverture quasi-totale pour appartements et maisons sur l'ensemble des 101 communes + 25 quartiers VDL.

## Données dans le repo

| Fichier | Contenu |
|---|---|
| `lib/data/luxembourg-prices.ts` | Référentiel TS embedded (1913 lignes), 2 helpers `getBaselinePricePerSqm()` et `getBaselinePriceVdlQuartier()` |
| `supabase/migrations/20260514_commune_baseline.sql` | Migration Supabase à appliquer en SQL Editor (2 tables + RLS + seed) |
| `/tmp/parse_lux_v2.py` | Script de parsing (à promouvoir en `scripts/refresh-lux-prices.ts` en V2) |
| `/tmp/lux_prices.json` | JSON intermédiaire (101 communes + 25 quartiers VDL) |

## Logique de priorité dans le moteur d'estimation

1. **Priorité 1 — Prix réel notarié** : si `real_existing_avg_m2` (ou `real_vefa_avg_m2` pour neuf) disponible → confidence HIGH
2. **Priorité 2 — Prix annoncé décoté** : si pas de réel publié, utiliser `estimated_*_m2_from_ann` (annoncé × 0.9125) → confidence MEDIUM
3. **Fallback** : moyenne nationale calculée dynamiquement → confidence LOW

## Rafraîchissement des données

L'Observatoire publie trimestriellement (T4 publié fin mars, T1 publié fin juin, etc.). Pour rafraîchir :

```bash
# V2 à créer :
pnpm exec tsx scripts/refresh-lux-prices.ts

# V1 (actuel) — manuel via le script Python :
python3 /tmp/parse_lux_v2.py
# Puis copier lib/data/luxembourg-prices.ts + supabase/migrations/<date>_commune_baseline.sql
```

## Autres sources potentielles (non utilisées)

- **STATEC** (statistiques.public.lu) : publie des **indices** trimestriels nationaux mais pas les prix par commune dans un format machine-readable aussi pratique que data.public.lu
- **LISER** (Luxembourg Institute of Socio-Economic Research) : études économiques approfondies (PDF) — utile pour rapport éditorial blog, pas pour seed direct
- **AED** (Administration Enregistrement et Domaines) : données fiscales source — déjà agrégées dans les datasets data.public.lu via la Publicité Foncière
- **FRED St. Louis Fed** (`QLUN628BIS`) : indice national LU — utile pour benchmark macro, pas pour granularité commune

## Conformité légale (récap)

- ✅ Licence CC0 = utilisation libre commerciale
- ✅ Sources institutionnelles (Ministère du Logement, STATEC, AED)
- ✅ Pas de scraping (uniquement téléchargement de fichiers publiés)
- ✅ Mention de la source (ce fichier + commentaire en tête de `lib/data/luxembourg-prices.ts` + champ `source` en BDD)
- ✅ Conformité RGPD : pas de données nominatives, uniquement statistiques agrégées par commune
