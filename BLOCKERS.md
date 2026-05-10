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
