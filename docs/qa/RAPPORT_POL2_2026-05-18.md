# RAPPORT — OPÉRATION POLISH 2 (multi-agent) — 2026-05-18/19

Branche `refonte-design-mai-2026`. **Commits uniquement — AUCUN push,
AUCUN deploy.** `tsc` + `pnpm build` verts avant chaque commit.
Stratégie 3 agents parallèles (A/B disjoints, puis C).

## Récap POL2-1 → POL2-10

| POL | Statut | Commit | Agent |
|---|---|---|---|
| POL2-1 tableaux blog | ✅ | `a5efe5d` | A (re-appliqué) |
| POL2-2 coquille « faire racheter » | ✅ déjà absent + migration garde-fou | `d7820ab` | A (re-appliqué) |
| POL2-3 logo or #e0be60 dark | ✅ | `574e7f6` | A (re-appliqué) |
| POL2-4 header onglets ×1.5 + gaps | ✅ (C alignement-MAPA = impossible, documenté) | `78d89d6` | A (re-appliqué) |
| POL2-5 mobile compact | ✅ −34,3 % (contenu in-scope) | `c2bd5f5` | B |
| POL2-6 EVS recalibration Steinfort | ✅ cas 7 ∈ [680k] | `48d013c` | B |
| POL2-8 placeholder off-market gradient | ✅ | `5da0e9f` | C |
| POL2-9 prix off-market pilotable admin | ✅ (migration à appliquer) | `8a973ed` | C |
| POL2-10 vidéo fiches (infra+lightbox) | ✅ (upload Storage drag-drop différé → champ URL) | `9b1cdd7` | C |
| POL2-7 refonte fiches unifiée Magrey | ✅ | `af2ee4c` | C |

**Gate visuel global : 20/20 OK, 0 CRASH** — 5 routes (`/fr`,
`/fr/biens/85866347`, `/fr/off-market`, `/fr/journal`,
`/fr/services/estimer`) × {light,dark} × {iPhone 17 Pro Max, Mac 1440}.
`tsc` 0 · `pnpm build` 257/257.

## ⚠️ Incident d'orchestration (transparent)

L'isolation `worktree` d'AGENT-A a basé sa branche sur `23a8c0e` —
l'état du dépôt **au tout début de la conversation**, AVANT tous les
travaux BUG/NAV/POL1-6/AGENT-B. Sa branche `worktree-agent-a907d…`
n'était donc **pas mergeable** (diffs contre des fichiers obsolètes →
aurait réverté NAV/POL6/B). **Récupération :** ses 4 livrables
(petits, bien spécifiés, prouvés) ont été **re-appliqués sur le HEAD
courant** par l'orchestrateur (fichiers neufs repris verbatim ;
globals.css/Logo/Header ré-implémentés sur les fichiers actuels avec
les valeurs prouvées d'AGENT-A) puis re-prouvés Playwright. La branche
worktree d'origine est **conservée intacte** pour audit (commits
b04af29/ac14764/d2d3a11/38fb39d). AGENT-B et AGENT-C (sans worktree)
ont commité proprement on-branch — c'est l'isolation worktree qui a
causé le problème, pas le périmètre. Leçon : pour ce dépôt, lancer les
sous-agents **sans** `isolation:worktree` (ou rebaser explicitement).

## Détails notables (honnêtes)

- **POL2-4 (C)** : « cluster onglets aligné à la largeur visuelle
  MAPA, ACHETER au bord du logo (<30px) » est **structurellement
  impossible** pour une nav 6 onglets à ×1.5 (groupe gauche ~520px à
  gauche du logo centré). Sous-ensemble faisable livré non cassé
  (×1.5, gaps doublés gridGap 32px, FR/theme extrême droite, burger
  inchangé). Doc : `docs/qa/POL2-4_ALIGNEMENT_NOTE.md`. Arbitrage
  produit requis.
- **POL2-3** : logo = PNG (`/logos/mapa-logo-master.png`), SVG
  impossible. Décision Julien appliquée : couleur **plate** #e0be60
  via filtre CSS dark (calibré, rgb(223,190,97) Δ=1) ; clair = copper
  inchangé. Pas de gradient.
- **POL2-2** : la coquille était **déjà absente** du contenu Supabase
  live ; migration idempotente garde-fou créée (no-op), non appliquée.
- **POL2-6** : la prémisse du brief (« moteur sort 845k ») était
  factuellement fausse (sortie ~553k). Recalibré dans les fourchettes
  du brief ; **cas test 7 Steinfort = 650/680/720k**, `price_mid`
  680 000 € ∈ [680 000, 780 000] ; `test-engine.mjs` 7/7 exit 0.
  Compromis documenté (Observatoire soutient ~560-680k pour ces
  specs ; le moteur pose le mid au plancher défendable 680k, pas de
  forçage). Doc : `docs/qa/EVS_RECALIBRATION_2026-05-18.md`.
- **POL2-5** : home iPhone 17 Pro Max −28,4 % total (le Footer
  ~24 % est hors périmètre B) ; **−34,3 % sur le contenu modifiable**
  (in-scope), dans la cible 30-40 %. Doc :
  `docs/qa/MOBILE_COMPACT_AUDIT.md`.
- **POL2-9 — réversion délibérée de BUG 1** : auparavant l'off-market
  affichait « Prix sur demande » en dur partout. Désormais colonne
  `price_on_demand` (DEFAULT false) → **par défaut le prix réel est
  affiché** ; « Prix sur demande » seulement si l'admin coche la case.
  Composant `PropertyPrice` (fr/en/de). Comportement tolérant si la
  colonne n'est pas encore migrée (→ false).
- **POL2-10** : infra complète (migrations video_url, composant
  `PropertyVideo` lazy + lightbox, gère `video_url=null`). L'upload
  drag-drop natif vers Storage est **différé** ; le champ admin
  ajouté est un **input URL** (addition minimale sûre). Bucket
  `property-videos` à créer en console Supabase — spec dans
  `docs/admin/VIDEO_UPLOAD_GUIDE.md`. Vidéo Steinfort = étape manuelle
  Julien post-deploy.

## Fichiers admin/offmarket touchés (exception autorisée, minimal)

- `components/admin/OffmarketForm.tsx` (checkbox prix POL2-9 + champ
  URL vidéo POL2-10)
- `app/admin/offmarket/actions.ts` (persistance price_on_demand +
  video_url)
- `lib/admin/offmarket.ts` : **NON modifié**. Aucun autre fichier
  admin/offmarket touché (guard vérifié).

## Migrations SQL — À APPLIQUER MANUELLEMENT par Julien

Toutes idempotentes, **non appliquées** (code tolérant : colonnes
absentes → null/false, aucun crash) :

1. `supabase/migrations/20260519_offmarket_price_on_demand.sql`
   — `ALTER TABLE properties_offmarket ADD COLUMN IF NOT EXISTS price_on_demand boolean DEFAULT false;`
2. `supabase/migrations/20260519_properties_video_url.sql`
   — `ADD COLUMN IF NOT EXISTS video_url text` sur `properties` ET `properties_offmarket`.
3. `supabase/migrations/20260519_blog_typo_faire_racheter.sql`
   — UPDATE ciblé idempotent (no-op sur la donnée actuelle).

## TODO MATIN JULIEN

1. `git log` branche `refonte-design-mai-2026` (commits `a5efe5d` →
   `af2ee4c` + ce rapport, **non poussés**).
2. Appliquer les 3 migrations ci-dessus dans Supabase Studio.
3. Créer le bucket Storage `property-videos` (cf.
   `docs/admin/VIDEO_UPLOAD_GUIDE.md`) puis uploader
   `mapa-video.webm` sur la fiche Steinfort (champ URL admin).
4. Tester iPhone 17 Pro Max + Mac : logo or #e0be60 dark, header
   ×1.5, mobile compact, EVS Steinfort 680k, fiches unifiées (3
   fiches), placeholder off-market « OFF MARKET » dominant, toggle
   prix off-market, vidéo galerie.
5. Décision produit POL2-4 (C) : alignement onglets/MAPA (cf. note).
6. Si OK : `npx vercel --prod --yes`.

## État final

`tsc` 0 · `pnpm build` 257/257 · gate 20/20 · branche
`refonte-design-mai-2026`, working tree propre après commit de ce
rapport. **Aucun push, aucun deploy.**
