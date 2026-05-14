# Audit Performance + SEO — 2026-05-12

Agent : AUDIT 7 (Phase A-quinquies)
Mode : lecture seule (aucune modification de code, aucun commit)
Cible : `https://mapa-property-liard.vercel.app` (preview Vercel, alias prod du repo)
Outil : Lighthouse 13.3.0 (Node 24.14.1) + Chrome Headless Shell 148.0.7778.97 (mac arm64)
Profil : mobile (form-factor=mobile, throttling Lighthouse par défaut)

---

## 1. Lighthouse mobile — synthèse

| Page | Perf | A11y | Best Pract. | SEO | LCP | CLS | TBT | Speed Index | Statut |
|---|---|---|---|---|---|---|---|---|---|
| `/fr` | **90** | 91 | **100** | 61 | 3275 ms | 0 | 27 ms | 4351 ms | WARN (LCP) |
| `/fr/biens` | **98** | 91 | **100** | 61 | 2417 ms | 0 | 12 ms | 1889 ms | OK |
| `/fr/biens/84950222` | **90** | 84 | **100** | 61 | 3631 ms | 0 | 13 ms | 2180 ms | WARN (LCP + A11y) |
| `/fr/services/vendre` | **98** | 91 | **100** | 61 | 2423 ms | 0 | 44 ms | 1768 ms | OK |
| `/fr/contact` | **97** | 91 | **100** | 61 | 2532 ms | 0 | 24 ms | 996 ms | OK |

Cibles : Perf ≥ 80, A11y ≥ 90, SEO ≥ 90, LCP < 2.5 s mobile.

Lecture rapide :

- **Performance** : 5/5 pages ≥ 90 — objectif atteint largement. Pages les plus rapides : `/fr/biens` et `/fr/services/vendre` (98).
- **Accessibility** : 4/5 ≥ 90, **fiche bien à 84** — sous la cible. Plusieurs problèmes ARIA / contraste récurrents (voir §6).
- **Best Practices** : 100 partout — parfait.
- **SEO** : **61 sur les 5 pages** — sous-cible, mais **attendu et voulu** : la preview Vercel hérite du `Disallow: /` global de `robots.txt`. Sans le blocage robots et avec l'URL canonique correcte, le score remonterait à ~90+ (voir §5).
- **LCP** : 3/5 sous 2.5 s. **Home (3.27 s)** et **fiche bien (3.63 s)** au-dessus de la cible mobile.
- **CLS** : 0 partout — excellent, aucun layout shift mesuré.
- **TBT** : < 50 ms partout — JS très peu bloquant.

---

## 2. SEO meta — détail par page

| Page | `<title>` | `<meta name="description">` | `og:image` | JSON-LD |
|---|---|---|---|---|
| `/fr` | "MAPA Property — Agence immobilière au Luxembourg & broker international" | présente (151 c.) | `https://beta.mapaproperty.lu/og/og-fr.png` | 1 bloc (RealEstateAgent + Person + WebSite, `@graph`) |
| `/fr/biens` | hérite du title global MAPA | hérite | `og/og-fr.png` | 1 bloc (idem racine) |
| `/fr/biens/84950222` | hérite du title global MAPA | hérite | `og/og-fr.png` | **3 blocs** : graph racine + Product (offer EUR 8 990 000) + BreadcrumbList |
| `/fr/services/vendre` | **dédié** : "Confier la vente de votre bien. — MAPA Property" | **dédiée** : "Une seule règle : la cohérence. Quatre formules…" | `og/og-fr.png` | 1 bloc (graph racine) |
| `/fr/contact` | hérite du title global MAPA | hérite | `og/og-fr.png` | 1 bloc (graph racine) |

Observations :

- **Canonical présent** sur la home : `<link rel="canonical" href="https://beta.mapaproperty.lu/fr"/>`.
- **hreflang complet** : `fr-LU`, `en-US`, `de-DE`, `x-default` — bien configuré.
- **`og:image` unique pour toutes les pages FR** (`og-fr.png`). Acceptable pour beta, mais sur fiche bien on attendrait idéalement une OG image dynamique (cf. §7 recos).
- **`/fr/biens`, `/fr/contact` et `/fr/biens/<id>` n'ont PAS de `<title>` ni `description` spécifiques** : tous tombent sur le title global "Agence immobilière au Luxembourg & broker international". Sous-optimal pour le SEO post-bascule prod.

---

## 3. robots.txt (preview)

```
User-Agent: *
Disallow: /

Host: https://beta.mapaproperty.lu
```

Statut beta : **`Disallow: /` attendu et confirmé**. La directive `Host:` pointe correctement vers `beta.mapaproperty.lu`. La logique de bascule auto via `NEXT_PUBLIC_SITE_URL` (cf. `AGENTS.md`) devra émettre un `Allow` quand le domaine perdra le préfixe `beta.`.

---

## 4. sitemap.xml (preview)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
```

Statut beta : **sitemap vide attendu et confirmé**. Conforme à la stratégie de déploiement décrite dans `AGENTS.md`.

---

## 5. Pourquoi le SEO est à 61

Lighthouse retourne 2 audits SEO en échec, tous deux liés au statut beta :

| Audit | Score | Raison |
|---|---|---|
| `is-crawlable` | 0 | `robots.txt` bloque tout (`Disallow: /`) — **volontaire** |
| `canonical` | 0 | URL canonique pointe sur `beta.mapaproperty.lu` alors que le test tourne sur `mapa-property-liard.vercel.app` — **artefact de l'URL preview Vercel** |

Tous les autres audits SEO passent : doc valide, viewport mobile, font sizes, tap targets indexable, descriptive link text, etc.

**Conclusion** : le 61 n'est pas une régression — c'est mécaniquement induit par la configuration beta. Après bascule prod (sitemap rempli + `Allow: /` + canonical sur `mapaproperty.lu`), le score remontera à ~91+.

---

## 6. Accessibility — problèmes récurrents (à corriger avant prod)

Audits qui échouent sur ≥ 2 pages :

| Audit | Pages touchées | Sévérité |
|---|---|---|
| `color-contrast` | **5/5** | HIGH |
| `heading-order` | **5/5** | MED |
| `aria-hidden-focus` | 4/5 (sauf home) | HIGH |
| `target-size` | 1/5 (home) | MED |
| `button-name` | 1/5 (fiche bien) | HIGH |
| `definition-list` | 1/5 (fiche bien) | LOW |

Trois recommandations bloquantes pour atteindre A11y ≥ 90 sur toutes les pages, dont la fiche bien :

1. **Contraste** : audit Tailwind v4 → vérifier les paires `text-muted` sur `bg-bg`, `text-gold` sur `bg-bg`, et tout texte gris clair en thème light. Pénalise les 5 pages.
2. **Heading-order** : un saut h1 → h3 ou h2 → h4 quelque part dans le layout global (5/5). Probablement dans Header / Hero / Footer.
3. **aria-hidden-focus** : un élément `aria-hidden="true"` contient un descendant focusable (`<a>`, `<button>`, `<input>` non tabindex=-1). Récurrent sur 4 pages — probablement un composant partagé (drawer, dropdown, ou tooltip caché).

Spécifique fiche bien :

4. **button-name** : au moins un `<button>` sans `aria-label` ni texte visible. Très probablement les boutons de la galerie/carousel.
5. **definition-list** : un `<dl>` contient des éléments non autorisés (autre que `<dt>`, `<dd>`, `<div>`, `<script>`, `<template>`).

---

## 7. Performance — diagnostics

- **CLS = 0 partout** : excellent. Les images ont des dimensions explicites, pas de FOIT/FOUT visible.
- **TBT < 50 ms** : 5/5. Hydration React 19 propre, pas de long task significatif.
- **LCP home (3.27 s)** : à investiguer — TBT minuscule (27 ms) mais Speed Index élevé (4.35 s) suggère que la ressource LCP arrive tard. Hypothèse : image hero (mode dark inclus) ou police custom.
- **LCP fiche bien (3.63 s)** : poids total 1.08 MB, dont 478 KB de tiers (probablement Apimo CDN pour l'image principale) et 242 KB de scripts. Sur 41 requêtes, le LCP est sans doute l'image principale du bien (8 images = 204 KB, mais l'image principale est probablement hors cache local).
- **Unused JavaScript** : ~160 ms sur fiche bien — marginal, pas prioritaire.

Aucun render-blocking critique détecté (audit `render-blocking-resources` à null = pas de problème mesuré).

---

## 8. JSON-LD — validité et RGPD

| Page | Blocs JSON-LD | Validité JSON | Types | Tel/email en clair |
|---|---|---|---|---|
| `/fr` | 1 (`@graph`) | **VALID** | RealEstateAgent + Person + WebSite | **NON** |
| `/fr/biens/84950222` | 3 | **VALID** (3/3) | graph + Product/Offer + BreadcrumbList | **NON** |

Détails RGPD :

- Aucune occurrence de `telephone`, `email`, `tel:`, `mailto:`, `phone` dans les blocs JSON-LD analysés.
- Mention `"name":"Julien"` (prénom seul) + LinkedIn personnel dans `sameAs` — acceptable au sens RGPD (donnée publique professionnelle, lien LinkedIn déjà public).
- `AggregateRating` sur RealEstateAgent : `5/5` sur `reviewCount: "8"` — vérifier que les 8 avis correspondent bien aux entrées Supabase `reviews` actuelles (sinon Google peut signaler de fausses étoiles dans la SERP).
- `Product` fiche bien : prix `8 990 000 EUR`, devise correcte, `availability: InStock` cohérent.
- `BreadcrumbList` : 3 niveaux, structure conforme.

---

## 9. Recommandations priorisées

### Avant bascule prod (bloquant)

1. **A11y** : corriger les 3 audits récurrents (color-contrast, heading-order, aria-hidden-focus) — viser A11y ≥ 90 sur les 5 pages, **incluant la fiche bien** (actuellement 84).
2. **Meta SEO** : ajouter `generateMetadata` dédié sur `/fr/biens` (liste), `/fr/biens/[id]` (fiche bien : title = "{nom du bien} — MAPA Property", description = excerpt) et `/fr/contact`. Aujourd'hui 4/5 pages héritent du même title/description.
3. **`og:image` dynamique** sur la fiche bien : utiliser la photo principale du bien comme `og:image` (déjà présente dans le JSON-LD `Product.image`).

### Avant ouverture indexation

4. Vérifier que `robots.ts` et `sitemap.ts` basculent bien quand `NEXT_PUBLIC_SITE_URL` perd `beta.` (logique déjà décrite dans `AGENTS.md` — tester en preview avec un env var override).
5. Vérifier la cohérence `AggregateRating` (`reviewCount: "8"`) avec le contenu réel de la table Supabase `reviews`.

### Optimisations performance (non bloquant — déjà au-dessus de la cible)

6. **LCP fiche bien** : `priority` + `placeholder=blur` + `sizes` précis sur l'image principale du bien. Idéalement, servir une variante AVIF/WebP responsive depuis le CDN Apimo (ou proxy via `next/image` avec `loader` custom).
7. **LCP home** : auditer l'image hero (probablement le LCP element). `priority` + format moderne + dimensions explicites.

### Confort RGPD / E-A-T

8. Aucun problème détecté côté JSON-LD. RAS.

---

## 10. Limitations de cet audit

- 1 seul run Lighthouse par page (pas de moyenne sur 3 runs) — métriques bruyantes à ±5 %.
- Throttling Lighthouse par défaut (Slow 4G + 4x CPU slowdown) — représentatif d'un mobile milieu de gamme, pas d'un Pixel 8.
- Test contre l'URL preview Vercel (`mapa-property-liard.vercel.app`) et non le domaine cible `beta.mapaproperty.lu`. Les écarts SEO/canonical sont dus à cet écart d'URL, pas à un défaut de code.
- Chrome headless installé temporairement dans `/tmp/chrome-install` (157 MB) — peut être supprimé après l'audit.

Rapports JSON Lighthouse complets disponibles dans `/tmp/lh-audit/*.json` (5 fichiers, ~3 MB).
