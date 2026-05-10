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
