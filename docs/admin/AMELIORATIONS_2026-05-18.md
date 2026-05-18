# Améliorations UX Admin — backlog (2026-05-18)

> **DOCUMENTATION SEULEMENT — aucune modification de code.**
> `app/admin/offmarket/*` et `lib/admin/offmarket.ts` sont gérés par
> Julien en parallèle : ne pas y toucher tant que ce n'est pas coordonné.
> Ce document = backlog priorisé pour une session admin dédiée.

## 1. Pays incomplets (sélecteur)

État : la liste pays du form off-market est limitée
(`LU, BE, FR, DE, CH, MC, PT, ES`). Manquent des marchés MAPA réels :
**USA, Île Maurice, Émirats (UAE), Royaume-Uni, Italie, Grèce,
Caraïbes/Antilles**, etc.
Reco : externaliser la liste pays dans une source unique
(`lib/admin/countries.ts` — fichier NEUF, hors offmarket.ts) consommée par
tous les forms admin ; codes ISO-3166-1 alpha-2 ; libellés i18n.

## 2. Régions en cascade selon le pays

État : « Région » = champ texte libre → incohérences de saisie.
Reco : select dépendant du pays sélectionné (LU → cantons ;
FR → régions/départements ; etc.). Source statique versionnée
`lib/admin/regions-by-country.ts`. Fallback texte libre si pays non mappé
(ne jamais bloquer la saisie).

## 3. Villes en cascade selon pays/région

État : `city_real` / `city_anonymized` = texte libre.
Reco : autocomplete villes filtré par pays(+région), s'appuyant sur
`lib/cities.ts` existant (déjà la source des `villes/[ville]`) étendu, +
saisie libre tolérée. Cohérence directe avec le fix recherche BUG D
(filtre pays + match ville exact).

## 4. Prestations suggérées (autocomplete)

État : champ `prestations` = textarea libre (tags séparés virgule/retour).
Reco : autocomplete sur un référentiel de prestations courantes
(Ascenseur, Cave, Cheminée, Domotique, Vue dégagée, Piscine, Borne VE…),
tout en gardant l'ajout libre. Améliore la normalisation pour les filtres
publics futurs.

## 5. Passeport énergétique dans « Caractéristiques »

État : seule la `classe_energetique` (A+→I) est saisie.
Reco : ajouter dans l'onglet Caractéristiques les champs du **passeport
énergétique LU** : indice de performance énergétique (kWh/m²/an), indice
d'isolation thermique, classe CO₂/GES, date du certificat, n° du
certificat. Colonnes DB à créer (migration `.sql` versionnée, appliquée
par Julien — pas en auto).

## Priorisation suggérée

1. **Pays (1)** — bloquant fonctionnel (biens hors liste impossibles).
2. **Villes cascade (3)** — synergie directe avec recherche BUG D.
3. **Régions cascade (2)**.
4. **Passeport énergétique (5)** — valeur éditoriale/SEO, nécessite migration.
5. **Prestations autocomplete (4)** — confort de saisie.

Chaque item : prévoir migration `.sql` versionnée si colonnes DB, jamais
appliquée en autonomie (validation Julien).
