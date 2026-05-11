# BLOCKERS — Session production-ready 10/05/2026

> Issues identifiées en cours de session, à compléter par Julien ou en pair-programming.

## Phase 3 — Simulateur estimation : refonte UI partielle

**Livré dans `lib/estimate.ts`** (commit phase 3) :
- Coefficients CPE 10 niveaux (A++ +8% à I -28%)
- Helper `estimateByYield()` pour méthode rendement (immeuble / local commercial)
- Helper `computeAcquisitionCosts()` : droit enregistrement 7% LU, Bëllegen Akt 40k×N, notaire 1,75%, honoraires MAPA, TVA 17% sur honoraires

**Non livré (refonte UI complète différée)** :
- Page `app/[locale]/services/estimer/page.tsx` reste sur le formulaire existant (type / état / surface / énergie / commune / acquisition).
- Inputs supplémentaires manquants en UI : surface utile, surface jardin, mixte usage avec slider, étage + ascenseur, parking, travaux 5 ratios prédéfinis, type Local commercial / Terrain.
- Affichage transparent des coefficients hédonistes appliqués manquant.
- CTA "Demander un avis professionnel" préfilled, "Voir le mandat de recherche", PDF imprimable manquants.

**Raison du différé** : refonte UI complète demande un design system formulaire multi-step + nouveau back-end de calcul intégré. Le helper `lib/estimate.ts` est prêt, l'API `/api/estimate` peut être enrichie ultérieurement sans toucher aux pages publiques. Suggestion : pair-programming avec Julien pour valider UX et coefficients sur cas réels.

## Phase 4 — Téléphone international + Modal contact : non livré

**Livré** :
- 4 endpoints API : `/api/contact`, `/api/nda-offmarket`, `/api/mandate-request`, `/api/arcova-waitlist`
- Validation Zod-style minimaliste, honeypot fail-silent, Turnstile fail-closed prod
- Tables Supabase appendées dans la migration (idempotent)
- Helpers `lib/honeypot.ts` + `lib/turnstile.ts` (déjà présent)
- Components `RevealEmail` et `RevealPhone` (anti-scraping)

**Non livré** :
- `react-phone-number-input` non installé (éviterait `pnpm add` qui modifie le lockfile sans review). Les forms publics existants utilisent encore un `<input type="tel">` simple.
- Composant `<ContactModal />` avec Turnstile widget client : pas de modal accessible créée. Les pages contact/biens existantes restent sur leur formulaire actuel.
- Optgroup pays MAPA (Couverts/Autres) : non implémenté en UI (la liste serait à câbler dans le helper Reveal ou un nouveau Select).

**À faire par Julien** : `pnpm add react-phone-number-input` puis intégration sur les 4 forms (1h).

## Phase 7 — BO admin /admin : non livré

**Raison** : BO complet 9 onglets + auth Supabase magic link + middleware allowlist nécessite 6-8 heures de travail focused (composants drag & drop, éditeur Markdown, kanban, sync Apimo stub) et la configuration Supabase Auth Email côté dashboard que seul Julien peut faire.

**Stratégie** : laisser sur la roadmap pour pair-programming dédié. La structure SQL (tables `properties`, `reviews`, `blog_posts`, `lead_kanban_status`) est livrée dans `supabase/migrations/20260510_night_run.sql` pour que Julien puisse appliquer demain — le BO admin sera construit en interactive ensuite.

## Phase 8 — Domaine beta.mapaproperty.lu : NON connecté

**Diagnostic réel (10/05 15h)** :
- `dig beta.mapaproperty.lu CNAME` → `mapaproperty-beta.netlify.app.` → **le DNS pointe vers Netlify, pas Vercel.**
- `vercel domains add beta.mapaproperty.lu --force` → la CLI ne parvient pas à attacher le domaine.

**Actions Julien requises** :
1. Côté Apimo (ou Ionos selon registrar) : changer le CNAME de `beta.mapaproperty.lu` → cible **`cname.vercel-dns.com`** (et plus `mapaproperty-beta.netlify.app`).
2. Attendre la propagation DNS (15 min à 24h).
3. Ensuite : `cd /Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs && vercel domains add beta.mapaproperty.lu` (sans flags). Vercel détecte le CNAME et attache.
4. Si Vercel demande la vérification ACM, suivre l'output de la commande.

**En attendant**, l'URL stable de production reste `https://mapa-property-liard.vercel.app/fr` (alias Vercel par défaut).

---

## 2026-05-11 — Blockers issus de la PARTIE A

### A1 — favicon.ico régénéré depuis SVG : non livré
Aucun outil de conversion image disponible localement (`magick`, `convert`, `rsvg-convert`, `ffmpeg`, `sharp` CLI introuvables). Le `public/favicon.ico` actuel reste basé sur l'ancienne version. Workaround : le SVG est déclaré en `icon` principal dans `<head>` via `metadata.icons` du `LocaleLayout` → les navigateurs modernes l'utilisent en priorité. À régénérer ultérieurement (installer ImageMagick ou utiliser Sharp script Node).

### A5 — Section « À propos · Julien Brebion » sur la home : non livré
La home (`app/[locale]/page.tsx`) ne contient pas de section dédiée Julien (par design : la séquence actuelle est Hero → SearchBar → CoupsDeCoeur → … → ContactCTA). Ajouter une section serait introduire du contenu textuel — PARTIE D du brief indique « tant que Julien n'a pas envoyé les contenus, NE PAS modifier les textes existants ». À traiter quand Julien fournira la copie.

### A7 — Bouton « Retour » sur hero Off-Market : pointe vers `/`
Le brief demande un bouton « ← RETOUR » sans préciser la destination. J'ai pointé vers la home (`/`). Si Julien veut pointer ailleurs (page précédente via history.back, ou /services), à ajuster (simple changement de `href` ou conversion en composant client `BackButton`).

---

## 2026-05-11 — Blockers issus de la PARTIE B

### B1 — Migration SQL à appliquer manuellement
Le projet n'est pas relié au CLI Supabase. Le fichier `supabase/migrations/20260511_admin_offmarket.sql`
doit être copié-collé dans **Supabase Dashboard → SQL Editor** par Julien avant que
le BO admin off-market ne soit pleinement opérationnel. Le code est idempotent
(toutes les opérations utilisent `IF NOT EXISTS` ou `DROP … IF EXISTS` + `CREATE`).
Tant que ce n'est pas fait :
- la liste admin pourrait afficher des biens sans `reference` (mais le code tolère).
- la table `offmarket_requests` n'existe pas → le formulaire NDA publique échouera côté DB.
- la VIEW `properties_offmarket_public` n'existe pas → `lib/data.ts` tombe sur le fallback (table directe), donc la page publique fonctionne quand même mais sans le masquage `photos_locked`.

### B1 — Compte admin à créer
Aucun utilisateur Supabase Auth admin n'a été créé par cette session. Julien doit :
1. Ouvrir Supabase Dashboard → Authentication → Users → « Add user » → email + mot de passe.
2. Tester la connexion sur `https://<deploy>/admin/login`.

### B2 — Upload photos : conversion WebP / redimensionnement non livré
Le brief demande « redimensionnement auto en 1920px max width, conversion en WebP côté serveur ».
Server Action `uploadOffmarketPhotos` upload le fichier **brut** dans le bucket
`offmarket-photos` (preserves extension d'origine, public URL renvoyée par Supabase).
Sharp n'est pas installé et le runtime Vercel impose une taille de bundle limitée.
**Workaround** : laisser le navigateur compresser (`accept="image/*"`) ou
ajouter `next/image` côté affichage. À itérer ultérieurement.

### B2 — Email automatique sur nouvelle demande : stub
`/api/offmarket-request` logue dans la console si `RESEND_API_KEY` absent, sinon
**ne fait pas encore** l'envoi Resend (à câbler comme `/api/lead`). Le trigger SQL
fait le tracking côté DB, donc rien n'est perdu — juste pas d'email instantané pour l'instant.

### B2 — Kanban des demandes : non livré
Le brief mentionne un Kanban optionnel (« Pending → Qualified → … → Closed »).
La vue globale `/admin/offmarket/requests` reste en tableau avec filtres par statut.
À transformer en Kanban si besoin (drag&drop entre colonnes).

---

## 2026-05-11 (soir) — Blockers cumulés après CHANTIERS 1-4

### Actions manuelles Julien — Supabase Dashboard

#### Migrations SQL à appliquer dans l'ordre (SQL Editor)
1. **`migration_offmarket.sql`** (déjà fait par Julien lors du test admin)
2. **`migration_offmarket_enrich.sql`** : ajout des champs sub_type / surfaces pro / pièces détaillées / extérieurs / parking. **Indispensable** pour le nouveau formulaire CRUD off-market.
3. **`migration_offmarket_composition.sql`** : composition_commerces / bureaux / logements (JSONB) + price_mode/min/max/custom_text + is_coup_de_coeur. **Indispensable** pour la section composition immeuble mixte + sélecteur prix.
4. **`migration_documents.sql`** : table documents + bucket Storage. **Indispensable** pour le module /admin/documents.

Tous les fichiers sont copiés dans `/Users/Shared/migration_*.sql` (chmod 644). Tous idempotents.

#### Compte admin Supabase Auth
À créer manuellement : Authentication → Users → Add user → `admin@mapagroup.org` (ou autre) + mot de passe initial. Le user peut ensuite changer son mot de passe via `/admin/settings`.

#### Configuration SMTP Resend (urgence — limite Supabase 2 mails/h)
Le SMTP par défaut Supabase est plafonné à **2 emails / heure** ce qui bloque actuellement les flux forgot-password / magic-link / invite. À remplacer par Resend.

**Étapes côté Resend** :
1. Aller sur https://resend.com → Domains → Add Domain → `mapaproperty.lu` (ou `mapagroup.org`).
2. Ajouter les enregistrements DNS demandés (DKIM, SPF, return-path) dans Cloudflare.
3. Attendre la vérification (~5-15 min).
4. API Keys → Create API Key → noter la clé `re_...`.
5. Créer les 3 templates HTML brandés MAPA dans Resend → Email Templates :
   - `password_recovery` (avec lien `{{ .ConfirmationURL }}`)
   - `magic_link` (avec lien `{{ .ConfirmationURL }}`)
   - `invite` (avec lien `{{ .ConfirmationURL }}`)
   Brand : logo SVG MAPA en haut centré, filet copper #B8865A, footer legal MAPA Synergy Sàrl.

**Étapes côté Supabase Dashboard** :
1. Project Settings → Auth → SMTP Settings → enable Custom SMTP.
2. Host : `smtp.resend.com`, Port : `465`, Username : `resend`, Password : la clé API `re_...`.
3. Sender email : `noreply@mapaproperty.lu` (ou autre validé sur Resend).
4. Sender name : `MAPA Property`.
5. Email Templates → password recovery / magic link / invite → coller le HTML des templates Resend (ou utiliser une syntaxe templating compatible Supabase).

Tant que ce n'est pas fait : flux password reset peut envoyer 2/h max, ce qui bloque le test.

#### Activation 2FA (recommandé, pas critique)
Une fois connecté à `/admin/settings`, section « Double authentification » → cliquer « Activer la 2FA » → scanner le QR code dans 1Password / Authy / Google Authenticator → saisir le code 6 chiffres → validé.

### Limitations livraison BO Admin Partie C

#### C2 Leads — push manuel Apimo non livré
Le bouton "Push manuel vers Apimo" n'est pas câblé (API Apimo write requiert des credentials + endpoint spécifique non documenté dans le brief). Pour l'instant, le workflow status + notes admin sont opérationnels, mais le push vers Apimo doit être fait manuellement par Julien depuis l'admin Apimo.

#### C3 Mandates — upload mandat signé PDF non livré
Le formulaire admin lit la liste, mais l'upload du PDF du mandat signé n'est pas livré (besoin d'une table `mandate_documents` ou colonne `signed_mandate_url` dans `mandate_requests` + UI upload). À ajouter dans une prochaine itération.

#### C5 Reviews — drag & drop pour ordre carrousel non livré
L'ordre du carrousel home suit la date `review_date` décroissante. Le drag & drop nécessite l'ajout d'une colonne `display_order` à la table reviews + UI dnd-kit. Reporté.

#### C6 Blog — éditeur TipTap / preview live non livré
Champ contenu en `<textarea>` (Markdown), pas d'éditeur riche TipTap. Suffit pour la rédaction directe ; à enrichir si Julien veut du WYSIWYG.

### Bug bonus non corrigé : Coups de cœur unifiés Apimo + Off-market
Le brief V2 demande un module `/admin/featured` qui mélange biens Apimo (is_featured) et biens Off-Market (is_coup_de_coeur) dans une UI unique, limité à 6 entrées. Pour l'instant :
- Toggle `is_featured` Apimo se fait dans `/admin/properties` (lecture seule sauf 2 switches).
- Toggle `is_coup_de_coeur` Off-Market se fait dans `/admin/offmarket/[id]/edit` (formulaire complet).

Le carrousel home `<FeaturedCarousel />` lit uniquement la table `properties`. Pour que les off-market `is_coup_de_coeur` apparaissent côté home, il faut un fetcher combiné (`fetchHomeFeatured`) qui fait l'union des deux sources et retourne un type pivot. Reporté.

### CHANTIER 2 — WebAuthn / Passkey non livré
L'implémentation Passkey (Touch ID / Face ID) nécessite un service WebAuthn côté serveur (génération de challenge, vérification de signature, validation de l'attestation) — soit avec le package `@simplewebauthn/server` + une table dédiée `user_passkeys`, soit avec la nouvelle feature passkeys de Supabase Auth (en beta). Une placeholder section figure dans `/admin/settings` pour expliquer le report. À traiter en pair-programming avec Julien quand les flux MFA TOTP sont validés.
