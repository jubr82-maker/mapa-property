# RAPPORT PHASES A-B-C-D — 2026-05-17

Branche `refonte-design-mai-2026`. Run autonome. Règle absolue respectée :
`tsc` + `pnpm build` **verts avant chaque commit** (aucun rollback déclenché).
Aucun push, aucun deploy, aucune écriture DB.

---

## (a) BUGS IDENTIFIÉS + CAUSES RACINES

### BUG A1 — Dark mode visuellement identique au light (BLOQUANT)

Constat Julien : les 10 captures baseline ne montraient **aucune** différence
light/dark. Probe Playwright (état initial) :

```
[dark] htmlHasDark=true  body.bg=rgb(255,255,255)  --bg=#FFFFFF  --ink=#1A1F2A
```

`<html class="dark">` **est** appliqué (next-themes OK), mais les tokens ne
s'inversent pas. **Cause racine** : `app/[locale]/layout.tsx:131-150`
injecte les design tokens CMS dans un `<style>:root{--bg;--ink;--gold}</style>`
rendu tardivement dans `<head>`. Sélecteurs :
- `:root` (CMS injecté) → spécificité (0,1,0)
- `.dark` (globals.css) → spécificité (0,1,0)

**Spécificité égale → la source la plus tardive gagne.** Le `:root{}` CMS
étant injecté après la feuille globale, il écrasait `.dark{}` en
permanence : le mode nuit n'inversait jamais.

### BUG A2 — Gate visuel : faux « zéro différence » (méthodo)

Le gate pilotait le dark via `newContext({ colorScheme:'dark' })`. Or
l'app utilise next-themes en **stratégie classe** (`.dark`) avec
`defaultTheme="light"` : la media `prefers-color-scheme` seule ne
déclenche **jamais** `.dark`. Les captures « dark » étaient donc en
réalité light → faux négatif systématique (co-responsable du constat).

### BUG B — Logo non cliquable

`components/brand/Logo.tsx` (pack v2) ne contient aucun lien. Header
affichait `<Logo/>` nu → pas de retour accueil.

### BUG C — 2 routes en 404 au crawl (ni l'une ni l'autre = bug du site)

- `/villes/luxembourg` → 404 : le slug réel est **`luxembourg-ville`**
  (`lib/cities.ts:27`) ; `[ville]` fait `getCityBySlug()` → `notFound()`.
  `/villes/luxembourg-ville` rend **200**. → erreur de matrice de test.
- `/journal/[slug]` → 404 : **aucun** `app/[locale]/journal/[slug]/page.tsx`.
  `journal` = index seul ; les articles vivent sous `/blog/[slug]` (200).
  Route inexistante **by design**. → erreur de matrice de test.

---

## (b) FIXES APPLIQUÉS (commits)

| Hash | Phase | Fix |
|---|---|---|
| `501135a` | **A** | `app/globals.css` : sélecteur du bloc dark `.dark` → **`:root.dark`** (spécificité 0,2,0 > 0,1,0). Bat le `:root{}` CMS quelle que soit la source. Concept inversant D2 (jamais utilisé) abandonné. |
| `9065057` | **B** | `Header.tsx` : `<Logo/>` mobile + desktop enveloppés dans `<Link href="/">` (next-intl, locale-aware) + `aria-label`. Clé i18n **`nav.home`** ajoutée `fr/en/de` (règle i18n inviolable — zéro string FR en dur). |
| `d4ebcdb` | **A2 + C** | `scripts/visual-gate.mjs` : (1) viewport **iPhone 17 Pro Max** (440×956 @3x) ; (2) **engage le thème via `localStorage 'theme'`** (addInitScript) = vrai dark ; (3) matrice C : `villes/${SLUG_VILLE=luxembourg-ville}`, `/journal/[slug]` retiré (inexistant by design). |
| `2b79cbb` | (gate) | Détecteur fiable : status HTTP + `pageerror` + heading d'erreur ancré (corrige 2 faux positifs : digits `404/500` dans les prix ; `<nextjs-portal>` toujours présent en dev). |
| `117edae` | (qa) | `.gitignore` `/docs/qa/screenshots-*/` (binaires lourds) — rapports `.md` conservés. |

Aucune migration DB. Aucune route applicative modifiée en Phase C (les
routes du site étaient saines ; seule la matrice de test était fausse).

---

## (c) PREUVES SCREENSHOT — AVANT / APRÈS

> Les PNG sont gitignored (binaires). Chemins locaux ; à consulter via le
> serveur statique `http://localhost:8080` (sert le dossier baseline).

| | AVANT (cassé) | APRÈS (corrigé) |
|---|---|---|
| Dossier | `docs/qa/screenshots-2026-05-17/etape0-baseline-OLD/` | `docs/qa/screenshots-2026-05-17/etape0-baseline/` |
| Viewport | iPhone 14 Pro (ancienne réf) | **iPhone 17 Pro Max** (réf Julien) |
| Dark | == light (double bug A1+A2) | **≠ light, prouvé** |

**Preuve objective du fix dark (même viewport, même run)** :
`etape0-baseline/fr/iphone17promax-light.png` (4 802 086 o) **≠**
`etape0-baseline/fr/iphone17promax-dark.png` (4 500 322 o) — `cmp`
binaire = **DIFFÉRENTS**.

**Preuve computed-style (probe Playwright, post-fix)** :
```
[light] --bg=#FFFFFF  --ink=#1A1F2A  body.bg=rgb(255,255,255)
[dark]  --bg=#1a1f2a  --ink=#fff     body.bg=rgb(26,31,42)   selector :root.dark
```

**Preuve Phase B (probe interaction)** : clic sur le logo Header →
```
[desktop1440]   url=http://localhost:3001/fr → home OK
[iphone17promax] url=http://localhost:3001/fr → home OK
```

> Réserve d'honnêteté : `etape0-baseline-OLD` est en iPhone 14 Pro et son
> « dark » était en fait light (double bug) — ce n'est pas un A/B 1:1 au
> même viewport. La preuve rigoureuse du fix dark est le couple
> (computed-style probe) + (diff binaire light≠dark **au même** viewport
> iPhone 17 Pro Max post-fix).

---

## (d) MATRICE FINALE — CRAWL COMPLET

Commande : `visual-gate.mjs --locales=fr,en,de --vp=iphone17promax`
(SLUG_BIEN=85866347, SLUG_BLOG=vendre-luxembourg-2026-prix-estimation,
SLUG_VILLE=luxembourg-ville). Sortie : `phaseD-crawl/` (126 PNG).

**Résultat : `126/126 OK, 0 CRASH` — 100 % HTTP 200.**

21 routes × 3 langues (fr/en/de) × 2 modes (light/dark) × iPhone 17 Pro Max :

```
/  /biens  /biens/85866347  /off-market  /off-market/arcova  /arcova
/mandats/recherche  /services/estimer  /services/louer  /services/vendre
/services/rendement-locatif  /services/marches-actifs  /services/simulateurs
/villes/luxembourg-ville  /blog  /blog/vendre-luxembourg-2026-prix-estimation
/journal  /contact  /qui-sommes-nous  /mentions-acquisition
/legal/mentions-legales
```

Note : 21 routes (et non 22) — `/journal/[slug]` retiré (inexistant by
design, cf. BUG C). 21 × 3 = 63 URLs uniques ; × 2 modes = 126 combinaisons.

---

## SYNTHÈSE

| Phase | État | Preuve |
|---|---|---|
| A — dark mode | ✅ corrigé | probe computed-style + diff binaire light≠dark |
| B — logo cliquable | ✅ corrigé | probe interaction desktop + mobile → `/fr` |
| C — routes 404 | ✅ traité | 0 bug site ; matrice corrigée ; crawl 100 % 200 |
| D — re-validation | ✅ 126/126 | crawl complet 0 crash, gate fiable iPhone 17 Pro Max |

Serveurs laissés up : viewer screenshots `:8080`, dev `:3001`.
Prochaine action côté Julien : revue visuelle des captures
`etape0-baseline/` (light vs dark) puis GO déploiement si validé
(deploy manuel, non effectué ici).
