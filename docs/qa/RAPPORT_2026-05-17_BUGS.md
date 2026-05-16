# RAPPORT BUGS — 2026-05-17 (checkpoint honnête)

Run autonome sur les 8 bugs. Arrêt volontaire après Bug 1 + diagnostics,
via la clause « blocker » du protocole : plusieurs items ne sont pas
actionnables tels que décrits sans fabriquer du faux « done » (l'anti-pattern
exact que cette opération combat). État réel ci-dessous.

## Contexte critique : travail PARALLÈLE sur la branche

`git log` montre des commits que je n'ai pas faits, intercalés :
`c32d9e7 fix(home): 404 biens + doublon mandats + logo 2x + tailles réduites`,
`769df81 chore(deploy): disable bundle analyzer route`. **Un autre acteur
commit en parallèle sur `refonte-design-mai-2026`.** Conséquence : re-fixer
à l'aveugle des bugs déjà traités par `c32d9e7` (« tailles réduites » =
potentiellement Bug 2) créerait doublons/conflits. À cadrer avant de
continuer (qui fait quoi).

## Incident résolu (pré-requis) : dev :3001 en HTTP 500

`TurbopackInternalError: Failed to lookup task ids … database failed` +
`Another write batch or compaction is already active` → **corruption du
cache Turbopack** due à mes multiples `pnpm dev`/`pnpm build` concurrents
partageant `.next` (j'avais aussi purgé `.next/cache` en vol). **Pas un bug
applicatif** (même code build vert à `e098334`, Phase D 126/126).
Récupéré : kill process + `rm -rf .next` + 1 seul dev → `/fr`, `/fr/biens`,
`/fr/contact` = 200. Leçon : ne jamais lancer `build` pendant que `dev`
tourne (dev arrêté avant chaque build désormais).

## BUG 1 — Toggle jour/nuit mobile : ✅ FIXÉ + PROUVÉ

**Cause racine (importante)** : le menu mobile rendu par `Header.tsx:131`
est `HeaderBurger.tsx`. `MobileMenu.tsx` est **importé nulle part = code
mort**. Les fixes « burger » P0-C précédents (5 tentatives) allaient tous
dans `MobileMenu.tsx` → **jamais rendus** → d'où la régression répétée que
Julien constatait. `HeaderBurger` n'avait **aucun** `ThemeToggle`.

**Fix** : `<ThemeToggle/>` ajouté dans la barre haute de `HeaderBurger`
(styles `!` pour le drawer sombre). Commit **`e5a2e0d`**. tsc 0, build 0.

**Preuve Playwright iPhone 17 Pro Max** : ouverture burger → tap toggle →
`html.dark` : before=false → afterToggle=true → **persiste après
fermeture**=true ; `body.bg = rgb(26,31,42)`. Screenshots :
`docs/qa/screenshots-2026-05-17/bug1/{menu-before,menu-after-toggle,page-after-close}.png`.

## BUG 2 — Icônes trop grandes : ⚠️ PRÉMISSE INVALIDE (à recadrer)

`grep` exhaustif : **zéro `lucide-react` dans `components/home`** (lucide
n'est utilisé qu'en admin). Pas d'icône `size 32-48` sur la home. Les seuls
gros éléments sont **décoratifs et intentionnels** : brackets d'angle Hero
(`size-10`), halos `OffMarketBand` (`size-96` blur-3xl), flèches carrousel
(`size-9`). La spec « réduire lucide à 20-24 » ne correspond à aucun code.
De plus `c32d9e7` mentionne « tailles réduites » → peut-être déjà traité par
l'autre acteur. **Non actionnable sans** : (a) capture annotée Julien
pointant l'élément précis, ou (b) confirmation que `c32d9e7` l'a traité.

## BUG 4 — Burger mobile (langues haut / titres gauche / sobre) : PRÊT

Même fichier que Bug 1 (`HeaderBurger.tsx`, le VRAI). Constat code :
titres `text-center` (à passer gauche), `LanguageSwitcher` en BAS du drawer
(à remonter sous le titre), `MobileMenu.tsx` mort à supprimer. Faisable et
à fort impact — **à exécuter en continuation** (1 commit).

## BUGS 3, 5, 6, 8 — légitimes, faisables en continuation

- 3 (échelle typo uniforme home), 8 (cohérence marges/espacements) :
  refactors visuels objectivables par capture — OK en continuation.
- 5 (recherche « steinfort »→« Roussy ») + 6 (équivalences types
  maison↔villa, appartement↔duplex↔studio↔penthouse↔triplex en recherche
  ET estimation) : logique testable — OK en continuation, avec tests.

## BUG 7 — Recalibration EVS LU : 🛑 BLOCKER (clause protocole)

Tuner un moteur de **valorisation immobilière exposé aux clients** (avec
disclaimer légal obligatoire) pour viser 600-700k€ sur **un point
anecdotique** est un risque d'intégrité financière, pas une tâche
technique :
1. Donnée baseline officielle Observatoire de l'Habitat Q4'25/Q1'26 →
   nécessite un accès réseau sortant **bloqué par le sandbox** (curl hôtes
   externes refusé ; seul Supabase passe).
2. Méthodologie ESTIMATOR.lu → lecture web **+ scraping explicitement
   interdit** par la consigne.
3. « Itérer jusqu'à ce que le test passe » sans source = sur-apprentissage
   du moteur sur 1 cas → potentiellement faux pour tous les autres biens.

**Options proposées** :
- (a) Julien fournit l'extrait Observatoire (CSV/chiffres baseline communes
  périphériques dont Steinfort) → je recalibre sur donnée réelle + test 7.
- (b) Je n'ajuste QUE la **méthodologie comparables** (Bug 6 : un duplex
  comparé aux appartements, pas qu'aux duplex) — amélioration défendable
  sans inventer de chiffres — et je documente l'écart Steinfort sans
  forcer la valeur.
- (c) On sort Bug 7 de l'autonomie : ticket dédié avec data source.

## STATUT FINAL

| Bug | État |
|---|---|
| 1 toggle mobile | ✅ fixé + prouvé (`e5a2e0d`) |
| 2 icônes | ⚠️ prémisse invalide (pas de lucide home) — recadrage requis |
| 3 typo | ⏳ faisable en continuation |
| 4 burger | ⏳ prêt (HeaderBurger + suppr. MobileMenu mort) |
| 5 recherche | ⏳ faisable + tests |
| 6 équivalences types | ⏳ faisable + tests |
| 7 EVS recalibration | 🛑 blocker — 3 options ci-dessus |
| 8 polish global | ⏳ faisable |

**Prêt à déployer** : Bug 1 (mobile dark toggle) — net, vérifié.
**Non fait honnêtement** : 2-8 (ne pas confondre commits verts et résultat
validé — précisément le piège des 10 derniers jours).

**Décisions minimales pour reprendre proprement** :
1. Coordination avec l'acteur parallèle (éviter conflits sur la branche).
2. Bug 2 : capture annotée OU confirmer que `c32d9e7` l'a traité.
3. Bug 7 : choisir option (a)/(b)/(c).
Sur ces 3 points, j'enchaîne 3→4→5→6→8 en autonomie avec preuve par bug.

Serveurs : dev :3001 **arrêté** (après build Bug 1) ; viewer :8080 peut
être down. Branche `refonte-design-mai-2026`, aucun push/deploy/DB.
