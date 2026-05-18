# RAPPORT — OPÉRATION ARCHITECTURE NAV — 2026-05-18

Branche `refonte-design-mai-2026`. **Commits uniquement — AUCUN push,
AUCUN deploy** (Julien deploie : `npx vercel --prod --yes`).
`tsc` + `pnpm build` verts avant chaque commit (0 rollback).
`app/admin/offmarket/*` & `lib/admin/offmarket.ts` **jamais touchés**.
1 commit granulaire + 1 preuve Playwright par NAV.

## Synthèse

| NAV | Statut | Commit | Preuve |
|---|---|---|---|
| **NAV1** Réorg header + doublons | ✅ | `18c672b` | gauche=ACHETER/VENDRE/LOUER, droite=OFF-MARKET/SERVICES/JOURNAL, burger idem, 0 MANDATS |
| **NAV2** Ordre 6 méthodes | ✅ | `44d77cc` | ordre exact des 6 `<h3>` |
| **NAV3** Marchés actifs compact desktop | ✅ | `ce5640d` | bloc desktop 492px (vs ~900-1000), 24 communes intactes |
| **NAV4** Chiffres clés −50% | ✅ | `4d62973` | Mac 60→30px, iPhone 36→24px |
| **NAV5** Liseré doré services | ✅ | `f6ded91` | 5 liserés #B8865A, 1px, 50% |
| **NAV6** Blog Mac large + mobile −50% | ✅ | `33da7ad` | conteneur 896→1360px, titre mobile 24→20px |
| **NAV7** Mot fondateur + « Julien » seul | ✅ | `89b3a6a` | QuoteBand retiré, 0 « Julien » seul (UI), « Julien Brebion » conservé |
| **NAV8** Doublon CTA conversation | ✅ | `8108259` | « Une conversation… »=0, « Passer à l'action »=1 |
| **NAV9** Bandeau reco exclusif | ✅ | `0c89a70` | banni exclusif=0, présent sur les 4 autres |

**Gate E2E final** : `nav-final` = **10/10 OK, 0 CRASH** — 5 routes
(`/`, `/biens`, `/biens/85866347`, `/contact`, `/journal`) × fr ×
light/dark × iPhone 17 Pro Max. `tsc` 0 · `pnpm build` 257/257.

## Détail

- **NAV1** `Header.tsx` + `HeaderBurger.tsx` : onglet MANDATS retiré
  (tout est dans VENDRE), « Off-Market » retiré du sous-menu ACHETER,
  OFF-MARKET promu onglet principal après le logo. Ordre final :
  ACHETER · VENDRE · LOUER · [LOGO] · OFF-MARKET · SERVICES · JOURNAL.
  Burger : groupe `mandates` supprimé, `journal` ajouté top-niveau.
- **NAV2** `ServicesTable.tsx` : ordre Vente/Recherche/Broker/
  Négociation/Estimation/Location (permutation positions 5↔6).
- **NAV3** `MarketsSection.tsx` : `DesktopMarkets` resserré (p-6→p-4,
  t-h2→text-xl/2xl, gap-10→gap-4, grille communes 5 cols, regions
  2 cols). Contenu strictement identique (24 communes). Mobile inchangé.
- **NAV4** `StatsBand.tsx` : chiffres `text-4xl/6xl` → `text-2xl/3xl`.
- **NAV5** `ServicesTable.tsx` : liste mono-colonne + 5 liserés copper
  `#B8865A` (50% largeur, 1px, centrés, `my-1`).
- **NAV6** `blog/[slug]/page.tsx` + `BookletReader.tsx` : conteneur
  `lg:max-w-[90vw] xl:max-w-[1400px]`, titre mobile `text-2xl→text-xl`.
- **NAV7** `page.tsx` (QuoteBand retiré), 3 fichiers i18n + Chatbot +
  fiche off-market. Doc `docs/qa/COPY_REWRITES_TODO.md`. Détails &
  exceptions ci-dessous.
- **NAV8** `page.tsx` : `<ContactCTA>` retiré (doublon du CTA footer
  « Passer à l'action » présent sur toutes les pages).
- **NAV9** `mandats/[type]/page.tsx` : encadré or discret (label +
  texte italique ≤3 lignes) sauf `exclusif`. i18n
  `mandate_common.reco_label/reco_text` fr/en/de.

## Décisions / déviations assumées (honnêtes)

- **NAV9** : l'emoji ⭐ du brief remplacé par un label texte
  « Notre recommandation » — règle projet CLAUDE.md « Pas d'emoji
  dans l'UI » (intention visuelle conservée, encadré or).
- **NAV7 — mot fondateur** : `QuoteBand` retiré de la home mais
  composant + clés i18n `quote_band.*` **conservés** (orphelins, non
  affichés) — réécriture = travail collaboratif « avec Julien »
  (cf. `COPY_REWRITES_TODO.md`). Suppression définitive non faite
  (hors autonomie : décision éditoriale).
- **NAV7 — témoignages clients** : les avis (`<blockquote>`, table
  DB `reviews`) citent légitimement « Julien » par son prénom.
  **NON réécrits** : modifier un témoignage client = le falsifier.
  Hors scope NAV7 (qui vise la copy agence/CTA, pas l'UGC).
- **NAV8** : composant `ContactCTA` conservé dans la codebase
  (plus monté, non utilisé ailleurs) — non supprimé (hors scope).
- **NAV7 — « Julien Brebion » complet** conservé partout où c'est
  une identité/signature : Qui-sommes-nous, success NDA, aria-labels
  contact-reveal, carte contact fiche off-market (sous photo).

## Aucune migration SQL (opération 100% front/i18n)

Aucune écriture DB. Rien à appliquer côté Supabase pour cette
opération.

## TODO MATIN JULIEN

1. Lire ce rapport. `git log` branche `refonte-design-mai-2026`
   (commits `18c672b` → `89b3a6a`, **non poussés**).
2. Déployer : `npx vercel --prod --yes`.
3. Vérifs : header (nouvelle archi + burger), home (6 méthodes
   ordonnées + liserés, Marchés actifs compact, chiffres réduits,
   plus de mot fondateur ni doublon CTA), pages mandats (bandeau
   reco sauf exclusif), blog (large Mac).
4. **Décision éditoriale** : réécrire (ou non) le « mot fondateur »
   — cf. `docs/qa/COPY_REWRITES_TODO.md` — puis remonter/supprimer
   `QuoteBand` + clés i18n `quote_band.*`.

## État final

`tsc` 0 · `pnpm build` 257/257 · gate 10/10 · branche
`refonte-design-mai-2026`. Working tree : ce rapport à commiter
(commit `docs:`). **Aucun push, aucun deploy.**
