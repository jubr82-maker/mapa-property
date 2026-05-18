# RAPPORT — OPÉRATION POLISH FINAL — 2026-05-18

Branche `refonte-design-mai-2026`. **Commits uniquement — AUCUN push,
AUCUN deploy** (Julien deploie : `npx vercel --prod --yes`).
`tsc` + `pnpm build` verts avant chaque commit (0 rollback).
`app/admin/offmarket/*` & `lib/admin/offmarket.ts` **jamais touchés**.
1 commit granulaire + 1 preuve Playwright par POL.

## Synthèse

| POL | Statut | Commit | Preuve |
|---|---|---|---|
| **POL1** Turnstile flicker | ✅ | `d24aa4b` | script 1×, conteneur stable t0/t2/t4, placeholder 72px, ≤1 iframe |
| **POL2** Logo −20% + offset | ✅ | `62e71ce` | Mac 76px / iPhone 44px, pt 8px |
| **POL3** Onglets centrés + FR/theme droite | ✅ | `d6b547d` | FR/theme langToEdge=0, écarts nav↔logo 16px, burger mobile gauche |
| **POL4** Hero nettoyé | ✅ | `99cca31` | TEST CMS / chips / FRAME 001 / coords ABSENTS, titre+subtitle OK |
| **POL5** Prose blog 120ch | ✅ | `b637726` | largeur prose 1100px (≈600 avant) |
| **POL6** Réorg home + fusion + nettoyage | ✅ | `620dd39` | ordre sections exact, fusion (1 section), liste communes off du visible |
| **POL6+** Communes LU étendues (demande Julien) | ✅ | `fb86e4d` | 86 communes listées, 10/10 exemples, StatsBand 86 LU |

**Gate E2E final** : `pol-final` = **10/10 OK, 0 CRASH** — 5 routes
× fr × light/dark × iPhone 17 Pro Max. `tsc` 0 · `pnpm build` 257/257.

## Détail

### POL1 `d24aa4b`
Cause flicker : `useEffect` dépendait de `[sitekey, resolvedTheme,
onToken, onUnavailable]` — `onUnavailable` nouvelle fonction à chaque
render parent + `resolvedTheme` undefined→light à l'hydratation →
remove/re-render en boucle. Fix : callbacks+thème en refs, deps
réduites à `[sitekey, mounted]` (un seul montage), rendu après mount
client, script CF injecté 1×/page (file d'attente), placeholder
300×65 fixe, preconnect `challenges.cloudflare.com` dans `<head>`.

### POL2 `62e71ce`
Logo 96→76 (desktop) / 56→44 (mobile), `pt-2` (+8px). Type
`Logo.height` étendu (44/76). Header global inchangé.

### POL3 `d6b547d`
Slot gauche `lg:justify-end`, slot droite `lg:justify-start` +
`lg:w-full`, bloc FR/jour-nuit en `ml-auto`. Onglets groupés autour
du logo centré, FR/theme à l'extrême droite. Burger mobile inchangé.

### POL4 `99cca31`
Retirés du JSX : pill « TEST CMS LIVE » (override CMS), chips meta,
HUD data-corners (FRAME 001, coords 49°/6°, VOL.I, LIVE·LU) ;
composant `DataCorner` + import `LiveClock` supprimés. Conservés :
titre, eyebrow, subtitle, SignatureLine, brackets, scroll ↓
(fonctionnel, ancré #search — pas une flèche orpheline ; aucune
ArrowRight orpheline n'existait dans Hero).

### POL5 `b637726`
`.prose-mapa` `max-width` 65ch → 120ch (borné par le conteneur
NAV6 90vw/1400px ; mobile cappé naturellement).

### POL6 `620dd39`
Ordre home : Hero, SearchBar, Coups de cœur, Quatre familles
d'actifs, **CTA Mandat (MandatesGrid, remonté)**, **Couverture+Chiffres
fusionnés**, **Notre méthode (remontée avant)**, Six métiers, puis
Off-Market/Avis/Journal. Fusion : nouveau `CoverageStats` = un seul
`<section>` (MarketsSection narratif + StatsBand band sombre, mt
resserré). Marchés actifs nettoyé : listes communes/régions retirées
du visible (narratif + CTA seulement) ; détail conservé en `sr-only`
(SEO/LLM) + page `/services/marches-actifs`.

### POL6+ — Communes LU étendues `fb86e4d`
Demande Julien (« toutes les plus grosses communes du pays, pas que
28 » — Steinfort, Mamer, Capellen, Kehlen, Koerich, Hobscheid,
Käerjeng, Dippach…). `lib/markets.ts` 24 → **86 communes** (quartiers
VDL premium + Sud/Minette + ceinture Ouest + Moselle + Centre + Nord).
`StatsBand` : compteurs dérivés de `lib/markets` (plus de « 24 » en
dur) → affiche 86 LU. `/services/marches-actifs` liste les 86.

## Décisions / déviations assumées (honnêtes)

- **POL4** : aucune icône ArrowRight orpheline n'existe dans
  `Hero.tsx` ; le seul « ↓ » est l'indicateur de scroll, ancré
  `#search` (fonctionnel) → conservé. HUD complet retiré (cohérence
  visuelle) bien que seuls FRAME 001 + coords aient été nommés.
- **POL6** : `SearchBar`, `OffMarketBand`, `ReviewsCarousel`,
  `BlogTeaser` non listés au brief mais existants → **conservés**
  (aucune suppression non demandée), placés cohéremment.
- **POL6 fusion** : `MarketsSection`/`StatsBand` passés en `<div>`
  (home-only, aucun autre import) ; `/services/marches-actifs` a son
  propre rendu inline → non impacté.
- **Mot fondateur (NAV7)** : `QuoteBand` toujours retiré, clés i18n
  orphelines — réécriture éditoriale « avec Julien » en attente
  (cf. `docs/qa/COPY_REWRITES_TODO.md`).

## Aucune migration SQL (opération 100% front/i18n/data statique)

`lib/markets.ts` est une donnée statique versionnée (pas la DB).
Rien à appliquer côté Supabase.

## TODO MATIN JULIEN

1. Lire ce rapport. `git log` branche `refonte-design-mai-2026`
   (commits `d24aa4b` → `fb86e4d`, **non poussés**).
2. Déployer : `npx vercel --prod --yes`.
3. Vérifs : forms (Turnstile stable, pas de flicker), header (logo
   plus petit/descendu, onglets centrés, FR/theme à droite), Hero
   épuré, blog large, home réordonnée + bloc Couverture/Chiffres
   fusionné, `/services/marches-actifs` (86 communes).
4. **Décision éditoriale** : mot fondateur (`COPY_REWRITES_TODO.md`).

## État final

`tsc` 0 · `pnpm build` 257/257 · gate 10/10 · branche
`refonte-design-mai-2026`. Working tree : ce rapport à commiter
(commit `docs:`). **Aucun push, aucun deploy.**
