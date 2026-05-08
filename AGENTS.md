<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16 — breaking changes vs training data

- Convention `proxy.ts` à la racine remplace `middleware.ts`
- `params` et `searchParams` sont async (Promise) dans pages dynamiques
- `next/font/google` : `Big_Shoulders` (consolidé), pas `Big_Shoulders_Display`

Lire `node_modules/next/dist/docs/` pour les détails. Respecter les deprecations.
<!-- END:nextjs-agent-rules -->

# MAPA Property — règles projet

## Stratégie de déploiement (mai 2026)

- `beta.mapaproperty.lu` → cette codebase Next.js (Vercel staging, robots disallow, sitemap vide).
- `mapaproperty.lu` → site v28 en production actuelle, **intouché** — ne pas déployer dessus.
- Bascule planifiée après validation beta. `robots.ts` et `sitemap.ts` détectent `beta.` dans `NEXT_PUBLIC_SITE_URL` et basculent automatiquement.

## Conventions inviolables

- Domaine : `mapaproperty.lu` — JAMAIS `.com`
- "Dudelange" et numéros AE/RCS/TVA : UNIQUEMENT dans `app/[locale]/legal/mentions-legales/page.tsx`. Partout ailleurs, écrire "Luxembourg".
- Toutes les chaînes UI passent par `next-intl` — jamais en dur dans les composants.
- Tailwind v4 : couleurs via variables CSS (`bg-bg`, `text-ink`, `text-gold`, etc.) — jamais d'hexa en dur.
- Server Components par défaut. `'use client'` uniquement si hooks/state/events.
- Pas d'emoji dans l'UI.

## Stack

- Next.js 16.2.6 + React 19.2.4 + Tailwind v4 + TypeScript strict
- next-intl 4 (routes `/fr`, `/en`, `/de`)
- next-themes (light/dark via classe `.dark`)
- Supabase JS v2 (lecture 6 tables, écriture `leads` uniquement)
- Vercel + Cloudflare (WAF, Turnstile, DNS)

## Données Supabase intouchées

Tables : `properties`, `property_images`, `properties_offmarket`, `reviews`, `blog_posts`, `interest_rates`. Écriture autorisée uniquement sur `leads`. Schema dans `MAPA_BRIEF_CLAUDE_CODE.md`.

## Variables d'environnement

Cf. `.env.example`. Si une clé est absente, le code dégrade gracieusement (cf. README). Ne jamais throw si une clé manque.

## Comportements documentés

- `lib/data.ts` : tous les fetchers Supabase loggent `console.error` et retournent `[]` ou `null` plutôt que de throw.
- `lib/use-favorites.ts` : localStorage avec event `mapa-favorites-change` pour sync inter-onglets.
- `app/api/lead/route.ts` : Turnstile verify si `TURNSTILE_SECRET_KEY` présent, sinon skip. Resend si `RESEND_API_KEY` présent, sinon INSERT Supabase only.
- `app/api/chatbot/route.ts` : Mistral → Groq → fallback heuristique, dans cet ordre.
- Auto-lead chatbot : si email/phone détecté dans la conversation, INSERT silencieux dans `leads`.
