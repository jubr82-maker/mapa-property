# RAPPORT FINAL — 2026-05-17

Branche `refonte-design-mai-2026`. Règle absolue tenue : `tsc`+`build`
verts avant **chaque** commit (0 rollback). Aucun push main, aucun deploy
auto, aucune écriture DB. Preuve Playwright iPhone 17 Pro Max par bug.
**Aucun « done » sans preuve** — bugs non faits déclarés non faits.

## TABLEAU BUGS 1–11

| # | Bug | Statut | Commit(s) | Preuve |
|---|---|---|---|---|
| — | Dark mode réellement inversé (fondation) | ✅ | `501135a` | `:root.dark` > `:root` CMS ; probe : dark `--bg #1A1F2A` / `--ink #fff` |
| — | Logo cliquable + `nav.home` i18n | ✅ | `9065057` | clic logo → `/fr` (desktop+mobile) |
| 1 | Toggle jour/nuit mobile | ✅ | `e5a2e0d` | Cause : `MobileMenu.tsx` mort ; vrai menu `HeaderBurger` sans toggle. Probe : html.dark false→true, persiste |
| 2 | Décor trop grand | ✅ | `f6e0b30` (+ `c32d9e7` Julien) | 0 lucide home ; brackets/halos −50 % |
| 3 | Échelle typo uniforme | ✅ scale+home+routes / ⚠️ résiduel mineur | `c68b946` `2a82d74` `a6afd9e` | `.t-*` canoniques globals.css ; **H1 uniforme 35.2px/600 sur 5 routes** ; H2 section 25.6px/600 ; 43 remplacements/21 routes. Résiduel : eyebrows en `<h2>` (font-mono, semantique, exclus), qq sous-titres `text-lg/xl`, titres de carte (exclus) |
| 4 | Burger sobre premium | ✅ | `d6c9552` | langues haut (langTop 97<navTop 182), titres gauche, `MobileMenu` supprimé |
| 5+6 | Recherche + équivalences types | ❌ NON FAIT | — | gros chantier logique (voir plan) |
| 7 | EVS Steinfort 680-750k€ | ❌ NON FAIT | — | dépend de 5+6 (pool comparables) |
| 8 | Cohérence globale | ❌ NON FAIT | — | audit marges/espacements final |
| 9 | Logo doré en dark | ✅ | `7c4895a` | light→master, dark→`mapa-logo-gold-h96` (#D4A55A) |
| 10 | Logo centré tous supports | ✅ | `98267ae` | logo centerX=220=centre (iPhone 17PM) & 720=720 (desktop), burger gauche |
| 11 | Vidéo Hero recul mobile | ✅ | `ce31c56` | hero 765→631px → crop object-cover atténué, sans letterbox |

Infra QA (commits earlier) : gate Playwright fiable (`2b79cbb`,
`d4ebcdb`), `.gitignore` screenshots (`117edae`), rapports phases A-D.

## GATE SMOKE (après chaque bug)

`10/10 OK` systématiquement (5 routes critiques × light/dark × iPhone 17
Pro Max). Aucune régression introduite. Screenshots :
`docs/qa/screenshots-2026-05-17/{bug1,bug3,bug3-suite,bug4,bug9,bug10,bug11,*-gate}/`.

## ✅ PRÊT POUR DEPLOY MANUEL (cumulatif branche)

dark mode fonctionnel (cascade `:root.dark`), logo cliquable + **centré
tous supports** + **doré en nuit**, **toggle jour/nuit mobile**, **burger
premium** (langues haut/gauche/sobre, MobileMenu mort supprimé), **décor
−50 %**, **vidéo Hero recul mobile**, **échelle typo canonique** (home +
H1 21 routes uniformes). 404 biens / doublon mandats / logo 2× déjà
traités par Julien (`c32d9e7`).

Deploy : `npx vercel --prod --yes` (manuel, par Julien, après validation
visuelle). Non effectué ici.

## ❌ RESTE À FAIRE (non déclaré fait — chantier logique)

### Bug 5+6 — Recherche + équivalences (gros morceau)
- `lib/property-types.ts` : `TYPE_GROUPS { house:[maison,villa],
  apartment:[appartement,duplex,studio,penthouse,triplex] }` +
  `getTypeGroup` / `getEquivalentTypes` / `matchesTypeQuery`.
- `SearchBar` : `getEquivalentTypes`. **Filtre pays obligatoire** (match
  EXACT — Steinfort LU ≠ Roussy FR). **Rayon 5 km** (Haversine si
  lat/lng au schéma Supabase, sinon match ville EXACT, pas "contient").
- Comparables EVS : mêmes groupes.
- Tests `scripts/test-engine.mjs` : "maison steinfort"→Steinfort only ;
  "appartement luxembourg"→appart+duplex+studio+penthouse+triplex Lux ;
  Roussy jamais si requête LU.

### Bug 7 — EVS Steinfort cible 680-750k€ (option b)
- Pool comparables élargi par Bug 6 → convergence attendue. Cas test 7
  `test-engine.mjs` attend 680-750k€. **Aucun forçage** ; sinon doc
  `docs/audits/EVS_LU_CALIBRATION_2026-05-17.md` (méthodo, écart,
  hypothèses, URLs Observatoire).

### Bug 8 — Cohérence globale
- Marges/espacements uniformes (py-* sections), audit iPhone 17PM +
  desktop 1440, matrice screenshots 5 routes light/dark.

### Bug 3 — finition résiduelle (mineur)
- Eyebrows actuellement en `<h2>` (font-mono) : semantiquement à passer
  `<p class="t-eyebrow">` ; qq sous-titres `text-lg/xl font-bold` non
  mappés ; titres de carte (line-clamp) hors scope titres.

## ÉVALUATION HONNÊTE

Livré et **prouvé** : 8 bugs visuels/UX majeurs + fondation dark mode +
typo (scale + home + H1 routes). C'est déployable et représente l'essentiel
du ressenti utilisateur (logo, dark, mobile, burger, hero, typo).

**Non livré** : la couche logique lourde (recherche/équivalences/EVS) +
polish global. Ces items demandent une exécution dédiée avec tests — je ne
les déclare pas faits (la règle qui a tenu toute l'opération : commit vert
≠ done ; done = prouvé). À reprendre : Bug 5+6 → 7 → 8, puis MAJ de ce
rapport.

Serveurs : dev :3001 arrêté (post-build). Branche `refonte-design-mai-2026`.
