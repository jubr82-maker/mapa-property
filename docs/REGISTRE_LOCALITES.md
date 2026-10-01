# Registre national des localités et des rues (CACLR)

Table officielle localité vers commune, utilisée par le simulateur d'estimation
(`lib/estimation/coverage.ts`) pour reconnaître un lieu luxembourgeois et le
rattacher à sa commune officielle.

## Source

- Jeu de données : Registre national des localités et des rues (CACLR).
- Producteur : Administration du cadastre et de la topographie (ACT).
- Diffusion : data.public.lu, republié le 5 de chaque mois.
- Licence : Creative Commons Zero (CC0).
- Identifiant stable de la ressource : **à compléter**. L'archive importée
  ne contient aucune métadonnée (ni commentaire zip, ni fichier descriptif), et
  l'import se fait sans accès réseau. Recopier ici l'URL permanente de la
  ressource (page du jeu de données sur data.public.lu, onglet des ressources)
  lors de la prochaine mise à jour.
- Version importée : fichiers de l'archive datés du 2026-09-28.

## Fichiers

- `data/sources/caclr.zip` : archive brute (environ 2 Mo), **non versionnée**
  (`.gitignore`). À placer localement avant chaque régénération.
- `scripts/import-caclr.py` : générateur, Python 3 standard, sans dépendance ni
  réseau.
- `lib/geo/luxembourg-localities-official.ts` : table générée et versionnée.
  Ne pas la modifier à la main.

## Régénération (mensuelle ou à la demande)

1. Télécharger l'archive du registre depuis data.public.lu et l'enregistrer
   sous `data/sources/caclr.zip`.
2. Vérifier qu'il s'agit bien de l'archive : `file data/sources/caclr.zip`
   doit répondre « Zip archive data » (un téléchargement raté produit une page
   d'erreur XML de quelques centaines d'octets).
3. Lancer `python3 scripts/import-caclr.py data/sources/caclr.zip`.
   Le script s'arrête si un fichier attendu manque ou si la jointure
   LOCALITE + COMMUALL contredit le fichier transversal TR.DICACOLO.RUCP.
4. Relire le résumé affiché (nombre de localités, communes, localités écartées)
   et le diff de `lib/geo/luxembourg-localities-official.ts`.
5. Contrôles : `npx tsc --noEmit`, `node --import tsx scripts/test-engine.mjs`,
   `npx next build --webpack`.
6. Si une fusion de communes apparaît (nouveau nom dans `OFFICIAL_COMMUNES`),
   vérifier que le référentiel de prix `lib/data/luxembourg-prices.ts` porte une
   ligne sous ce nom ; sinon le simulateur renverra vers un contact pour cette
   commune (`getCommunesWithoutPrices()` dans `lib/estimation/coverage.ts`).

## Format lu (colonnes fixes, ISO-8859-1)

| Fichier | Positions utilisées |
|---|---|
| LOCALITE | code 0-5, nom 5-45, canton 109-111, commune 112-114 |
| COMMUALL | code 0-2, nom 2-42, canton 92-94, drapeau actuelle 94 (O/N) |
| CANTON | code 0-2, nom 2-42 |
| ALIAS.LOCALITE | alias 3-43, langue 83 (L, A ou vide), code localité 94-99 |
| QUARTIER | nom 5-45 |
| TR.DICACOLO.RUCP | district 0-40, canton 40-80, commune 80-120, localité 120-160, rue 160-200, code postal 200-204 (contrôle seulement) |

Ces positions ont été relevées dans les fichiers du 2026-09-28. Si l'ACT change
le format, le contrôle de cohérence du script échoue au lieu de produire une
table fausse.
