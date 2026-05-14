# Audit Avis Clients — 2026-05-12

> Mode lecture seule. Aucun fichier source modifié. Aucune écriture DB.
> Source d'analyse : `https://mapa-property-liard.vercel.app/{fr,en,de}` (HTML SSR) + code repo.

## Résumé

- **Source unique** : table Supabase `reviews` via `fetchPublishedReviews()` (`lib/data.ts:410-423`).
- **Aucun avis hardcodé** dans le code (`lib/`, `app/`, `components/`, `messages/`, `scripts/`). `grep` sur tous les noms d'auteurs : 0 occurrence hors HTML rendu.
- **Composant unique d'affichage home** : `components/home/ReviewsCarousel.tsx`.
- **Affichage propriété** : `app/[locale]/biens/[slug]/page.tsx:257-283` (slice 2 premiers, type `Review[]` ; pas testé en prod ici car dépend du bien).
- **Console admin** : CRUD complet (`app/admin/reviews/`), CRUD via `app/admin/reviews/actions.ts` (insert/update/delete).
- **Nombre d'avis affichés en home** : **7 en FR**, **7 en EN**, **7 en DE** (la limite passée au fetcher est `8` cf. `app/[locale]/page.tsx:33`, donc la DB ne contient probablement que 7 avis `is_published=true`).
- **Total tri** : `order("review_date", { ascending: false })` — confirmé visuellement dans le rendu (mars 2026 → avr. 2025).

## Avis affichés en home (extraits HTML rendus)

| N° | Auteur | Date `review_date` | Note | Mention Brebion | Mention Mannis | Tel/email en clair | Cohérence langue |
|---|---|---|---|---|---|---|---|
| 1 | Christophe L. | 2026-03-02 | 5★ | Non (cite "MAPA") | Non | Non | FR ✓ |
| 2 | Claudia Loconte | 2026-02-10 | 5★ | Non | Non | Non | FR ✓ |
| 3 | Bojan Vlahek | 2026-01-15 | 5★ | **Oui** ("M. Julien Brebion") | Non | Non | FR ✓ |
| 4 | Sonia Teixeira | 2025-12-15 | 5★ | Non | Non | Non | FR ✓ |
| 5 | Miguel Monteiro | 2025-12-15 | 5★ | Non (texte « Parfait. ») | Non | Non | FR ✓ |
| 6 | Roger Bertemes | 2025-09-15 | 5★ | Non | Non | Non | FR ✓ |
| 7 | M. et Mme Santos | 2025-04-15 | 5★ | **Oui** ("Monsieur Brebion") | Non | Non | FR ✓ |

### Note sur Brebion / Mannis
- 2 avis citent **M. Brebion** (Bojan Vlahek, M. et Mme Santos). Conforme à la réalité (Julien Brebion = Real Estate Director, signe les transactions).
- **Aucun avis ne mentionne Frédéric Mannis** : OK, conforme au fait que Mannis est gérant non commercial.
- Aucune mention de « Frédéric », « Mannis », « gérant » dans aucun avis.

### Note sur les notes
- **100 % d'avis à 5★** (7/7). Cohérent avec une sélection éditoriale d'avis publiés, mais peut paraître trop uniforme. Pas de bug rendu (rating non null, 5 étoiles dorées sur 5).

### Note sur les dates
- Plus récent : 2026-03-02 ; plus ancien : 2025-04-15.
- Aujourd'hui : 2026-05-12. Aucune date dans le futur. Aucune date antérieure à 2025-04 affichée.
- Deux avis partagent la date 2025-12-15 (Sonia Teixeira / Miguel Monteiro) — plausible (saisie manuelle approximative ou réelle).

## Anomalies détectées

### 1. ⚠️ Avis en français servis aux locales EN et DE (cohérence langue)
- `https://mapa-property-liard.vercel.app/en` et `/de` affichent les **mêmes 7 avis en français**, sans traduction.
- Seuls les libellés du carrousel (`eyebrow`, `title`) sont traduits via `next-intl` (`messages/en.json`, `messages/de.json`).
- Le schéma `Review` (`lib/types.ts:65-72`) **ne contient qu'un champ `comment` unique** (pas `comment_fr` / `comment_en` / `comment_de`), contrairement à `blog_posts` qui est trilingue.
- **Conséquence** : un visiteur EN/DE lit du français brut sans contexte. Impact UX et SEO modéré (rich snippets review en mauvaise langue → Google peut downgrader).

### 2. ⚠️ Format de date toujours en `fr-LU` même en EN/DE
- `components/home/ReviewsCarousel.tsx:46` : `new Date(r.review_date).toLocaleDateString("fr-LU", ...)`.
- Conséquence : « mars 2026 » / « févr. 2026 » / « janv. 2026 » s'affichent sur `/en` et `/de`. Visible aussi sur les autres `<time>` du site (BlogTeaser même symptôme : « 17 mars 2026 » servi sur DE).
- À corriger : passer le `locale` reçu en prop ou utiliser `useLocale()` côté composant (mais c'est un Server Component ; OK via prop).

### 3. ℹ️ Asymétrie noms complets / abrégés (RGPD léger)
- Noms en clair complet : Claudia Loconte, Bojan Vlahek, Sonia Teixeira, Miguel Monteiro, Roger Bertemes.
- Abrégés : Christophe L. ; collectif : M. et Mme Santos.
- Pas de PII sensible (pas de tel/email), mais l'inconsistance suggère que **certains avis ont été récupérés depuis Google Maps / Trustpilot tels quels** (où le nom complet est public) et d'autres anonymisés à la saisie.
- Recommandation : uniformiser sur « Prénom + Initiale » côté admin (politique de pseudonymisation soft), ou recueillir un consentement explicite pour publication du nom complet.

### 4. ℹ️ Aucun avis post-mars 2026 (gap de 2 mois)
- Date la plus récente : 2026-03-02. Aujourd'hui : 2026-05-12. Pas d'avis nouveau depuis ~10 semaines.
- Pas un bug technique, mais un signal éditorial : alimenter la table pour fraîcheur.

### 5. ℹ️ Toutes les notes sont à 5★
- Statistiquement plausible si curation éditoriale, mais peu crédible vis-à-vis du E-E-A-T Google. Rien à corriger côté technique.

## Composants liés

| Fichier | Rôle |
|---|---|
| `lib/data.ts:410-423` | `fetchPublishedReviews(limit=12)` — SELECT * WHERE is_published, ORDER review_date DESC LIMIT |
| `lib/types.ts:65-72` | Interface `Review` (id, name, rating, comment, review_date, is_published) — monolingue |
| `app/[locale]/page.tsx:33,50` | Appel `fetchPublishedReviews(8)` + `<ReviewsCarousel reviews=…>` |
| `components/home/ReviewsCarousel.tsx` | Rendu carrousel, locale fr-LU hardcodée ligne 46 |
| `app/[locale]/biens/[slug]/page.tsx:257-283` | Affichage 2 avis dans la fiche bien (mêmes données, format différent) |
| `app/admin/reviews/page.tsx` | Liste admin avec colonnes name/rating/date/status/actions |
| `app/admin/reviews/actions.ts` | Server actions create/update/delete via service role |
| `app/admin/reviews/[id]/edit/page.tsx` + `new/page.tsx` + `components/admin/ReviewForm.tsx` | Formulaires CRUD |
| `messages/{fr,en,de}.json` (clé `reviews_home`) | Eyebrow + title traduits |

## Recommandations

### Priorité haute
1. **Traduire les avis** (ou au minimum les 7 actuels) : ajouter colonnes `comment_en` / `comment_de` à la table `reviews` + adapter `Review` type + sélection dans `ReviewsCarousel` selon `locale`. Sinon **n'afficher le carrousel que sur `/fr`** (early return si `locale !== 'fr'`).
2. **Localiser les dates** dans `ReviewsCarousel.tsx:46` : remplacer `"fr-LU"` par le `locale` en prop (`fr-LU` / `en-LU` / `de-LU`). Même symptôme à corriger dans `BlogTeaser` (constaté lors du parsing).

### Priorité moyenne
3. **Politique de pseudonymisation** : uniformiser au format « Prénom + Initiale du nom » pour cohérence et RGPD (consentement éclairé recommandé pour les noms en clair).
4. **Alimenter les avis récents** : rien depuis mars 2026 ; CTA admin éventuel ou import semi-automatique des avis Google.

### Priorité basse
5. **Mixer les notes 4★/5★** côté curation : un panel 100 % 5★ peut être perçu comme « trop arrondi ». Pas une anomalie technique.
6. **Ajouter `published_at`** côté admin pour différencier la date de l'avis et la date de publication (utile pour SEO/rich snippets `Review` schema.org).

## Conformité brief

- ✓ Données 100 % Supabase, aucun hardcodage.
- ✓ Aucune mention de Mannis comme commercial (gérant correctement absent des témoignages).
- ✓ Aucune PII (téléphone, email) exposée dans les avis.
- ✗ Cohérence multilingue : avis FR uniques servis sur EN/DE → à traiter.
- ✗ Localisation des dates : `fr-LU` hardcodé.
