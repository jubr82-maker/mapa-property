# BLOCKERS — Session production-ready MAPA Property

> Mise à jour : 2026-05-11 (soir, après brief V3)
> Liste exhaustive des actions manuelles Julien + reports techniques.

---

## ⚙️ Actions manuelles Julien — Supabase Dashboard

### Migrations SQL à appliquer dans l'ordre via SQL Editor

| Fichier | Rôle | Statut |
|---------|------|--------|
| `migration_offmarket.sql` | Schema initial off-market admin (BO Partie B) | ✅ déjà appliquée |
| `migration_offmarket_enrich.sql` | Sub_type + surfaces pro + pièces + extérieurs + parking | ⏳ à appliquer |
| `migration_offmarket_composition.sql` | Composition immeuble JSONB + price_mode + is_coup_de_coeur | ⏳ à appliquer |
| `migration_documents.sql` | Table documents + bucket Storage | ⏳ à appliquer |
| `migration_admin_rls_properties.sql` | Policies admin read+update sur `properties` (corrige /admin/properties vide) | ⏳ à appliquer |

Toutes copiées dans `/Users/Shared/migration_*.sql` (chmod 644). Toutes idempotentes (rejouables sans risque).

### Compte admin Supabase Auth
Authentication → Users → Add user → email + mot de passe.
**Note** : si `admin@mapagroup.org` existe déjà, possibilité de reset password via `/admin/forgot-password`.

### Configuration SMTP Resend (urgence, plafond 2 mails/h Supabase actuel)
Procédure complète :

**1. Côté Resend** (https://resend.com)
- Domains → Add Domain → `mapaproperty.lu` (ou `mapagroup.org`).
- Ajouter DNS DKIM/SPF/return-path dans Cloudflare.
- Attendre vérification (~10 min).
- API Keys → Create → noter `re_...`.
- Email Templates → créer 3 templates HTML brandés MAPA :
  - `password_recovery` (variable `{{ .ConfirmationURL }}`)
  - `magic_link` (variable `{{ .ConfirmationURL }}`)
  - `invite` (variable `{{ .ConfirmationURL }}`)
  - Brand : logo SVG MAPA en haut centré, filet copper #B8865A, footer legal MAPA Synergy Sàrl.

**2. Côté Supabase Dashboard**
- Project Settings → Auth → SMTP Settings → Enable Custom SMTP.
- Host : `smtp.resend.com`, Port : `465`, Username : `resend`, Password : `re_...`.
- Sender email : `noreply@mapaproperty.lu` (validé sur Resend).
- Sender name : `MAPA Property`.
- Email Templates → coller le HTML des templates Resend.

### Activation 2FA TOTP (recommandé, pas critique)
Une fois loggé, `/admin/settings` → « Activer la 2FA » → scanner QR code → valider 6 chiffres.

### Création tokens Analytics

**Cloudflare Web Analytics** :
- dashboard.cloudflare.com → Analytics & Logs → Web Analytics → Add a site.
- Renseigner `mapaproperty.lu`.
- Noter le `token` JS reçu.
- Vercel Project Settings → Environment Variables → `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` = ce token.
- Redéploiement automatique.

**Plausible** (optionnel, peut être différé) :
- Plausible.io : créer compte ($9/mois), add site `mapaproperty.lu`, récupérer script.
- Ou self-host : Docker compose sur Supabase Database à part. Documenté dans `https://plausible.io/docs/self-hosting`.
- Script à ajouter dans `app/[locale]/layout.tsx` avec `data-domain="mapaproperty.lu"`.

### Vidéos biens (CHANTIER 7 partie 2)
La vidéo par bien est déjà supportée techniquement via le champ `video_url`
sur la table `properties` et `properties_offmarket` (déjà présents). Le
composant `PropertyGallery` rend les vidéos en player HTML5. **Action manuelle** :
Julien uploade les vidéos dans Supabase Storage bucket `videos` puis renseigne
l'URL publique dans le champ `video_url` côté admin off-market (champ à
ajouter au formulaire si pas encore visible — voir CHANTIER 12 V4).

---

## 🚧 Limitations livraison V3

### C1 — Fix bug Server Components encart rouge
- **Cause racine identifiée** : Server Actions throw une erreur Postgres (colonne manquante car migration enrich pas encore appliquée). En prod Next masque en digest opaque.
- **Fix appliqué** : Server Actions retournent désormais `ActionResult { ok, error }`. Helper `insertWithRetry` / `updateWithRetry` retire les colonnes optionnelles manquantes et réessaie.
- **Action restante** : appliquer migration_offmarket_enrich.sql + migration_offmarket_composition.sql pour que TOUS les champs soient persistés correctement.

### C2 — /admin/properties vide
- **Cause** : RLS public.properties restrictive (lecture publique uniquement is_published=true).
- **Fix** : migration `migration_admin_rls_properties.sql` ajoute policies admin. Page log l'erreur + bannière visible si migration pas appliquée.

### C7 — Carrousel photos auto + lightbox
Le composant `PropertyGallery` existant gère déjà un carrousel fonctionnel. L'autoplay 4s + lightbox avancée (zoom, fullscreen) n'a pas été refactoré dans cette session pour ne pas casser le rendu existant. Embla est déjà installé pour FeaturedCarousel home — il peut être étendu à PropertyGallery dans une itération suivante.

### C9 — Cron taux officiels BCL / BdF / BNB / Bundesbank
- Endpoint `app/api/cron/refresh-rates/route.ts` non livré dans cette session.
- Les taux par défaut sont dans `DEFAULT_RATES_BY_COUNTRY` (lib/finance-sim.ts) — à mettre à jour manuellement.
- Beaucoup des sites cibles ont des robots.txt restrictifs ou des pages dynamiques JS-only qui interdisent le scraping simple. La voie propre serait :
  - **BCL** : feed XML statistiques mensuelles (à vérifier disponibilité)
  - **Banque de France** : API webstat (limites quota)
  - **BNB** : pas d'API publique, scraping bcl.lu uniquement
  - **Bundesbank** : SDMX (compatible OECD)
- À traiter en pair-programming après livraison V4.

### C11 — Analytics stack triple
- **Vercel Analytics** : ✅ installé et actif (`<Analytics />` dans layout, aucun token).
- **Cloudflare Web Analytics** : ✅ déjà câblé via `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` (le token reste à créer).
- **Plausible** : ⏳ non livré (besoin compte ou self-host).
- **Dashboard unifié /admin/analytics** : ⏳ non livré (besoin APIs des 3 sources).
- **Annonce RGPD discrète footer** : ⏳ à ajouter ("Nous mesurons l'audience de manière anonyme. [En savoir plus]" → /fr/politique-de-confidentialite).

### C12 — 3 variantes blockbuster fiches biens
- **Non livré dans cette session** — c'est un chantier de design system d'une journée minimum.
- La variante actuelle correspond à l'esprit "Magazine" du brief mais sans hero plein écran.
- À traiter en V4 avec un design system component "PropertyPage" qui accepte un `layout` prop ("magazine" | "cinema" | "gallery") et un toggle dans `/admin/settings`.

### WebAuthn / Passkey (CHANTIER 2 V2)
Toujours différé — nécessite un service WebAuthn côté serveur (`@simplewebauthn/server` + table `user_passkeys`). Placeholder informatif dans `/admin/settings`.

### Drag & drop ordre carrousel reviews
Tri toujours par `review_date` DESC. Nécessite l'ajout d'une colonne `display_order` à la table reviews + UI dnd-kit. Reporté.

### TipTap blog editor
Champ contenu en `<textarea>` Markdown. WYSIWYG TipTap reporté.

### Bouton "Push manuel vers Apimo" sur leads
Non câblé — API Apimo write non documentée publiquement. À traiter quand Julien obtient les credentials API Apimo.

### Page /qui-sommes-nous : Julien sur la home
Le brief V3 mentionne "Julien (sans nom)" sur la home, mais ne demande pas explicitement de section dédiée. Pas de changement nécessaire sur la home pour l'instant.

