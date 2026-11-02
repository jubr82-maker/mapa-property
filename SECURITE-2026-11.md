# Securite Next.js, novembre 2026

Correctif des failles Next.js annoncees le 14/10/2026 (RCE sans authentification
dans "use cache" et dans l'optimisation d'images SVG, deni de service via les
Server Actions), plus la faille critique de @sentry/nextjs. Aucun changement de
code, de design, de contenu, de base ni de variables d'environnement.

## Journal de la session (01-02/11/2026)

### Etat des lieux
- Projet a un seul package.json (pas de monorepo, pas de pnpm-workspace.yaml ni
  de turbo.json).
- Avant : next 16.3.7, eslint-config-next 16.3.7, react et react-dom 19.2.4,
  @sentry/nextjs ^10.53.0 (10.53.0 installe), sharp 0.35.5 (une seule version).
- pnpm audit avant : 3 critiques, 45 hautes, 41 moderees, 8 basses.
  Critiques : next GHSA-673q-mjm6-r5xr (use cache), next GHSA-2464-fhr4-w9xw
  (images SVG), @sentry/nextjs GHSA-mchm-gjx6-7h55 (route tunnel).

### Sauvegardes
- Travail de design en cours (11 fichiers modifies, 3 elements non suivis,
  soit 15 fichiers) copie a l'identique (controle cmp) dans
  ~/Backups-MAPA/travail-en-cours-2026-11-01-2016/, liste dans
  ~/Backups-MAPA/travail-en-cours-2026-11-01-2016.liste.txt.
- Puis git stash push -u -m "design en cours avant securite nextjs" sur
  refonte-design-mai-2026 (stash@{0}).
- Bundle complet, cree apres le stash (contient refs/stash) :
  ~/Backups-MAPA/mapa-property-2026-11-01-avant-securite-nextjs.bundle,
  git bundle verify : okay.
- Commit de depart de la session : ed3bede (refonte-design-mai-2026).

### Point de depart = code en production
- mapaproperty.lu et www.mapaproperty.lu sont servis par le deploiement de
  production dpl_2kvpJYUA9Wik9moBG7UFnev2gkq9 (cree le 25/10/2026 a 21:38:59),
  projet Vercel mapa-property-nextjs. Aucun deploiement de production depuis.
- vercel inspect n'affiche ni commit git ni indicateur dirty pour ce
  deploiement. Le lien avec le commit est deduit (supposition) : tag
  mise-en-ligne-localites-2026-10-25 = 6803e08, commit du 25/10/2026 21:33:50,
  5 minutes avant le deploiement ; aucun tag de mise en ligne posterieur.
- beta.mapaproperty.lu n'existe pas dans Vercel (AGENTS.md a corriger plus
  tard sur ce point).
- 6803e08 n'est pas un ancetre de refonte-design-mai-2026 : les deux lignes
  divergent depuis 81b8440 (07/10/2026). Les 4 commits de design du 08/10
  (dcef592, df6241d, 4b94e73, 9bcaa3f) ne sont pas en production ; ed3bede est
  deja en production sous la forme de 193c7d5.
- Branche securite-nextjs-2026-11 creee depuis 6803e08.

### Mise a jour (versions exactes)
- next 16.4.3, eslint-config-next 16.4.3, react et react-dom 19.2.9,
  @sentry/nextjs 10.76.2. sharp inchange : 0.35.5, une seule version
  (next 16.4.3 demande ^0.35.5).
- Fichiers modifies : package.json et pnpm-lock.yaml uniquement.
- pnpm a ecrit "^10.76.2" pour Sentry malgre --save-exact : corrige a la main
  en "10.76.2" dans package.json et dans le specifier du lockfile (ligne 27),
  sans reinstallation. Specifiers package.json = lockfile verifies.
- pnpm audit apres : 0 critique, 43 hautes, 28 moderees, 7 basses. Plus aucune
  faille sur next, react, react-dom, sharp, Sentry ni eslint-config-next.
  Restent (hors perimetre) : @grpc/grpc-js, @tiptap/core, adm-zip,
  brace-expansion, browserslist, fast-uri, js-yaml, nanoid, postcss,
  prosemirror-view, protobufjs, source-map-js, zod (hautes) ; glob, minimatch,
  nodemailer, sanitize-html, uuid, baseline-browser-mapping (moderees) ; etc.

### Verifications sur le Mac (build webpack : npx next build --webpack)
| Controle | Avant (6803e08) | Apres |
|---|---|---|
| build | 0 | 0 |
| tsc --noEmit | 0 | 0 |
| test:engine | 16/16 | 16/16 |
| test:types | 0 | 0 |
| test:geo | 0 | 0 |
| test:security | 749/749 | 749/749 |
| test:seo | 19 ok, 4 echecs | memes 19 ok, memes 4 echecs |

Echecs seo deja presents en production (identiques avant et apres, memes
pages, memes messages) :
1. redirects.spec.ts:77 : /fr, /en, /de/cette-page-n-existe-pas renvoient 404
   sans le contenu attendu (recherche et liens).
2. redirects.spec.ts:164 : /fr/biens non rendue (598).
3. redirects.spec.ts:208 : /fr/services/simulateurs/financement et
   /fr/services/capacite-emprunt non rendues (598).
4. seo-onpage.spec.ts:105 : delai de 30 minutes depasse.
Le statut 598 correspond a "base de donnees injoignable" pendant le test
(supposition : les echecs 2 a 4 viennent de la base, pas du code).

Le build Turbopack local echoue ("binding to a port, Operation not
permitted") : restriction de l'environnement local, pas du code. La preuve
Turbopack est le deploiement d'apercu Vercel, construit a distance.

### Apercu Vercel
- Decision de Julien (securite) : SUPABASE_SERVICE_ROLE_KEY est volontairement
  absente de l'environnement Preview de Vercel. L'admin ne sera donc pas
  verifie sur l'apercu : il sera verifie en local.

## A faire plus tard (hors de cette branche)
- Option B Sentry : retrait complet sur une branche a part. Sentry n'est
  branche nulle part (3 fichiers sentry.*.config.ts entierement commentes,
  withSentryConfig applique seulement si SENTRY_AUTH_TOKEN existe, aucune
  tunnelRoute, aucun import dans le code). A retirer : la dependance, les 3
  fichiers, l'import et le bloc conditionnel de next.config.ts, les 3 lignes
  SENTRY_* de .env.example. Verifier avant qu'aucune variable SENTRY_* n'existe
  dans Vercel.
- Corriger AGENTS.md : beta.mapaproperty.lu n'existe pas ; mapaproperty.lu est
  servi par ce projet Next.js.
- Page 404 : contenu attendu par le test seo absent (deja en production).
- Failles hautes restantes de l'audit, a traiter paquet par paquet.

## Lecon simple
Avant une mise a jour de securite, partir du code reellement en production
(tag de mise en ligne), mettre de cote le travail en cours avec une copie
controlee, et mesurer les tests avant et apres avec la meme methode de build :
c'est la seule facon de prouver qu'un echec est ancien et non une regression.
