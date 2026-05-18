# RAPPORT — OPÉRATION 8 BUGS — 2026-05-18

Branche `refonte-design-mai-2026`. **Commits uniquement — AUCUN push,
AUCUN deploy** (Julien review + deploy au réveil : `npx vercel --prod
--yes`). Règle tenue : `tsc` + `pnpm build` verts AVANT chaque commit
(0 rollback). `app/admin/offmarket/*` & `lib/admin/offmarket.ts`
**jamais touchés** (chantier Julien parallèle). 1 commit granulaire +
1 preuve Playwright iPhone 17 Pro Max par bug.

## Synthèse

| Bug | Statut | Commit | Preuve |
|---|---|---|---|
| **1** Prix off-market uniforme « Prix sur demande » | ✅ FAIT | `619735e` | `screenshots-2026-05-18/bug1/` — 0 fuite €, « Prix sur demande » home+fiche |
| **2** Cover off-market standardisé confidentiel | ✅ FAIT | `3e22b74` | `bug2/` — 8/8 (home+listing+2 fiches × light/dark), 0 image réelle |
| **3** PhoneInput préfixes pays (sans dépendance) | ✅ FAIT | `f45654f` | `bug3/` — contact+estimer, 26 indicatifs, défaut LU |
| **4** Liste 26 pays MAPA + CountrySelect | ✅ FAIT | `16ce0b5` | `bug4/` — contact+estimer, 26 options, défaut LU |
| **5** Refonte « Demander le NDA » + fix validation | ✅ FAIT | `5e73e7d` | `bug5/` — UI+validation+submit 200+DB+message succès |
| **6** Admin estimations CRUD | ✅ FAIT (flux auth doc) | `d396fc7` | `proof-bug6` — routes créées + auth-gated (401/login) |
| **7** RGPD consentement + remontée admin | ✅ FAIT | `f5223fe` | `bug7/` — case+lien, submit gated, insert résilient |
| **8** Phase B inachevé masqué + doc | ✅ FAIT | `fbf2ad3` | grep = bloc inerte retiré ; tsc/build verts |

**Gate E2E final** : `bugs-final` = **10/10 OK, 0 CRASH** — 5 routes
(`/`, `/biens`, `/biens/85866347`, `/contact`, `/journal`) × fr ×
light/dark × iPhone 17 Pro Max. `tsc` 0 · `pnpm build` 257/257 OK.

---

## Détail par bug

### BUG 1 — Prix off-market `619735e`
Off-market = confidentiel : « Prix sur demande » partout (home
`fetchHomeFeatured` + fiche), helper de prix dynamique retiré. Aucune
fuite du prix réel. (Inverse volontairement l'ancien affichage prix.)

### BUG 2 — Cover confidentiel standardisé `3e22b74`
`OffmarketPlaceholder` devient le cover standard (fond `bg-bg-contrast`
figé + cadenas or + `cover_title`/`cover_subtitle` i18n fr/en/de).
Forcé sur **toutes** les surfaces publiques (home `FeaturedCarousel`,
listing `/off-market`, fiche `/off-market/[id]`) — **même si une image
custom existe en base**. `showLabel`/`compact` conservés (rétro-compat
vignette admin non modifiée).

### BUG 3 — PhoneInput `f45654f`
`components/ui/PhoneInput.tsx`, zéro dépendance externe. Select
drapeau+indicatif (source `lib/countries`) + input tel, valeur
combinée `+352 691 620 127`. `isPlausiblePhone()` = validation serveur
légère tolérante (jamais de lead perdu). Branché ContactForm +
EstimateForm (NDA via BUG 5).

### BUG 4 — 26 pays MAPA `16ce0b5`
`lib/countries.ts` : 26 marchés réels (name_fr/en/de, indicatif,
drapeau) + helpers. `components/ui/CountrySelect.tsx` unique
réutilisable, défaut LU. Branché EstimateForm (remplace liste ISO 10
codes en dur) + ContactForm (nouveau champ Pays). NDA via BUG 5.

### BUG 5 — NDA `5e73e7d`
**Cause du faux rejet** : `e.currentTarget.reset()` appelé APRÈS
`await` (currentTarget nul → throw catché → « error » alors que la
soumission réussissait). Réécrit en formulaire **entièrement
controlé**. UI : intro, bouton « Demander le NDA », CountrySelect +
PhoneInput, 3e case RGPD (lien /legal/rgpd). Endpoint NEUF
`/api/nda-request` (écrit **uniquement** dans `leads`). **Découverte
RLS** : `leads` a une policy INSERT anon mais **pas de SELECT** →
`INSERT…RETURNING` rejeté ; on insère sans `.select()`.
`type='offmarket_request'` (RLS-safe), `source='nda_request:offmarket:
<id>'`. Email Resend → `j.brebion@mapagroup.org` si `RESEND_API_KEY`.

### BUG 6 — Admin estimations CRUD `d396fc7`
CREATE (`/admin/estimations/new` + `POST /api/admin/estimations`,
auth SSR, sans migration). DELETE soft (`status='deleted'`, liste
filtrée). MODIFIER déjà couvert par le PATCH existant. **Moteur EVS
non touché.** Flux authentifié non rejouable headless (pas de creds
admin) → routes prouvées créées + sécurisées (401/redirect login),
**à valider par Julien connecté**.

### BUG 7 — RGPD `f5223fe`
3e case RGPD obligatoire (texte standard + lien /legal/rgpd) sur
ContactForm, EstimateForm (étape 3), NDAForm (BUG 5). i18n `rgpd.*`.
`lib/lead-insert.ts` = insertion **résiliente** : tente avec
`rgpd_consent_at`, retente sans si colonne absente → jamais de 500,
jamais de lead perdu (consentement toujours tracé dans `message`).
Remontée admin : badge « RGPD ✓ JJ/MM/AAAA » liste leads + « ✓ obtenu
le … » détail estimation (source colonne si migrée, sinon dérivée).

### BUG 8 — Phase B `fbf2ad3`
Audit lecture seule : encarts « Action Phase B » (détail
mandat-recherche + ARCOVA) = **placeholders inertes** (aucune action).
Finir = écrire dans `properties` (table lecture seule, interdit
CLAUDE.md). → Encarts retirés + backlog
`docs/admin/PHASE_B_BACKLOG_2026-05-18.md`. Reste 100% fonctionnel.

---

## ⚠️ MIGRATIONS SQL — à appliquer MANUELLEMENT par Julien

Versionnées dans `supabase/migrations/`. Idempotentes, non
destructives. **Le code dégrade gracieusement tant qu'elles ne sont
pas appliquées** (aucun 500, aucun lead/estimation perdu).

| Fichier | Requise ? | Effet |
|---|---|---|
| `20260518_rgpd_consent.sql` | Recommandée | `rgpd_consent_at` sur `leads` + `estimation_requests` (+ `consent`). Sans : consentement tracé dans `message`/`inputs`, admin le dérive. |
| `20260518_estimation_status_deleted.sql` | **REQUISE pour le soft delete BUG 6** | élargit le CHECK `status` à `'deleted'`. Sans : DELETE renvoie un 409 explicite (création + reste OK). |
| `20260518_leads_nda.sql` | Non requise | Documentaire : option d'un `type='nda_request'` dédié (RLS) si souhaité plus tard. Rien à appliquer en l'état. |

Commande indicative : coller chaque `.sql` dans Supabase Studio → SQL
Editor (projet `dutfkblygfvhhwpzxmfz`), exécuter.

## Reste à faire / limites assumées (honnête)

- **BUG 6** : flux CRUD authentifié à valider par Julien connecté
  (Playwright headless ne peut pas se logger admin). Édition des
  `inputs` bruts d'une estimation non implémentée (risque « ne pas
  toucher EVS » + faible valeur) — documenté.
- **BUG 7** : appliquer `20260518_rgpd_consent.sql` pour la colonne
  structurée (sinon dérivation message — fonctionnel mais moins propre).
- **BUG 6** : appliquer `20260518_estimation_status_deleted.sql` avant
  d'utiliser « Supprimer ».
- Emails Resend (BUG 5) : effectifs uniquement si `RESEND_API_KEY` en
  prod ; sinon `console.warn` (jamais de throw).
- Turnstile actif en prod : les preuves de succès réseau (BUG 5/7) ont
  tourné avec Turnstile désactivé via env (jamais de fichier modifié) ;
  le gating `captchaReady` reste le comportement voulu en prod.

## TODO MATIN JULIEN

1. Lire ce rapport. `git log` branche `refonte-design-mai-2026`
   (commits `619735e` → `d396fc7`, **non poussés**).
2. Appliquer les 2 migrations utiles (`rgpd_consent`,
   `estimation_status_deleted`) dans Supabase Studio.
3. Déployer : `npx vercel --prod --yes`.
4. Vérifier connecté : CRUD admin estimations (créer / supprimer),
   badge RGPD liste leads, détail estimation.
5. Tester un NDA réel sur une fiche off-market (email reçu sur
   `j.brebion@mapagroup.org` si `RESEND_API_KEY` configurée).

## État final

`tsc` 0 · `pnpm build` 257/257 · gate 10/10. Working tree : ce
rapport à commiter (commit `docs:`). **Aucun push, aucun deploy.**
