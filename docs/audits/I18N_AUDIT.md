# Audit i18n FR/EN/DE — 2026-05-12

Phase A-quinquies · Agent AUDIT 3 · MODE LECTURE SEULE

Fichiers audités :
- `messages/fr.json` (référence)
- `messages/en.json`
- `messages/de.json`
- Tous les `app/**/*.{ts,tsx}` et `components/**/*.{ts,tsx}`

## Résumé

| Métrique | Valeur |
|---|---|
| Clés totales FR (flatten) | **574** |
| Clés totales EN (flatten) | **574** |
| Clés totales DE (flatten) | **574** |
| Clés manquantes inter-locales | **0** (couverture 100% parfaite) |
| Clés orphelines (code → JSON) | **0** |
| Clés mortes (JSON → code) — confirmées | **18** |
| Divergences chiffrées critiques | **0** (parité parfaite : 1%, 3%, 4%, 5%, 7%, 17%, 20%, 24, 28, 35%, 2018, 2020, 2026) |
| Placeholders Lorem/à compléter dans UI/messages | **0** |
| `TODO` non bloquants dans le code | **4** (API/Turnstile/PDF, hors UI) |

**Verdict global : i18n en excellent état.** Couverture parfaite, parité chiffrée parfaite, aucune chaîne placeholder dans l'UI. 18 clés inutilisées à nettoyer (cosmétique, non bloquant).

---

## 1. Clés présentes dans une langue, absentes ailleurs

| Clé | FR | EN | DE |
|---|---|---|---|
| _(aucune)_ | — | — | — |

Couverture inter-locales **100% parfaite** sur les 574 clés.

---

## 2. Divergences chiffrées (FR vs EN/DE)

Les deux seules différences détectées concernent **le format de date** de la loi luxembourgeoise du 21 septembre 2006, ce qui est attendu et correct :

| Clé | FR | EN | DE | Verdict |
|---|---|---|---|---|
| `page_rent.intro` | `loi 21.09.2006` | `law of 21 September 2006` | `Gesetz vom 21.09.2006` | OK — format local |
| `simulators.alert_5pct` | `loi 21.09.2006` | `law of 21 September 2006` | `Gesetz vom 21.09.2006` | OK — format local |

Tous les **chiffres économiques critiques** sont rigoureusement identiques dans les 3 langues :

| Marqueur | FR | EN | DE | Note |
|---|---|---|---|---|
| `3%` (mandat Exclusif) | ✓ | ✓ | ✓ | parité |
| `4%` (mandat Semi-Exclusif) | ✓ | ✓ | ✓ | parité |
| `5%` (mandat Simple, plafond loyer LU) | ✓ | ✓ | ✓ | parité |
| `1%` (mandat Autonome, Bëllegen Akt) | ✓ | ✓ | ✓ | parité |
| `17%` (TVA Luxembourg) | ✓ | ✓ | ✓ | parité |
| `35%` (plafond endettement BCL/CSSF, abattement fiscal LU) | ✓ | ✓ | ✓ | parité |
| `20%` (apport simulateur) | ✓ | ✓ | ✓ | parité |
| `7%` (frais notaire) | ✓ | ✓ | ✓ | parité |
| `24` communes Luxembourg | ✓ | ✓ | ✓ | parité |
| `28` villes premium internationales | ✓ | ✓ | ✓ | parité |
| `2018`, `2020`, `2026` | ✓ | ✓ | ✓ | parité |
| `21.09.2006` loi loyer LU | ✓ | (forme longue) | ✓ | format local OK |

---

## 3. Clés orphelines (utilisées dans le code, absentes des JSON)

| Fichier | Clé |
|---|---|
| _(aucune)_ | — |

**Aucune orpheline.** Toutes les clés référencées par `t()` / `getTranslations` existent dans les 3 fichiers de messages.

Méthode : parsing des `useTranslations("ns")` et `getTranslations({ namespace })` puis match de tous les `var("key")` et patterns dynamiques `t(\`prefix_\${x}\`)` dans `app/` et `components/`. Les patterns dynamiques `t(item.key)` (objets typés `as const`) ont été vérifiés manuellement par inspection de `MobileMenu`, `HeaderBurger`, `Footer`, `CoverageGrid`, `MandatePage`.

---

## 4. Clés mortes (présentes dans JSON, jamais consommées)

Vérification : analyse statique + relevé manuel des accès dynamiques (template strings, `t(item.key)`, namespaces calculés `mandate_${slug}`).

### 4.a — Tout le namespace `property_financing.*` est mort (8 clés)

Aucun composant ne consomme ce namespace. Le bloc Financement indicatif sur la page propriété n'a pas été câblé.

| Clé | Action recommandée |
|---|---|
| `property_financing.eyebrow` | Supprimer ou implémenter le composant `PropertyFinancing` |
| `property_financing.title` | id. |
| `property_financing.monthly` | id. |
| `property_financing.rate` | id. (contient `{years}`) |
| `property_financing.down` | id. |
| `property_financing.notary` | id. |
| `property_financing.disclaimer` | id. |
| `property_financing.cta` | id. |

### 4.b — Clés résiduelles mortes (10 clés)

| Clé | Pourquoi morte | Note |
|---|---|---|
| `common.language` | `LangSwitcher` utilise `aria-label="Language"` codé en dur | Recommander d'utiliser `t("language")` ou supprimer la clé |
| `common.loading` | Seul `contact.loading` est consommé (ContactButtons / contact namespace) | Supprimer si pas de réutilisation prévue |
| `meta.site_name` | `siteName: "MAPA Property"` codé en dur dans `app/[locale]/layout.tsx` ligne 70 | Supprimer la clé OU câbler `t("site_name")` |
| `home.placeholder` | Vestige de l'étape pré-Hero, plus de page d'accueil "en construction" | Supprimer |
| `about_page.bio_julien` | Bio Julien jamais affichée — seul `director_label` est rendu | Supprimer ou réintégrer dans `qui-sommes-nous` |
| `offmarket.eyebrow` | `t("eyebrow")` n'est utilisé dans `off-market/page.tsx` qu'avec `hero_eyebrow` / `access_eyebrow` / `locked_eyebrow` / `form_eyebrow` | Supprimer |
| `contact_cta.call_label` | `ContactCTA.tsx` n'affiche pas ces sous-libellés | Supprimer ou enrichir le composant |
| `contact_cta.email_label` | id. | id. |
| `footer.call` | `ContactButtons` utilise `contact.call_button` ; footer.call jamais consommé | Supprimer |
| `footer.email` | id. | Supprimer |

### 4.c — Clés vérifiées et non mortes (faux positifs de l'analyse statique pure)

Le parse statique avait remonté ~148 clés candidates. **130 d'entre elles sont consommées dynamiquement** via :

- `t(item.key)` sur des objets `as const` (ex. `MobileMenu.tsx`, `HeaderBurger.tsx`, `Footer.tsx`) → tout `nav.*` (`buy`, `sell`, `rent`, `services`, `about`, `blog`, `contact`, `all_mandates`, `mandate_*`, `simulators`, `markets`, `fees`, etc.) + tout `footer.{legal_notice,tos,tos_sale,privacy,fees_pdf,cookies}` + `coverage.{luxembourg/trophy/secondary/investment}_{1..4}`
- Namespace calculé `useTranslations(\`mandate_${slug}\`)` dans `app/[locale]/mandats/[type]/page.tsx` → toutes les clés `mandate_exclusif.*`, `mandate_semi_exclusif.*`, `mandate_simple.*`, `mandate_autonome.*`, `mandate_recherche.*`
- Templates `t(\`step_${s}_title\`)`, `t(\`tx_${tr}\`)`, `t(\`type_${p}\`)`, `t(\`tab_${tab}\`)`, `t(\`help_${k}_title\`)`, `t(\`state_${s}\`)`, `t(\`highlight_${i}_title\`)`, `t(\`service_${i}\`)`, `t(\`excluded_${i}\`)`, `t(\`label_${slug.replace("-","_")}\`)` → couvrent `services_home.*`, `mandates_home.*`, `process.*`, `stats.*`, `page_sell.step_*`, `page_rent.{find,list,manage}_*`, `simulators.tab_*`, `search.type_*`, `property.tx_*`, `property_list.tx_*`, `estimate_form.{help_*,state_*}`, `mandate_common.label_*`

---

## 5. Placeholders oubliés

### 5.a — Dans les messages (`messages/*.json`)
Aucun `Lorem ipsum`, `TODO`, `FIXME`, `XXX`, `à compléter`, `placeholder text` détecté.

### 5.b — Dans le code (`app/`, `components/`)

| Fichier | Ligne | Motif | Nature |
|---|---|---|---|
| `app/api/search-ia/route.ts` | 22 | `// TODO: brancher Mistral … puis fallback Groq` | Commentaire technique — non visible UI |
| `app/api/lead/route.ts` | 78 | `// TODO: si RESEND_API_KEY présente, envoyer notification email via Resend (Étape 13)` | Commentaire technique — non visible UI |
| `components/ui/Turnstile.tsx` | 77 | `// TODO: brancher Cloudflare Turnstile … Étape 11` | Commentaire technique — non visible UI |
| `components/property/PropertyActions.tsx` | 13 | `// TODO: pdf via @react-pdf/renderer dans Étape 12 (polish).` | Commentaire technique — non visible UI |

**Aucun placeholder UI** (texte visible utilisateur de type Lorem/TODO/à compléter). Les 4 TODOs sont des marqueurs internes de roadmap (Étapes 11/12/13).

---

## 6. Recommandations

### Priorité 1 — Cosmétique / nettoyage JSON (non bloquant)
1. **Supprimer le namespace `property_financing.*` complet** (8 clés × 3 locales = 24 entrées) si le bloc Financement indicatif sur la fiche propriété n'est plus prévu. Sinon, créer le composant `<PropertyFinancing>` qui le consomme.
2. **Supprimer les 10 clés résiduelles mortes** (cf. §4.b) : `common.language`, `common.loading`, `meta.site_name`, `home.placeholder`, `about_page.bio_julien`, `offmarket.eyebrow`, `contact_cta.call_label`, `contact_cta.email_label`, `footer.call`, `footer.email`.

### Priorité 2 — Améliorer la lisibilité (optionnel)
3. Pour `common.language` : si l'on veut un `aria-label` traduit, modifier `LangSwitcher.tsx` ligne 25 pour utiliser `useTranslations("common")` et `t("language")` au lieu de `"Language"` codé en dur. Sinon supprimer la clé.
4. Pour `meta.site_name` : utiliser `t("site_name")` au lieu de `"MAPA Property"` codé en dur dans `app/[locale]/layout.tsx` ligne 70 (OpenGraph `siteName`).

### Priorité 3 — Aucune action requise
- La couverture FR/EN/DE est **parfaite**.
- La parité chiffrée (pourcentages, dates clés, capacités d'accueil 24/28) est **parfaite**.
- Aucun texte placeholder visible côté utilisateur.
- Le projet est prêt pour bascule beta → prod du point de vue i18n.

---

_Audit produit le 2026-05-12 par Agent AUDIT 3 (Phase A-quinquies). Lecture seule — aucun fichier modifié, aucun commit._
