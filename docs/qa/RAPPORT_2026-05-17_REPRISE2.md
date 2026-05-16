# RAPPORT REPRISE 2 — 2026-05-17

Suite. Branche `refonte-design-mai-2026`. Règle absolue tenue : tsc+build
verts avant chaque commit (0 rollback). Aucun push/deploy/DB. Preuve
Playwright iPhone 17 Pro Max par bug.

## ✅ FAITS + VÉRIFIÉS (ce run)

| Bug | Commit | Preuve |
|---|---|---|
| **10** logo centré tous supports | `98267ae` | Header → grid `[1fr_auto_1fr]` partout (burger gauche / logo centre / nav droite). Probe : logoCenterX **220=vpCenter** (iPhone 17PM), **720=720** (desktop), burger x=16 (gauche). |
| **11** vidéo Hero moins zoomée mobile | `ce31c56` | Cause : `min-h-[80vh]`+`min-h-[88dvh]` → boîte trop haute/étroite → object-cover crop massif. Fix CSS (mobile 66vh/62vh, desktop inchangé). Hero **765px → 631px** sur 956 → bien plus de recul, sans letterbox ni asset. |
| **9** logo doré en dark | `7c4895a` | Dark wordmark blanc→**doré #D4A55A** (`mapa-logo-gold-h96.png`, fourni manuellement par Julien). Symbole reste copper. Probe : light→master ✅, dark→gold ✅. |

Gate smoke après chaque : **10/10 OK** (fr light+dark iPhone 17 Pro Max).
Screenshots : `docs/qa/screenshots-2026-05-17/{bug9,bug10,bug11,bugs-9-11-gate}/`.

Rappel run précédent (déjà committé + prouvé) : Bug **1** (`e5a2e0d`),
Bug **2** (`f6e0b30`), Bug **4** (`d6c9552`).

## ⏳ RESTANT — non fait, non déclaré fait

| Bug | Périmètre | Plan |
|---|---|---|
| **3** typo uniforme | Système | Échelle (H1/H2/H3/H4/body) en globals.css + application home & 21 routes, suppression overrides. Réf Christie's/Sotheby's. |
| **5+6** recherche + équivalences | Logique conséquente | `lib/property-types.ts` (TYPE_GROUPS house:[maison,villa], apartment:[appartement,duplex,studio,penthouse,triplex] ; `isInGroup`, `expandToGroup`). SearchBar : synonymes. **Filtre pays obligatoire** (Steinfort LU ≠ Roussy FR). **Rayon 5 km** (Haversine si lat/lng, sinon match ville EXACT — pas "contient"). Comparables EVS : mêmes groupes. Tests `scripts/test-engine.mjs` : "maison steinfort"→Steinfort only 0 Roussy ; "appartement luxembourg"→appart+duplex+studio+penthouse+triplex Lux only. |
| **7** EVS Steinfort | Option (b) | Cible révisée **680-750k€**. Pas de forçage : le pool comparables élargi (Bug 6) doit faire converger ; sinon documenter écart `docs/audits/EVS_LU_CALIBRATION_2026-05-17.md` (méthodo, écart, hypothèses, sources Observatoire). Cas test 7 attend 680-750k. |
| **8** cohérence globale | Audit | Marges/espacements uniformes (py-* sections), poids/tailles, audit iPhone 17PM + desktop 1440, matrice screenshots. |

## STATUT

**Déployable maintenant (cumulatif branche)** : dark mode (cascade
`:root.dark`), logo cliquable + **centré tous supports** + **doré en
nuit**, toggle mobile, burger premium (langues haut, gauche, sobre),
décor −50 %, **vidéo Hero recul mobile**, MobileMenu mort supprimé.

**Bug 9 — note asset** : seul `mapa-logo-gold-h96.png` fourni ;
`mapa-logo-dark-h96.png` (blanc) n'est plus référencé (peut être archivé
par Julien). next/image resize automatiquement.

Reste **3 / 5+6 / 7 / 8** : refonte logique recherche + moteur EVS + typo
système + polish — gros chantier. Exécution en continuation, **1 commit
prouvé par bug**, aucun « done » sans preuve (la règle qui tient toute
l'opération). Aucune question : je reprends Bug 3 → 5+6 → 7 → 8 au
prochain run, même rigueur.

Deploy : manuel par Julien (`npx vercel --prod --yes`) après validation
visuelle complète. Dev :3001 arrêté (post-build). Branche
`refonte-design-mai-2026`, aucun push/deploy/DB.
