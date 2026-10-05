# Audit de securite complet : rapport (5 octobre 2026)

Referentiel : OWASP Top 10 2021 et OWASP ASVS 4.0.3 niveau 2.
Fichiers generes : `inventaire.json`, `matrice.csv`, `matrice-resume.md` (par `pnpm audit:security`).
Tests permanents : `pnpm test:security` (apres `npx next build --webpack`).

## 1. Inventaire (354 elements)

| Categorie | Nombre | Regle de recherche |
|---|---|---|
| Pages et gabarits | 76 | app/**/page.tsx et layout.tsx |
| Routes API et intercepteur | 45 | 42 route.ts + robots.ts + sitemap.ts + proxy.ts |
| Actions serveur | 60 | fonctions exportees des 12 fichiers "use server" |
| Base de donnees | 52 | tables, vue, 8 fonctions, 8 declencheurs (migrations + code) |
| Stockage | 8 | 6 buckets Supabase + 2 buckets R2 |
| Saisies des visiteurs | 8 | composants hors admin qui postent vers /api |
| Envois de fichiers | 3 | formData.get("file") dans app |
| Variables d'environnement | 51 | process.env.NOM |
| Services tiers | 14 | fetch serveur, SDK, directives CSP |
| En-tetes et CSP | 24 | next.config.ts + proxy.ts |
| Cookies | 7 | code + bibliotheques + fournisseurs |
| E-mails | 6 | sendMail + e-mails Supabase Auth |

Matrice : 354 lignes x 12 questions = 4248 cases. Lignes = inventaire (verifie par le script, sortie en erreur sinon).

## 2. Failles corrigees dans le code

| Gravite | Faille | Exigence | Correction |
|---|---|---|---|
| Haute | 5 routes admin (analytics cloudflare, ga4, vercel ; performance psi, sentry) acceptaient une session sans second facteur (/api hors du proxy) | ASVS 4.1.1, 2.2.1 ; A01 | garde commune requireAdminRoute (aal2) |
| Haute | Taches planifiees : "Bearer undefined" accepte si CRON_SECRET absent (synchro Apimo en service_role) | ASVS 4.1.1, 2.10.4 ; A07 | lib/security/cron-auth.ts, comparaison a temps constant |
| Haute | Blog : HTML de la base injecte sans assainissement | ASVS 5.2.1 ; A03 | sanitizeArticleHtml |
| Haute | JSON-LD : "</script>" non echappe | ASVS 5.3.3 ; A03 | serializeJsonLd |
| Haute | /api/estimate : aucune limite ni anti-robots, e-mail vers toute adresse (relais de spam, couts) | ASVS 11.1.4 ; A04 | limite par IP + Turnstile (cle presente) |
| Moyenne | Chatbot : messages illimites et role "system" accepte du visiteur (cout Mistral, injection d'invite) | ASVS 5.1.3, 11.1.4 ; A04 | roles user/assistant, 20 messages, 2000 caracteres |
| Moyenne | Chatbot : redirection ouverte ("//domaine") | ASVS 5.1.5 ; A01 | safeInternalPath serveur et client |
| Moyenne | Surcharges CSS du CMS injectees sans controle | ASVS 5.3.x ; A03 | sanitizeCssColorOverrides |
| Moyenne | Documents admin : ni type ni taille verifies ; video : type declare seulement | ASVS 12.1.1, 12.2.1 ; A04 | type par signature, 20 Mo, nom genere |
| Moyenne | Preversions Vercel : e-mails reels aux visiteurs | ASVS 14.1.x ; A05 | destinataires internes seulement si VERCEL_ENV=preview |
| Basse | En-tetes d'e-mail : retours a la ligne non retires | ASVS 5.2.x ; A03 | stripHeaderBreaks |
| Basse | track-view, search-ia : entrees non bornees, aucune limite | ASVS 5.1.3, 11.1.4 | bornes + limite par IP |
| Basse | Details d'erreurs de base renvoyes (7 routes) | ASVS 7.4.1 ; A05 | codes generiques, detail dans les journaux |
| Basse | CSP sans frame-ancestors | ASVS 14.4.7 ; A05 | frame-ancestors 'self' |
| Basse | api.qrserver.com autorise en connect-src sans usage | ASVS 14.4.x | retire |

## 3. Failles ouvertes (43 cases)

- 22 : duree de conservation des donnees personnelles (ASVS 8.3.4) : decision metier (bloc F propose).
- 8 : search_path des fonctions (ASVS 14.2) : bloc D pret.
- 8 : ecriture par tout compte connecte (lu_market_prices, ventes historiques, buckets documents et offmarket-photos) : bloc A pret depuis la mission precedente.
- 1 : is_mapa_admin sans aal2 : bloc B, apres inscription des deux seconds facteurs.
- 1 : bucket documents en lecture publique (ASVS 12.4.1) : bloc E, accord requis.
- 1 : CSP script-src 'unsafe-inline' 'unsafe-eval' (ASVS 14.4.3) : CSP a nonce, accord requis.
- 2 : cookie de session Supabase lisible par JavaScript (ASVS 3.4.2) : choix d'architecture @supabase/ssr, accord requis.

## 4. Fichiers SQL (non executes)

- `supabase/manual/20261005_audit_regles_acces.sql` : lecture seule.
- `supabase/manual/20261005_correction_regles_acces.sql` : blocs A, B, C.
- `supabase/manual/20261005_audit_securite_corrections.sql` : blocs D (search_path), E (bucket prive, accord), F (purge, accord).

## 5. Dependances

`pnpm audit --prod` puis `pnpm audit`, puis `pnpm outdated`. Non execute ici (aucun reseau).
