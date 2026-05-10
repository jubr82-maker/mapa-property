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

## Phase 7 — BO admin /admin : non livré

**Raison** : BO complet 9 onglets + auth Supabase magic link + middleware allowlist nécessite 6-8 heures de travail focused (composants drag & drop, éditeur Markdown, kanban, sync Apimo stub) et la configuration Supabase Auth Email côté dashboard que seul Julien peut faire.

**Stratégie** : laisser sur la roadmap pour pair-programming dédié. La structure SQL (tables `properties`, `reviews`, `blog_posts`, `lead_kanban_status`) est livrée dans `supabase/migrations/20260510_night_run.sql` pour que Julien puisse appliquer demain — le BO admin sera construit en interactive ensuite.

## Phase 8 — Domaine beta.mapaproperty.lu

**À vérifier** : statut DNS et propagation côté Apimo/Ionos. La commande `vercel domains add` peut échouer si le CNAME n'est pas pointé sur `cname.vercel-dns.com`. Si problème, Julien gère côté dashboard Apimo.
