# RAPPORT NUIT — 2026-05-18

Branche `refonte-design-mai-2026`. **Commits uniquement — AUCUN push,
AUCUN deploy** (Julien review + deploy au réveil). Règle absolue tenue :
`tsc` + `pnpm build` verts avant chaque commit (0 rollback). Aucun
fichier `app/admin/offmarket/*` ni `lib/admin/offmarket.ts` touché.
Preuve Playwright iPhone 17 Pro Max.

## Tableau bugs

| Bug | Statut | Commit | Détail |
|---|---|---|---|
| **A** logo doré invisible dark | ✅ **FAIT + PROUVÉ** | `e3a77b6` | Cause : `mapa-logo-gold-h96.png` **corrompu** (base64 inline tronqué : header PNG OK mais décodage vide → invisible « noir sur noir »). La bascule CSS dark fonctionnait déjà (prouvé : master `display:none`, gold `display:block` en dark). Fix sans asset : un seul master + recolore or chaud via filtre CSS classe-based (`.logo-auto` + `:root.dark`, spécificité 0,2,0 pour battre le `:root{}` CMS) + `.logo-gold` pour tone forcé. SSR-safe. ⚠️ Solutions A/B/C du brief = hors-sujet (le switch n'était pas le bug ; et `prefers-color-scheme` ne suit pas le thème class-based de l'app). |
| **C** typo résiduel routes | ✅ **DÉJÀ COUVERT** | (n/a) | `app/[locale]/*` : 0 heading ad-hoc résiduel (propagé en `a6afd9e`, vérifié grep). Les 10 `<h3>` restants en `components/*` sont des **titres de carte/outil/footer bespoke** (CoverageGrid flip-cards, MandatesGrid, AcquisitionSimulator, Footer CTA) — conversion aveugle non supervisée = risque de régression design → **délibérément non touchés** (documenté, pas fait à l'aveugle). |
| **D** recherche + équivalences | 🟡 **FONDATION FAITE / intégration = TODO matin** | `d5fed0d` | `lib/property-types.ts` créé (`TYPE_GROUPS`, `getTypeGroup`, `getEquivalentTypes`, `matchesTypeQuery`) — pur, **17/17 tests** (`pnpm test:types`). Intégration SearchBar / filtrage biens / filtre pays / rayon 5 km / comparables EVS = **NON faite** (multi-fichiers, blast radius prod, > règle 2h, risque non supervisé) → TODO matin précis ci-dessous. |
| **E** EVS Steinfort 680-750k | ⏭️ **SKIP (dépend de D)** | (n/a) | Dépend du pool comparables élargi par l'intégration D (non faite). Aucun forçage de chiffre (option b respectée). À traiter après l'intégration D. |
| **F** cohérence espacements | ✅ **FAIT** | `8b96a06` | Sections home uniformisées sur le dominant `md/lg:py-20` : FeaturedCarousel/CoverageGrid `lg:py-28→20`, StatsBand `lg:py-24→20`, QuoteBand `md:py-24/lg:py-32→20`, ContactCTA `md:py-16→20`. Wrappers `<section>` uniquement (aucune carte/contenu touché), mobile `py-6` inchangé (déjà cohérent). |
| Doc admin UX | ✅ **FAIT (doc only)** | (docs) | `docs/admin/AMELIORATIONS_2026-05-18.md` — backlog priorisé (pays incomplets, régions/villes cascade, prestations autocomplete, passeport énergétique). **Aucun code admin touché.** |

## Commits de la nuit (granulaires, sur `refonte-design-mai-2026`)

```
8b96a06 style(home): uniformise l'espacement vertical des sections → md/lg:py-20 [BUG F]
d5fed0d feat(search): lib/property-types - TYPE_GROUPS + ... + 17 tests [BUG D fondation]
e3a77b6 fix(brand): logo doré visible en mode nuit — recolor CSS du master ... [BUG A]
```
(+ ce rapport & le doc admin = commit `docs:` séparé.)

## Preuve BUG A — avant / après (Playwright iPhone 17 Pro Max, dark)

- AVANT : `docs/qa/screenshots-2026-05-18/bugA/header-dark.png` → centre **vide** (logo invisible noir/noir).
- APRÈS : `docs/qa/screenshots-2026-05-18/bugA/after-header-dark.png` → **« MAPA PROPERTY » + flamme en or chaud, lisible**, centré.
- Light inchangé : `…/after-header-light.png` (master copper + ink, intact).
(Screenshots gitignored — visibles via `python3 -m http.server` sur le dossier, ou direct dans le repo local.)

## Gate E2E final

`nuit-e2e-final` : **10/10 OK, 0 CRASH** — 5 routes (`/`, `/biens`,
`/biens/85866347`, `/contact`, `/journal`) × fr × light/dark ×
iPhone 17 Pro Max.

## TODO MATIN JULIEN

1. **Lire ce rapport (2 min) puis deploy** : `npx vercel --prod --yes`
   (les commits sont locaux sur la branche — non poussés ; Vercel CLI
   déploie le local). Tester `https://mapa-property-nextjs.vercel.app`
   — vérifier surtout le **logo or en mode nuit** (BUG A).
2. **BUG D — intégration (non faite, risquée → supervisée)** :
   - `components/home/SearchBar.tsx` : utiliser `getEquivalentTypes`
     pour la query type (synonymes).
   - Filtrage biens (côté listing `/biens` / `lib/data`) : appliquer
     `matchesTypeQuery` + **filtre pays EXACT obligatoire**
     (Steinfort LU ≠ Roussy FR) + **rayon 5 km** (Haversine si lat/lng
     au schéma, sinon match ville EXACT — pas « contains », c'est ça qui
     faisait remonter Roussy depuis Steinfort).
   - Comparables EVS (`lib/estimation/engine.ts`) : élargir le pool via
     `getEquivalentTypes`.
   - Tests : ajouter à `scripts/test-engine.mjs` les cas
     « maison steinfort » / « appartement luxembourg » / « Roussy jamais
     si requête LU ».
3. **BUG E** après l'intégration D : cas test 7 duplex Steinfort
   → fourchette 680-750k€ ; si pas de convergence naturelle, documenter
   l'écart (`docs/audits/EVS_LU_CALIBRATION_2026-05-17.md`) avec sources
   Observatoire — **aucun forçage**.
4. **BUG A — option premium** : si tu veux le vrai gold exact de marque
   (vs le filtre CSS approché), fournir un `mapa-logo-gold-h96.png`
   valide (le filtre actuel reste un excellent fallback robuste).
5. **BUG C** : décision design sur les titres de carte components/* si
   tu veux les passer à l'échelle canonique (non fait = volontaire).
6. **Admin UX** : voir `docs/admin/AMELIORATIONS_2026-05-18.md` (à
   coordonner avec ton chantier offmarket en cours).

## État final

Working tree : seuls les 2 `.md` (ce rapport + doc admin) restent à
commiter (commit `docs:` ci-après). Branche `refonte-design-mai-2026`,
**aucun push, aucun deploy** — la main est à toi.
