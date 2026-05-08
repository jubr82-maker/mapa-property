# MAPA Property

Site officiel — agence immobilière luxembourgeoise & broker international.
Construit par Julien Brebion avec Claude Code (Anthropic).

## Stratégie de déploiement (mai 2026)

- **`beta.mapaproperty.lu`** → cette codebase Next.js, déployée sur Vercel.
  Privée pendant la validation : `robots.txt` retourne `Disallow: /`,
  le sitemap est vide. À utiliser pour itérer en pré-prod.
- **`mapaproperty.lu`** → reste sur le site **v28 actuel en production**, intouché.
- La bascule du domaine principal vers cette nouvelle codebase se fera après
  validation complète de la beta. À ce moment-là, mettre à jour
  `NEXT_PUBLIC_SITE_URL=https://mapaproperty.lu` dans Vercel : `robots.ts` et
  `sitemap.ts` détectent automatiquement la chaîne `beta.` et basculent.

---

- Stack : Next.js 16 · TypeScript · Tailwind v4 · next-intl (FR/EN/DE) · Supabase · Vercel
- Domaine cible final : `mapaproperty.lu` (jamais `.com`)

## Développement

```bash
npm install
cp .env.example .env.local   # remplir avec les vraies valeurs
npm run dev
```

Ouvrir http://localhost:3000 — redirige vers `/fr` par défaut.

## Variables d'environnement

Voir `.env.example`. Comportements quand une clé est absente :

| Variable | Absente → comportement |
|---|---|
| `RESEND_API_KEY` | Leads INSERT Supabase only, pas d'email envoyé |
| `MISTRAL_API_KEY` | Chatbot Eléna utilise fallback heuristique |
| `GROQ_API_KEY` | Pas de fallback Mistral → Groq, message gracieux si Mistral KO |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Composant Turnstile no-op, validation serveur permissive |
| `TURNSTILE_SECRET_KEY` | Validation serveur skip (MVP-friendly) |

## Scripts

```bash
npm run dev      # serveur dev avec Turbopack
npm run build    # build production
npm run start    # serveur production (après build)
npm run lint     # ESLint strict
```

## Architecture

```
app/[locale]/          → routing i18n FR/EN/DE
  ├── biens/           → liste + fiche [slug]
  ├── off-market/      → liste + fiche [id] avec NDA
  ├── mandats/[type]/  → 5 mandats (exclusif/semi/simple/autonome/recherche)
  ├── services/        → vendre, acheter (redirect /biens), louer, estimer,
  │                      simulateurs, marches-actifs
  ├── qui-sommes-nous/ → storytelling
  ├── blog/            → liste + [slug] format livret swipable
  ├── contact/         → form général
  └── legal/           → mentions, cgu, cgv, rgpd, honoraires

app/api/               → routes serveur
  ├── lead             → POST INSERT Supabase + Resend (TODO)
  ├── chatbot          → POST Mistral + fallback Groq/heuristique
  ├── estimate         → POST modèle hédoniste + aides LU
  └── search-ia        → POST parse demande → filtres /biens

components/            → UI (server + client)
i18n/                  → routing/navigation/request next-intl
lib/                   → data (Supabase fetchers), seo, finance,
                        legal/{mentions,cgu,cgv,rgpd,honoraires},
                        rate-limit, mandates, markets, types, contrast
messages/{fr,en,de}    → ~280 clés par langue
```

## Données Supabase (lecture)

Tables existantes (v28, intouchées) :

- `properties` (16 biens publiés)
- `property_images` (187 photos)
- `properties_offmarket` (off-market avec galerie verrouillée)
- `reviews` (avis clients)
- `blog_posts` (articles avec FAQ JSONB par langue)
- `interest_rates` (dernière ligne BCL utilisée par simulateurs)

Écriture : `leads` uniquement (forms + auto-detection chatbot).

## Déploiement Vercel

1. Importer le repo GitHub dans Vercel
2. Framework preset : Next.js (auto-détecté)
3. Variables d'environnement : copier de `.env.local` (sauf clés vides)
4. Domain : `mapaproperty.lu` (DNS Cloudflare proxified vers Vercel)
5. Build command : `npm run build` (par défaut)
6. Output directory : `.next` (par défaut)

DNS Cloudflare devant Vercel pour :
- WAF (Bot Fight Mode + Rate Limiting Rules 60 req/min/IP)
- Turnstile (clés déjà configurées)
- Caching et anti-scraping

## Sécurité

- Headers : X-Frame, HSTS 2 ans, Permissions-Policy, X-Robots-Tag noai
- Rate limit IP-based : `/api/lead` 5/min, `/api/chatbot` 30/min
- Turnstile sur tous formulaires
- Validation côté client + serveur
- Source maps désactivées en prod

## Licence

© 2026 MAPA Synergy Sàrl. Tous droits réservés. Reproduction interdite.
