# RAPPORT REPRISE — 2026-05-17

Suite de `RAPPORT_2026-05-17_BUGS.md` après tes 3 décisions de déblocage.
Branche `refonte-design-mai-2026`. Règle absolue tenue : `tsc`+`build`
verts avant chaque commit (0 rollback). Aucun push/deploy/DB.

## ✅ FAITS + VÉRIFIÉS CE TOUR (Playwright iPhone 17 Pro Max)

| Bug | Commit | Preuve |
|---|---|---|
| **1** toggle jour/nuit mobile | `e5a2e0d` | Cause : `MobileMenu.tsx` = code mort (jamais importé) ; le vrai menu `HeaderBurger` n'avait aucun ThemeToggle. Ajouté. Probe : `html.dark` false→true, **persiste** après fermeture, `body.bg rgb(26,31,42)`. |
| **2** décor trop grand | `f6e0b30` | Pas de lucide-react sur la home ; cards/logo déjà traités par ton `c32d9e7`. Décors voyants réduits **-50 %** : brackets Hero `size-10→5`, halos `OffMarketBand size-96→48`, `ContactCTA size-72→36`. |
| **4** burger sobre premium | `d6c9552` | `HeaderBurger` : langues remontées **sous la barre titre, avant la nav** (probe : langTop 97 < navTop 182), titres `text-center→text-left` + `3xl/4xl bold → xl/2xl medium` tracking large (Christie's/Sotheby's), chevrons à droite. **`MobileMenu.tsx` supprimé** (0 import — cause des 5 régressions burger). Capture validée visuellement. |

**Gate smoke post-1/2/4** : `10/10 OK` (fr, light+dark, iPhone 17 Pro Max) —
aucune régression sur les 5 routes critiques.

Screenshots : `docs/qa/screenshots-2026-05-17/{bug1,bug4,bugs-1-2-4-gate}/`.

## ⏳ RESTANT — plan d'exécution (non fait, non déclaré fait)

| Bug | Plan |
|---|---|
| **3** typo uniforme | Établir une échelle (H1/H2/body) et l'appliquer aux composants home ; preuve par capture comparée. |
| **5+6** recherche + équivalences | `lib/` recherche : synonymes `maison↔villa`, `appartement↔duplex↔studio↔penthouse↔triplex` ; filtre **pays** obligatoire ; rayon **5 km** ; mêmes équivalences dans les comparables EVS. Tests dans `scripts/test-engine.mjs`. |
| **7** EVS Steinfort | **Option (b)** retenue : améliorer UNIQUEMENT la méthodo comparables (via Bug 6), **sans forcer 600-700k**. Si convergence naturelle tant mieux ; sinon documenter l'écart dans `docs/audits/EVS_LU_CALIBRATION.md` (sources Observatoire à fournir par Julien si bouclage requis). Aucun sur-apprentissage. |
| **8** cohérence globale | Audit marges/espacements/poids ; corrections ; preuve capture. |

## STATUT

Prêt à déployer (cumulatif branche) : dark mode, logo cliquable, **toggle
mobile (Bug 1)**, **décor réduit (Bug 2)**, **burger premium (Bug 4)**.
Reste 3/5/6/7/8 : périmètre logique conséquent (recherche + moteur EVS +
typo + polish) — exécution en continuation, **un commit prouvé par bug**,
pas de « done » sans preuve. Aucune question intermédiaire ; je reprends
directement sur Bug 3 → 5+6 → 8, avec 7 en option (b).

Serveurs : dev :3001 actif (sera arrêté avant chaque build). Branche
`refonte-design-mai-2026`, aucun push/deploy/DB.
