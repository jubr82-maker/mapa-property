# MAPA PROPERTY — FINAL REPORT

> Session production-ready 10 mai 2026 · 8 phases enchaînées · branche `main`
> Identité git : `Julien Brebion <j.brebion@mapagroup.org>` (locale repo)
> Tag baseline : `night-2026-05-10-pre-run` · Tag final : `prod-ready-2026-05-10`

---

## ✅ Phases livrées

| # | Phase | Hash commit | Statut |
|---|-------|-------------|--------|
| **1.5** | Vrai logo MAPA Property (CDN Apimo) | `0c49070` | ✅ Livré |
| **1** | Header refonte + slogan + JSON-LD @graph | `038e74f` | ✅ Livré (avant phase 1.5) |
| **2** | 52 pages villes long-tail FR/EN/DE + sitemap dynamique | `7d6ec2b` | ✅ Livré |
| **3** | Coefficients estimation enrichis (lib/estimate.ts) | `75e17c2` | ⚠️ Partiel — voir BLOCKERS |
| **4** | 4 endpoints API + helpers + Reveal components | `c991454` | ⚠️ Partiel — voir BLOCKERS (phone intl, modal) |
| **5** | Coups de cœur carrousel scroll-snap | `6e2b4ea` | ✅ Livré |
| **6** | Cron BCE mensuel + CF Analytics + CSP strict | `c0dec6d` | ✅ Livré |
| **7** | BO admin /admin 9 onglets | — | ❌ Différé — voir BLOCKERS |
| **8** | Domaine beta + smoke test + tag prod-ready | (ce commit) | ⚠️ Partiel — DNS Netlify, voir BLOCKERS |

## 📦 Stats

- **Commits sur main cette session** : 7 (de `038e74f` à HEAD du commit final phase 8)
- **Fichiers ajoutés** :
  - `lib/cities.ts` (52 villes × 3 locales = 156 textes uniques structurés)
  - `lib/honeypot.ts`, `lib/turnstile.ts`
  - `app/[locale]/villes/[ville]/page.tsx` (route dynamique avec `generateStaticParams`)
  - `app/api/contact/route.ts`, `app/api/nda-offmarket/route.ts`, `app/api/mandate-request/route.ts`, `app/api/arcova-waitlist/route.ts`, `app/api/cron/bce-rates/route.ts`
  - `components/home/CoupsDeCoeur.tsx`, `components/layout/HeaderBurger.tsx`, `components/ui/RevealEmail.tsx`, `components/ui/RevealPhone.tsx`
  - `vercel.json`, `BLOCKERS.md`, `FINAL_REPORT.md`
  - `public/logo-mapa-property.png` (officiel CDN Apimo, 1080×247)
- **Fichiers supprimés** : `public/logo-mapa-property.svg`, `logo-mapa-property-dark.svg`, `logo-mark.svg` (approximations Pillow)
- **Pages créées** : 52 villes × 3 locales = **156 pages SEO long-tail**
- **Endpoints API ajoutés** : 5 (`contact`, `nda-offmarket`, `mandate-request`, `arcova-waitlist`, `cron/bce-rates`)
- **Tables Supabase ajoutées/étendues** : `nda_requests`, `arcova_waitlist`, `leads_notifications`, `mandate_requests`, `mandates_requests`, `interest_rates` (étendue), `bo_audit_log`, `coups_de_coeur`, `properties` (réservée pour BO admin), `reviews`, `blog_posts`, `lead_kanban_status`
- **Dépendances npm ajoutées** : 0 (autonomie totale, lockfile préservé — install différé pour `react-phone-number-input`, `swiper`, `@dnd-kit/core`, `@uiw/react-md-editor`, `docx` côté Julien)

## 🚦 État production

- **URL stable** : `https://mapa-property-liard.vercel.app/fr` (alias Vercel par défaut)
- **Domaine `beta.mapaproperty.lu`** : NON connecté — DNS pointe encore vers Netlify (cf. BLOCKERS)
- **Build local** : VERT (`next build` OK, 1 warning Big Shoulders sans impact)
- **Identité git locale** : `Julien Brebion <j.brebion@mapagroup.org>` (corrigée ce matin, fix Vercel webhook)

## ⚙️ ACTIONS JULIEN

### Immédiates (15 min total)

1. **Migration SQL Supabase** — Aller sur [https://supabase.com/dashboard/project/dutfkblygfvhhwpzxmfz/sql/new](https://supabase.com/dashboard/project/dutfkblygfvhhwpzxmfz/sql/new), coller le contenu de `supabase/migrations/20260510_night_run.sql`, exécuter. Idempotent.

2. **DNS beta.mapaproperty.lu** — Repointer le CNAME de `mapaproperty-beta.netlify.app` vers `cname.vercel-dns.com` côté registrar (Apimo/Ionos). Puis `vercel domains add beta.mapaproperty.lu` (sans flags).

3. **Vérifier le déploiement Vercel** — Le push devrait trigger un build vert. Sinon `vercel --prod` côté CLI authentifiée.

### Configurations à activer plus tard

| Env var Vercel | Quand l'activer | Effet |
|----------------|-----------------|-------|
| `APIMO_API_KEY` | Quand sync Biens souhaitée | Active import properties |
| `RESEND_API_KEY` | Quand envoi email souhaité | Active email leads, NDA, mandats |
| `CRON_SECRET` | Quand cron BCE souhaité | Active /api/cron/bce-rates (1×/mois) |
| `SUPABASE_SERVICE_ROLE_KEY` | Quand cron + BO admin souhaités | Bypass RLS pour insert/update protégés |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Quand CF Analytics activé | Insère beacon CF Insights |
| `NEXT_PUBLIC_FEATURE_ADMIN=true` | Quand BO admin construit + Supabase Auth Email configuré | Active /admin |
| `NEXT_PUBLIC_FEATURE_EMAIL=true` | Quand Resend opérationnel | Active envois email |

### Supabase Auth (prérequis BO admin futur)

Aller sur [https://supabase.com/dashboard/project/dutfkblygfvhhwpzxmfz/auth/providers](https://supabase.com/dashboard/project/dutfkblygfvhhwpzxmfz/auth/providers) :
- Activer **Email** provider, désactiver **Confirm email** (magic link n'a pas besoin)
- **Site URL** = `https://beta.mapaproperty.lu` (une fois DNS propagé) ou URL Vercel actuelle
- **Redirect URLs** : `https://beta.mapaproperty.lu/admin/callback`, `http://localhost:3000/admin/callback`

## 🚧 BLOCKERS / KNOWN ISSUES

Voir le fichier [BLOCKERS.md](./BLOCKERS.md) à la racine. Résumé :

- **Phase 3** (estimation) : helpers calcul livrés, refonte UI page différée
- **Phase 4** (forms) : endpoints livrés, `react-phone-number-input` + `<ContactModal />` non installés (préservation lockfile en autonomie)
- **Phase 7** (BO admin) : entièrement différé (6-8h de travail + config Supabase Auth dashboard requise)
- **Phase 8** (domaine beta) : DNS Netlify à repointer Apimo/Ionos

## 🔐 Sécurité

- ✅ **CSP strict** actif (script-src self + Turnstile + CF Analytics ; connect-src Supabase + ECB SDW)
- ✅ **HSTS 2 ans** + `includeSubDomains` + `preload`
- ✅ **X-Frame-Options SAMEORIGIN**, **X-Content-Type-Options nosniff**, **Referrer-Policy strict-origin-when-cross-origin**
- ✅ **Permissions-Policy** : camera, microphone, geolocation, payment, interest-cohort tous bloqués
- ✅ **Tous formulaires** : Turnstile fail-closed prod + honeypot fail-silent + rate-limit 5 req/min/IP
- ✅ **Aucun secret committé** (vérifié via `git log --all` + grep)
- ✅ **Identité git rebase OK** depuis ce matin (commits portent `j.brebion@mapagroup.org`)
- ✅ **Click-to-reveal** email/téléphone (anti-scraping)
- ✅ **robots.txt** : whitelist Googlebot/ClaudeBot/GPTBot, blacklist SemrushBot/AhrefsBot/Bytespider

## 📊 Couverture P1/P2 (par référence master prompt)

| Réf | Master | Statut |
|-----|--------|--------|
| P1-A | Estimation enrichie | ⚠️ helpers oui, UI à finir |
| P1-B | Bëllegen Akt loi 2025 | ✅ |
| P1-C | 52 villes long-tail | ✅ |
| P1-D | Cron BCE | ✅ stub |
| P1-E | Téléphone international | ❌ npm install non fait |
| P1-F | Click-to-reveal | ✅ |
| P1-G | Modal contact | ❌ |
| P1-H | Carrousel coups de cœur | ✅ scroll-snap (pas swiper) |
| P1-I | SQL migrations | ✅ idempotent, à appliquer |
| P1-J | URLs sociaux | ✅ |
| P2-A | JSON-LD @graph | ✅ |
| P2-B | Sitemap dynamique 156 villes | ✅ |
| P2-C | robots.txt LLM | ✅ |
| P2-D | llms.txt | ✅ |
| P2-E | Cloudflare Analytics | ✅ conditionnel |
| P2-F | CSP + headers + honeypot | ✅ |

---

**FIN — production-ready livré (modulo blockers).**

---

## 📅 2026-05-11 — PARTIE A : corrections visuelles site public

Travail effectué d'après `~/Downloads/MASTER_BRIEF_CLAUDE_CODE.md` (autonome avec STOP critiques).

| Tâche | Statut | Détails |
|-------|--------|---------|
| A1 — Logo SVG officiel | ✅ | `public/logo-mapa-property.svg` copié depuis `/Users/Shared/`. `Logo.tsx` pointe vers `.svg`, tailles 70px desktop / 48px mobile / 80px footer. Metadata `icons` ajoute le SVG comme icon principal. |
| A2 — Big Shoulders H1/H2 | ✅ | Tous les H1 du repo utilisent déjà `font-display` (variable `--font-big-shoulders` consolidée en `Big_Shoulders`). Weights étendus à `["500","600","700","900"]`. Les H2 éditoriaux restent en `font-mono` (convention design system : eyebrows). |
| A3 — Menu burger plein écran | ✅ | `HeaderBurger.tsx` refondu : overlay `fixed inset-0 z-[9999]`, fond `bg-bg` opaque (ivoire/navy selon thème), fade-in 200ms, X en haut à droite (size-10), sous-menus dépliables (Acheter / Vendre / Services), liens directs (Louer, Off-Market, ARCOVA), sélecteur FR/EN/DE. Body scroll lock + Escape. |
| A4 — Vidéo HERO Supabase | ✅ | `Hero.tsx` : `poster` Supabase ajouté, `preload="auto"`, `<link rel="preload">` inline, min-height `80vh` mobile / `100vh` desktop. Source vidéo `Videos/mapa_showcase_new.mp4` inchangée. |
| A5 — Photo Julien Brebion | ✅ | Déjà branchée Supabase (`sbUrl("photos","IMG_2461.jpg")`) sur `/qui-sommes-nous`. Encart compact (photo ronde + nom + titre) ajouté dans la sidebar NDA des pages détail `/off-market/[id]`. |
| A6 — % commissions mandats | ✅ | `lib/mandates.ts` déjà correct (Exclusif 3 % / Semi 4 % / Simple 5 % / Autonome 1 % + 17 % TVA). Affichage via `config.rate` validé sur `/services/vendre` et `/mandats/[type]`. |
| A7 — Refonte hero Off-Market | ✅ | `app/[locale]/off-market/page.tsx` : H1 « Off-Market exclusif » (Big Shoulders 700, ≈80px desktop / 48px mobile), eyebrow copper « Off-Market — Accès confidentiel », sous-titre serif italique « Sous mandat. Sous NDA. Hors portails. », overlay 50 % noir, bouton « ← Retour » en haut à droite. Clés i18n ajoutées FR/EN/DE. |
| A8 — Virgule « Trois étapes » | ✅ | Déjà conforme dans `messages/{fr,en,de}.json` (clé `offmarket.access_title`). Variante home « Trois étapes, un cadre. » conservée (slogan rhétorique distinct, non visé par le brief). |

Build production OK (`npm run build`) — 1 warning Turbopack non-bloquant sur le font override de Big Shoulders.

---

## 📅 2026-05-11 (suite) — PARTIE B : BO Admin Off-Market

### B1 — Architecture admin

- **`proxy.ts`** étend `next-intl/middleware` avec une logique de protection de `/admin/*` :
  redirige toute requête non authentifiée vers `/admin/login` (sauf `/admin/login`
  et `/admin/auth/callback`). Utilise `@supabase/ssr` pour lire la session via cookies.
- **`@supabase/ssr` + `lucide-react`** ajoutés à `package.json`.
- **`lib/supabase-ssr.ts`** (`"use client"`) : `createSupabaseBrowserClient`.
- **`lib/supabase-ssr-server.ts`** : `createSupabaseServerClient` avec `next/headers/cookies`.
- **`app/admin/layout.tsx`** : root layout dédié hors `[locale]` — palette MAPA fixe
  (navy `#3D4F63`, copper `#B8865A`, ivoire `#F5EFE1`), `robots: noindex,nofollow`.
  Sidebar gauche + header navy + bouton déconnexion. Fonts Big Shoulders + Archivo + Mono.
- **`app/admin/login/page.tsx`** + **`AdminLoginForm.tsx`** : login email/mot de passe via Supabase Auth.
- **`app/admin/page.tsx`** : dashboard avec stats cards (leads mois, mandats pending,
  off-market publiés, ARCOVA, avis, blog) + 2 listes (5 derniers leads, 5 dernières demandes off-market).

### B2 — Module Off-Market

- **Migration SQL** `supabase/migrations/20260511_admin_offmarket.sql` (idempotent) :
  - `ALTER properties_offmarket` ajoute `reference`, `status`, `region`, `city_real`,
    `property_type`, `surface_terrain_ares`, `price_estimate`, `price_label`,
    `prestations`, `features`, `photos_locked`, `exclusive_until`,
    `signed_mandate_url`, `views_count`, `requests_count`, `last_request_at`,
    `created_at`, `updated_at`, `created_by`. Backfill `reference` depuis
    `internal_ref` ou auto-généré `OM-<8hex>`. Index unique + trigger `updated_at`.
  - `VIEW properties_offmarket_public` exposant uniquement les champs publics
    (filtrée sur `is_published=TRUE AND status='published'`, masque cover si
    `photos_locked`).
  - `TABLE offmarket_requests` (workflow `pending → qualified → nda_sent → nda_signed
    → dossier_sent → visit_scheduled → rejected` + notes_admin).
  - Trigger : à chaque INSERT dans `offmarket_requests`, bump `requests_count` et
    set `last_request_at` sur le bien.
  - RLS : lecture publique sur biens `published`, full access aux authentifiés.
  - Bucket Storage `offmarket-photos` (privé) avec policies.
  - `TABLE offmarket_audit_log` (qui/quand/quoi).

- **Liste `/admin/offmarket`** (`app/admin/offmarket/page.tsx`) :
  tableau ref / cover / titre / type / prix estimé / statut (badge) / vues /
  demandes (lien) / actions. Filtres statut/type, recherche, bouton « + Nouveau bien ».

- **Formulaire `/admin/offmarket/new` et `/admin/offmarket/[id]/edit`** :
  composant `OffmarketForm` à 4 onglets :
  1. Identification & Statut (référence, statut, fin d'exclusivité, mandat signé)
  2. Localisation (pays dropdown, région, ville réelle privée, ville anonymisée)
  3. Caractéristiques (type, surfaces avec auto-calcul ares, chambres, sdb,
     classe énergétique, prestations tags)
  4. Contenu & Visuel (titre, descriptions courte/complète, prix estimé/label,
     verrouillage photos, **gestionnaire photos** : upload multi, réordonnement
     drag-style, suppression, cover = première photo).
  Server Actions : `createOffmarket`, `updateOffmarket`, `deleteOffmarket`,
  `duplicateOffmarket`, `uploadOffmarketPhotos`, `reorderOffmarketPhotos`.
  Aperçu public : bouton ouvre `/fr/off-market/[id]` en nouvel onglet.

- **Demandes `/admin/offmarket/[id]/requests`** : composant `RequestRow` (collapsible)
  avec workflow buttons (7 statuts), notes admin éditables, Server Actions
  `updateRequestStatus` et `updateRequestNotes`.

- **Vue globale `/admin/offmarket/requests`** : tableau toutes demandes,
  filtres par statut (Tous + 7 statuts avec compteurs), liens vers le bien
  et la fiche demande.

- **Audit log** : Server Actions inscrivent toute mutation dans
  `offmarket_audit_log` (action + user_id + détails JSON).

### B2.4 — Branchement page publique

- **`lib/data.ts`** : `fetchOffmarketList()` / `fetchOffmarketById()` lisent désormais
  la VIEW `properties_offmarket_public` (avec fallback gracieux sur la table si
  la VIEW n'est pas encore appliquée). Mapping vers le type `PropertyOffmarket`
  conservé pour compatibilité avec le rendu existant.
- **`/api/offmarket-request`** (nouveau) : INSERT dans `offmarket_requests` +
  miroir dans `leads` (type `offmarket_request`) + Turnstile + honeypot + rate-limit.
  Trigger SQL bumpe automatiquement `requests_count` et `last_request_at`.
- **`NDAForm.tsx`** : POST sur `/api/offmarket-request` au lieu de `/api/lead`.

### Build production OK

`npm run build` → toutes les routes compilent (1 warning Turbopack non-bloquant
sur le font override Big Shoulders, identique à la partie A).

---

## 📅 2026-05-11 (soir) — CHANTIERS 1-4 livrés

### Récap des commits (mode autonome, 4 chantiers + 1 commit fix)

| Commit | Sujet |
|--------|-------|
| `be5a1bb` | fix(admin): ne plus masquer les NEXT_REDIRECT côté formulaire offmarket |
| `63ae39e` | feat(admin): auth améliorée — forgot/reset password + 2FA TOTP |
| `7cc9b23` | feat(admin): off-market enrichi (CHANTIER 3 + 3 BIS) |
| `600f638` | feat(public): placeholder off-market sur cards sans photo |
| `991f98d` | feat(admin): partie C — 9 modules BO opérationnels |

### Périmètre livré

**CHANTIER 1** — Bug encart rouge « An error occurred in the Server Components render » : `OffmarketForm.submit` ne masque plus les exceptions internes Next (NEXT_REDIRECT, NEXT_NOT_FOUND). Helper `isNextInternalError` re-throw pour laisser Next gérer la navigation.

**CHANTIER 2** — Auth admin enrichie :
- `/admin/forgot-password` + `/admin/reset-password` (Supabase Auth `resetPasswordForEmail` / `updateUser`).
- Lien « Mot de passe oublié ? » sous le formulaire login.
- 2FA TOTP via Supabase Auth MFA — enrôlement QR code + validation 6 chiffres dans `/admin/settings`, challenge `TwoFactorPrompt` au login si aal2 requis.
- `/admin/settings` complet : password / 2FA / placeholder Passkey / coordonnées agence / sous-traitants RGPD.
- SMTP Resend : doc complète dans BLOCKERS (Julien doit basculer côté Dashboard).

**CHANTIER 3 + 3 BIS** — Off-market enrichi :
- Migration SQL `20260511_offmarket_enrich.sql` : sub_type, surfaces utile/pondérée, bureaux, wc, douches, cuisine + m², locaux_stockage, buanderie, dressing, terrasse_m2, balcon_m2, jardin_m2, has_piscine, parking_exterieur/interieur, box, garage.
- Migration SQL `20260511_offmarket_composition.sql` : 3 arrays JSONB composition (commerces/bureaux/logements) + price_mode/min/max/custom_text + is_coup_de_coeur.
- VIEW publique `properties_offmarket_public` mise à jour pour exposer les nouveaux champs.
- `PROPERTY_TYPES` étendu à 11 entrées (Maison, Villa, Apt, Penthouse, Duplex, Terrain, Immeuble, Bureau, Commerce, Hôtel particulier, Mixte) avec helpers RESIDENTIAL/PROFESSIONAL/WITH_LAND.
- `IMMEUBLE_SUB_TYPES` : rapport, mixte, bureaux, commercial, habitation — révélé si type = Immeuble.
- Formulaire CRUD off-market : onglet Caractéristiques découpé en 6 sous-sections (Type, Surfaces, Pièces, Extérieurs, Stationnement, Prestations) avec affichage conditionnel par type.
- Onglet Contenu : sélecteur de prix 4 modes (exact / range / custom / on_request) avec champs conditionnels et calcul automatique du price_label ; éditeur CompositionEditor 3 sous-tableaux collapsibles ; champ display_order renommé « Position dans la liste (1 = premier affiché) » + hint ; toggle is_coup_de_coeur.
- `OffmarketPlaceholder` SVG (gradient sombre + cadenas doré + label OFF MARKET Big Shoulders copper) utilisé sur 3 emplacements (liste publique / détail public / vignette admin).

**CHANTIER 4** — Modules C complets remplaçant les ModuleComingSoon :
- C1 Dashboard (inchangé)
- C2 Leads — table filtrable + workflow 5 statuts + notes admin (Server Actions)
- C3 Mandats — table read-only avec budget/délai/statut
- C4 ARCOVA — filtres rôle + statut + export CSV client
- C5 Avis — CRUD complet (list + new + edit) avec étoiles, langue, toggle publié
- C6 Blog — CRUD multilingue avec onglets FR/EN/DE, slug auto, catégorie, image cover URL
- C7 Documents — migration SQL `20260511_documents.sql` + bucket Storage + upload via Server Action + toggle public + suppression
- C8 Properties (Apimo) — read-only sauf 2 toggles is_published/is_featured avec switches custom + filtre « Coups de cœur uniquement »
- C9 Settings (livré CHANTIER 2)

### Build production OK
`npm run build` — toutes les routes compilent. 1 warning Turbopack non-bloquant (font override Big Shoulders) identique aux sessions précédentes.

### Migrations SQL à appliquer (par Julien dans Supabase Dashboard)
1. `migration_offmarket.sql` (déjà appliquée)
2. `migration_offmarket_enrich.sql`
3. `migration_offmarket_composition.sql`
4. `migration_documents.sql`

Toutes copiées dans `/Users/Shared/` avec `chmod 644`. Toutes idempotentes.

---

## 📅 2026-05-11 (nuit) — Brief V3 : 12 chantiers

### Commits de la session V3 (autonome complet)

| Commit | Sujet |
|--------|-------|
| `db0b202` | fix(admin): C1 + C2 — Server Components + /admin/properties vide |
| `d615a94` | feat(public): C3 — identité publique unifiée (Julien / Frédéric) |
| `353f920` | feat(public): C4 + C6 — burger refondu + Journal + ARCOVA déplacé |
| `6b9414e` | feat(home): C5 — coups de cœur unifiés Apimo + Off-Market |
| `b081591` | feat: C8 + C9 + C10 + C11 (partiel) |
| `661f5a2` | feat(public): C7 — fiches biens enrichies |

### Périmètre livré V3

**C1 Bug Server Components** ✅ — Server Actions retournent `ActionResult { ok, error }`, retry défensif si colonne manquante, message d'erreur clair côté UI.

**C2 /admin/properties vide** ✅ — Migration RLS `admin_rls_properties.sql` + recherche slug/titre/ville + filtre transaction + lien "Voir ↗" fiche publique.

**C3 Identité publique** ✅ — Composant `ContactButtons` (2 boutons révélant 2 contacts par catégorie : Julien principal, Frédéric/admin secondaires). Refactor : footer, ContactCTA, sidebar fiche bien. "Julien Brebion" → "Julien" partout sauf bio /qui-sommes-nous + mentions légales avec bloc Gérant Frédéric Mannis (FR/EN/DE).

**C4 Logo + Vidéo Hero + Burger** ✅ — Logo SVG officiel déjà en place. Vidéo Hero déjà branchée Supabase. Burger refondu : fond navy `#0d1419 / 0.97` + backdrop blur, texte centré gros Big Shoulders, sous-menus dépliables, ContactButtons + lang switcher en bas.

**C5 Coups de cœur unifiés** ✅ — `<CoupsDeCoeur />` (doublon) supprimé. `fetchHomeFeatured(6)` agrège properties (is_featured) + properties_offmarket (is_coup_de_coeur). `FeaturedCarousel` refondu en client component Embla + autoplay 4s + dots + boutons prev/next. Badge "Apimo" / "Off-Market" sur cards. Cards clicables vers /biens/[slug] ou /off-market/[id].

**C6 Header ARCOVA→Off-Market + Blog→Journal** ✅ — ARCOVA retiré du header desktop. Lien "Journal" ajouté. nav.blog = "Journal" dans les 3 locales + clé nav.journal. Route `/fr/journal` créée (alias éditorial premium de /blog). Route `/fr/off-market/arcova` créée. CTA "Accéder à ARCOVA →" sur `/off-market`.

**C7 Fiches biens enrichies** ✅ partiel — Biens similaires logique stricte (même type + prix ±15% + même pays, priorise même ville). Sidebar : Julien + ContactButtons, nouveau bloc CTA "Mandat de recherche" avec query params pré-remplissage, mini-simulateur financement intégré.

**C8 Frais notaire par pays** ✅ — `lib/legal-fees.ts` : LU/FR/BE/DE/PT/AE avec droits enregistrement, notaire %, frais hypothécaires, aides chiffrées avec conditions + sources officielles. Helpers `computeAcquisitionCosts` + `computeMaxAidsDeduction`.

**C9 Simulateur financement enrichi** ✅ — `lib/finance-sim.ts` (computeMortgage avec schéma amortissement échantillonné, fmtEur, taux par défaut par pays). Page `/fr/services/simulateurs/financement` complète : form 6 inputs + mensualité grande police + taux d'endettement (warn si >35%) + aides applicables avec liens sources + schéma amortissement + disclaimer. Composant `MiniFinanceSimulator` pour fiches biens (pré-rempli prix+pays, lien "Simuler en détail →").

**C10 Durée mandats** ✅ — `lib/mandates.ts` : "2 mois reconductibles" remplacé sur les 5 mandats par "À partir de 2 mois (recommandation MAPA), reconductible tacitement, résiliable avec préavis de 15 jours".

**C11 Analytics** ⚠️ partiel — `@vercel/analytics` installé, `<Analytics />` actif. Cloudflare déjà câblé (token à créer côté CF). Plausible + dashboard /admin/analytics + annonce RGPD footer reportés (BLOCKERS).

**C12 3 variantes blockbuster** ⏳ reporté (design system d'une journée minimum) — BLOCKERS.

