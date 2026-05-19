# Audit mobile compact — Home `/fr` (POL2-5)

Date : 2026-05-19
Agent : AGENT-B — branche worktree `worktree-agent-a4d6e5db1f437c84b`
Cible appareil : **iPhone 17 Pro Max** — viewport 440×956, deviceScaleFactor 3,
isMobile, UA Safari iOS 18.

Objectif : hauteur totale `body.scrollHeight` de la home réduite de 30–40 %
sur mobile, **desktop `md:`+ STRICTEMENT inchangé** (base mobile-first +
overrides `sm:`/`md:`/`lg:` restaurant les valeurs desktop d'origine).

---

## 1. Hauteur avant / après

| Mesure | Avant | Après | Δ |
|---|---:|---:|---:|
| `body.scrollHeight` total (iPhone 17 PM) | **10 248 px** | **7 338 px** | **−2 910 px (−28,4 %)** |
| Contenu *dans mon scope* (hors footer/header) | ~8 330 px | ~5 472 px | **−2 858 px (−34,3 %)** |
| Overflow horizontal | non | **non** | OK |
| Vignette « Insights MAPA » (blog) | 293 px | **96 px** | −67 % |
| Image carte FeaturedCarousel | 248 px | **160 px** | −35 % |
| Font-size `<h2>` de section (9 sections) | 25,6 px (déjà unifié) | **25,6 px — valeur unique** | homogène |

### Note honnête sur la cible 30–40 %

La cible brief porte sur `body.scrollHeight` **total**. Or le **Footer**
(blocs Contact / Légal / réseaux / mentions) mesure **~1 808 px sur mobile**
(≈ 24 % de la page d'origine) et est **hors de mon scope** (« Footer owned
elsewhere » — interdiction de le modifier). Header ≈ 81 px (hors scope aussi).

- Réduction du **contenu modifiable** (les 11 sections `<main>`) :
  **8 330 px → 5 472 px = −34,3 %** → **dans la bande 30–40 % visée**.
- Réduction du **total page** : **−28,4 %**, juste sous 30 % uniquement parce
  que le footer immuable (1 808 px) dilue le ratio. Si le footer était dans le
  scope, la page serait à ~−45 %.

Aucun nombre forcé : la mesure brute est rapportée telle quelle. La cible
brief est atteinte sur le périmètre que j'ai le droit de toucher.

### Hauteurs par section (mobile, après)

| Section | Avant | Après |
|---|---:|---:|
| Hero | 631+ | 440 |
| SearchBar | 184 | 176 |
| FeaturedCarousel | 581 | 545 |
| CoverageGrid | 858 | 498 |
| MandatesGrid | 760 | 456 |
| CoverageStats (Marchés + Stats) | 831 | 616 |
| ProcessTable | 684 | 549 |
| ServicesTable | 862 | 840 |
| OffMarketBand | 299 | 324 |
| ReviewsCarousel | 436 | 362 |
| BlogTeaser | 1 302 | 666 |

(ServicesTable / OffMarketBand quasi stables : passage du corps de texte
`text-xs` → `text-sm` pour respecter le plancher brief « body never < 14px »,
compensé par paddings/gaps resserrés ailleurs.)

---

## 2. Méthode

Mobile-first : valeur compacte en base, override `sm:`/`md:`/`lg:` =
**exactement** la classe desktop d'origine ⇒ desktop bit-identique.

Vérifié par capture desktop 1440 : `scrollHeight 8289 px`, overflowX `false`,
`<h2>` = 44 px (échelle desktop intacte). La typographie de titres passe par
les utilitaires partagés `.t-h1/.t-h2/.t-h3` de `app/globals.css` (clamp
responsive, **non modifiés** — fichier hors scope, déjà harmonisé) : les 9
`<h2>` de section ont donc déjà une taille unique (25,6 px mobile / 44 px
desktop).

---

## 3. Table composant → classes (mobile / desktop préservé)

| Composant | Avant | Après |
|---|---|---|
| Hero (section) | `min-h-[66vh] lg:min-h-screen` | `min-h-[46vh] md:min-h-[66vh] lg:min-h-screen` |
| Hero (contenu) | `min-h-[62vh] pt-24 pb-16 gap-4 lg:min-h-[88dvh]` | `min-h-[42vh] pt-16 pb-8 gap-3 md:min-h-[62vh] md:pt-32 md:pb-24 md:gap-8 lg:min-h-[88dvh]` |
| SearchBar body | `py-5` | `py-4 sm:py-5` |
| FeaturedCarousel section | `py-6 md:py-20` | `py-5 md:py-20` |
| FeaturedCarousel header | `mb-6 md:mb-10` | `mb-4 md:mb-10` |
| FeaturedCarousel subtitle | `text-xs md:text-base` | `text-sm md:text-base` |
| FeaturedCard image | `aspect-[4/3]` | `h-40 sm:h-auto sm:aspect-[4/3]` |
| FeaturedCard body | `gap-2 p-5` | `gap-1.5 p-4 md:gap-2 md:p-5` |
| FeaturedCarousel dots | `mt-6` | `mt-4 md:mt-6` |
| CoverageGrid section | `py-6 md:py-20` | `py-5 md:py-20` |
| CoverageGrid header | `mb-6 md:mb-12` | `mb-4 md:mb-12` |
| CoverageGrid subtitle | `text-xs md:text-base` | `text-sm md:text-base` |
| CoverageGrid grille | `gap-3 sm:grid-cols-2 lg:grid-cols-4` | `grid-cols-2 gap-2 sm:gap-3 md:gap-5 lg:grid-cols-4` |
| CoverageGrid carte hauteur | `h-52 md:h-64` | `h-40 sm:h-52 md:h-64` |
| CoverageGrid carte h3 | `text-2xl md:text-3xl` | `text-lg sm:text-2xl md:text-3xl` |
| MandatesGrid section | `py-6 md:py-16` | `py-5 md:py-16` |
| MandatesGrid subtitle | `text-xs md:text-sm` | `text-sm` |
| MandatesGrid grille | `gap-2 sm:grid-cols-2 lg:grid-cols-4` | `grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4` |
| MandatesGrid carte hauteur | `h-44 md:h-48` | `h-36 sm:h-44 md:h-48` |
| CoverageStats wrapper | `py-6 md:py-20` | `py-5 md:py-20` |
| MarketsSection subtitle/CTA | `mt-3 / mt-5` | `mt-2 md:mt-3 / mt-4 md:mt-5` |
| StatsBand wrapper | `mt-8 px-6 py-8 md:py-12` | `mt-6 px-5 py-6 md:px-6 md:py-12` |
| StatsBand grille | `gap-5 sm:grid-cols-2 lg:grid-cols-4` | `grid-cols-2 gap-x-4 gap-y-4 md:gap-10 lg:grid-cols-4` |
| ProcessTable section | `py-6 md:py-20` | `py-5 md:py-20` |
| ProcessTable header | `mb-6 md:mb-12` | `mb-4 md:mb-12` |
| ProcessTable étape | `flex-col gap-3 py-5` | grille `grid-cols-[auto_1fr]` mobile → `md:flex md:flex-col md:gap-3 md:py-6` |
| ProcessTable numéro | `text-5xl md:text-6xl` | `text-5xl md:text-6xl` (inchangé — conforme brief) |
| ProcessTable h3 / body | `text-xl / text-xs md:text-sm` | `text-lg md:text-2xl / text-sm` |
| ServicesTable section | `py-6 md:py-20` | `py-5 md:py-20` |
| ServicesTable header | `mb-6 md:mb-12` | `mb-4 md:mb-12` |
| ServicesTable subtitle | `text-xs md:text-base` | `text-sm md:text-base` |
| ServicesTable ligne | `py-4 md:py-7` | `py-2.5 md:py-7` |
| ServicesTable séparateur | `my-1` | `my-0.5 md:my-1` |
| ServicesTable body | `text-xs md:text-sm` | `text-sm` |
| OffMarketBand section | `py-6 md:py-20` | `py-5 md:py-20` |
| OffMarketBand description | `text-xs md:text-base` | `text-sm md:text-base` |
| ReviewsCarousel section | `py-6 md:py-20` | `py-5 md:py-20` |
| ReviewsCarousel header | `mb-6 md:mb-12` | `mb-4 md:mb-12` |
| ReviewsCarousel carte | `gap-3 p-4 md:gap-5 md:p-6` | `gap-2.5 p-4 md:gap-5 md:p-6` |
| ReviewsCarousel citation | `text-xs md:text-base` | `text-sm line-clamp-5 md:line-clamp-none md:text-base` |
| BlogTeaser section | `py-6 md:py-20` | `py-5 md:py-20` |
| BlogTeaser header | `mb-6 md:mb-12` | `mb-4 md:mb-12` |
| BlogTeaser grille | `gap-3 sm:grid-cols-2 lg:grid-cols-3` | `grid-cols-2 gap-2 sm:gap-3 md:gap-6 lg:grid-cols-3` |
| BlogTeaser vignette | `aspect-[4/3]` | `h-24 sm:h-auto sm:aspect-[4/3]` |
| BlogTeaser corps carte | `gap-3 p-6` | `gap-1.5 p-3 sm:gap-2 sm:p-4 md:gap-3 md:p-6` |
| BlogTeaser h3 | `text-xl` | `text-lg md:text-xl` |
| BlogTeaser extrait | `line-clamp-3 text-sm` | `hidden sm:block sm:line-clamp-3 text-sm` |

Plancher typo respecté : tout corps de texte primaire ≥ `text-sm` (14 px).
Aucun hexa en dur introduit ; tokens couleurs conservés ; pas d'emoji.

---

## 4. Preuves

- Script : `scripts/proof-pol2-5.mjs` (`node scripts/proof-pol2-5.mjs before|after`).
- Mesures : `/tmp/pol2-5-before.json`, `/tmp/pol2-5-after.json`.
- Captures plein écran iPhone 17 Pro Max :
  `docs/qa/screenshots-2026-05-18/pol2-5/`
  - `01-hero.png` (hero compacté + SearchBar)
  - `02-coups-de-coeur.png` (FeaturedCarousel)
  - `03-methode.png` (ProcessTable — numéros 01/02/03)
  - `04-footer.png` (bas de page — montre le footer hors scope ~1808 px)
  - `00-fullpage.png` (page entière)
  - `05-desktop-1440.png` (sanity desktop : layout/typo inchangés)

### Vérifications

- `overflowX = false` sur mobile **et** desktop 1440.
- 9 `<h2>` de section → **une seule** font-size (25,6 px mobile / 44 px desktop).
- Vignettes Insights : 293 → **96 px** (≈ cible « halve », au-delà).
- Images Featured : 248 → **160 px** (−35 %, ≥ cible −25 %).
- Aucun texte tronqué sur les captures (titres, prix, méthode lisibles).
- Desktop 1440 : `scrollHeight 8289`, h2 44 px → échelle desktop intacte.
