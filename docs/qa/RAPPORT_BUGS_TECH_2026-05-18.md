# RAPPORT — OPÉRATION BUGS TECHNIQUES — 2026-05-18

Branche `refonte-design-mai-2026`. **Commits uniquement — AUCUN push,
AUCUN deploy** (Julien deploie lui-même : `npx vercel --prod --yes`).
Règle tenue : `tsc` + `pnpm build` verts AVANT chaque commit (0
rollback). `app/admin/offmarket/*` & `lib/admin/offmarket.ts` **jamais
touchés**. 1 commit granulaire + 1 preuve Playwright par bug.

## Synthèse

| Bug | Statut | Commit | Preuve |
|---|---|---|---|
| **T1** 404 fiches biens intermittent | ✅ CORRIGÉ | `9ebf6be` | 17/17 liens biens+mandats = 200, 0 404 |
| **T2** « Mandat de recherche » 404 nav | ✅ NON REPRODUCTIBLE | `7386c3d` | 48/48 liens header fr/en/de = 200 |
| **T3** Forms bloqués « Vérif anti-spam… » | ✅ CORRIGÉ | `97dc1c3` | Scénario A & B : 0 spinner figé, débloqué <3 s |
| **T4** Estimation cassée | ✅ CORRIGÉ | `960dc29` | Terrain LU 600 m² = 200 (était 400) + flux EVS OK |
| **T5** Titres biens non traduits | ✅ CORRIGÉ | `4616df0` | 6/6 unit getLocalizedField + home fr/en/de OK |
| **T6** Article blog coupé Mac + typo mobile | ✅ CORRIGÉ | `fbccfe7` | Mac : 15 310 car. visibles, 0 pager ; mobile typo −30 % |
| **T7** Leads E2E pollués | ✅ CORRIGÉ | `ac37179` | 6/6 drop, 5/5 keep, 4/4 endpoints câblés |
| **T8** Header trop étroit | ✅ CORRIGÉ | `3175d33` | maxW 1600, 1920→1600 (vs 1400), logo intact |

**Gate E2E final** : `bugs-tech-final` = **10/10 OK, 0 CRASH** —
5 routes (`/`, `/biens`, `/biens/85866347`, `/contact`, `/journal`)
× fr × light/dark × iPhone 17 Pro Max. `tsc` 0 · `pnpm build` 257/257.

---

## Détail

### T1 — 404 fiches biens `9ebf6be`
`fetchPropertyByIdOrSlug` avalait toute erreur (timeout 57014 / cold
start Supabase / réseau) en `null` → `notFound()`. Au reload l'aléa
était passé. Fix : `resolvePropertyOnce()` distingue codes bénins
(PGRST116/22P02/PGRST204/42703) d'une erreur **transitoire** → 1 retry
(300 ms) avant d'abandonner. `null` (→404) **seulement** si résolution
propre et vide. Aucun changement de schéma.

### T2 — « Mandat de recherche » 404 `7386c3d`
**Non reproductible** : audit exhaustif des href du `<header>`
(dropdowns + burger) en fr/en/de = 48/48 → 200. Tous les points
d'entrée « Mandat de recherche » → `/mandats/recherche`
(`generateStaticParams` inclut `recherche` × {fr,en,de}). Déjà corrigé
par l'alignement de routing antérieur. **Aucun changement de code**
(fabriquer un fix pour un non-bug = risque de régression). Si persiste
côté Julien après deploy = cache CDN, résolu par le nouveau deploy.

### T3 — Forms bloqués captcha `97dc1c3`
`<Turnstile>` n'avait aucune gestion d'échec : si le script CF ne
charge pas (CSP/adblock/réseau/panne), `onToken` jamais appelé →
bouton figé sur « Vérification anti-spam en cours… ». Fix :
error/timeout/expired-callback + `script.onerror` + filet 10 s →
`onUnavailable()`. ContactForm & NDAForm : `captchaFailed` →
`captchaReady` → submit débloqué, envoyé sans token, **le serveur
valide/rejette** (réponse rapide vs spinner infini). Preuve : A (sans
site_key) submit 200 en 3 ms ; B (site_key + CF bloqué) débloqué 3 ms,
serveur 403 propre, **0 spinner figé**.

### T4 — Estimation cassée `960dc29`
Investigation : tunnel EVS LU + moteur legacy multi-pays
fonctionnent. **Bug racine** : `type=terrain` → 400 `missing_fields`
(API & form exigeaient `livingSurface > 0`, or un terrain n'a pas
d'habitable) → estimation d'un terrain **impossible**. Fix (moteur
**legacy** uniquement, EVS non touché) : surface utile = `landSurface`
si terrain ; `lib/estimate.ts` valeur terrain = landSurface × prix/m²
(TYPE_FACTOR.terrain encode déjà la décote) ; EstimateForm étape 1
adaptée. Terrain LU Esch 600 m² = 200, 1.74–2.36 M€ (était 400).
*Note annexe (hors scope, non corrigé)* : la CSP `script-src` bloque
`va.vercel-scripts.com` (Vercel Analytics/Speed Insights) — sans lien
avec l'estimation, à arbitrer séparément.

### T5 — Titres biens non traduits `4616df0`
`fetchHomeFeatured` ne lisait que `title_fr`/`title`. Fix :
`lib/i18n-field.ts` `getLocalizedField()` ; home + off-market
(list/fiche) localisés (select résilient pour les colonnes pas encore
migrées). `/biens` (PropertyCard) & fiche `/biens/[slug]` étaient déjà
OK (`pickLang`). **Affichage traduit = data-dépendant** : `properties`
(Apimo) doit avoir title_en/de remplis par le sync ; `properties_
offmarket` après migration + saisie admin. Le code les **consomme**
désormais (avant : ignorés). FR conservé tant qu'aucune traduction
(conforme : pas d'auto-traduction).

### T6 — Article blog `fbccfe7`
`BookletReader` paginait l'article **horizontalement** (translateX) →
corps décalé hors écran ⇒ perçu « 2 colonnes, 2e coupée, invisible »
(diagnostic : slider scrollW 6850 / clientW 894). Réécrit en lecture
**verticale mono-colonne** (cover + corps `.prose-mapa`, scroll
naturel ; pager/swipe/flèches supprimés). Typo mobile réduite
(`@media ≤640px` : p 16→14.4 px, h2 32→22.4 px). Preuve : Mac 1440 =
15 310 car. visibles, 0 pager, 0 overflow ; iPhone idem.

### T7 — Leads E2E `ac37179`
Purge : `20260518_clean_e2e_leads.sql` (DELETE leads +
estimation_requests `@example.*`/`e2e.*`/`scan.*`, idempotent).
Prévention : `lib/test-email.ts` ; en **PROD** /api/lead,
/api/nda-request, /api/contact répondent `{ok:true}` sans INSERT,
/api/estimate ne persiste pas (résultat quand même renvoyé) ; en
**DEV** autorisé (preuves Playwright). 6/6 drop, 5/5 keep (dont
`contact@exemple.fr` ≠ `example`), 4/4 endpoints câblés.

### T8 — Header élargi `3175d33`
`max-w-[1400px]` → `max-w-[1600px]` sur le grid header. Logo **non
touché** (56 mobile / 96 desktop). Preuve : Mac 1440 / 1920 (conteneur
1600 vs 1400 avant) / iPhone, logo intact, 0 overflow.

---

## ⚠️ MIGRATIONS SQL — à appliquer MANUELLEMENT par Julien

`supabase/migrations/` — idempotentes, non destructives. **Le code
dégrade gracieusement sans elles** (aucun 500, aucun lead perdu).

| Fichier | Requise ? | Effet |
|---|---|---|
| `20260518_clean_e2e_leads.sql` | Recommandée (one-shot) | Purge des leads/estimations de test E2E déjà en base. |
| `20260518_offmarket_i18n_titles.sql` | Pour titres off-market EN/DE | `ADD title_en/title_de` à `properties_offmarket` (à remplir via admin). Sans : fallback FR. |
| `20260518_rgpd_consent.sql` | Recommandée (op. précédente) | `rgpd_consent_at` leads + estimation_requests. |
| `20260518_estimation_status_deleted.sql` | **Requise** pour soft-delete estimations (op. précédente) | Élargit CHECK status à `'deleted'`. |
| `20260518_leads_nda.sql` | Non requise (op. précédente) | Documentaire (type nda dédié). |

Coller chaque `.sql` dans Supabase Studio → SQL Editor (projet
`dutfkblygfvhhwpzxmfz`), exécuter. Pour la purge : lancer d'abord les
`SELECT count(*)` commentés en tête.

## Bugs skippés / limites assumées

- **T2** : aucun code modifié (non reproductible — documenté + prouvé).
- **T5** : le rendu traduit dépend du **remplissage** des colonnes
  (sync Apimo / saisie admin off-market) — hors autonomie. short_pitch/
  description i18n off-market = suite documentée (helper déjà prêt).
- **T4 annexe** : CSP bloque les scripts Vercel Analytics
  (`va.vercel-scripts.com`) — observation, non corrigée (changement CSP
  global hors scope T4, à arbitrer).
- **T7** : le drop effectif est gaté `NODE_ENV=production` — vérifié
  par lecture/unit, non rejouable en `next dev` (par design).

## TODO MATIN JULIEN

1. Lire ce rapport. `git log` branche `refonte-design-mai-2026`
   (commits `9ebf6be` → `3175d33`, **non poussés**).
2. Appliquer les migrations utiles (purge E2E + offmarket i18n +
   rgpd_consent + estimation_status_deleted) dans Supabase Studio.
3. Déployer : `npx vercel --prod --yes`.
4. Vérifs post-deploy : fiches biens (plus de 404 au 1er clic), form
   mandat exclusif (submit < 3 s), estimation terrain, article blog
   (lecture verticale), header large, titres biens en DE/EN une fois
   les colonnes remplies.

## État final

`tsc` 0 · `pnpm build` 257/257 · gate 10/10 · branche
`refonte-design-mai-2026`. Working tree : ce rapport à commiter
(commit `docs:`). **Aucun push, aucun deploy.**
