# Audit Mentions Légales — 2026-05-12

**Agent** : AUDIT 4 — Phase A-quinquies — Mode lecture seule
**Périmètre** : `app/`, `components/`, `messages/`, `lib/`
**Source unique vérifiée** : `lib/legal/mentions.ts`, `lib/legal/cgv.ts`, `lib/legal/rgpd.ts`, `lib/legal/cgu.ts`, `lib/legal/honoraires.ts`

---

## Résumé

- Identifiants vérifiés : **10 / 10** (tous corrects et présents)
- Erreurs critiques bloquantes : **0**
- Anomalies à corriger (non bloquantes) : **2**
- Warnings informatifs : **1**

L'agent 6 de la Phase A-bis a bien retiré email/téléphone du JSON-LD public. La source unique des mentions légales (`lib/legal/*.ts`) est cohérente, multi-langue (fr/en/de), et expose les bonnes coordonnées MAPA Synergy Sàrl.

---

## Conformité identifiants

Tous les identifiants ci-dessous ont été grep-vérifiés dans le code source. Les valeurs trouvées correspondent strictement aux valeurs officielles attendues.

| Donnée | Attendu | Trouvé (fichier:ligne) | Statut |
|---|---|---|---|
| Raison sociale | MAPA Synergy Sàrl | `lib/legal/mentions.ts:30`, `:113`, `:173` ; `lib/legal/cgv.ts:36` ; `lib/legal/rgpd.ts:29,137,222` ; `components/layout/Footer.tsx:109` | **OK** |
| Gérant | Frédéric Mannis | `lib/legal/mentions.ts:50, 130, 190` | **OK** |
| LBR (RCS) | B241974 | `lib/legal/mentions.ts:33,116,176` ; `lib/legal/cgv.ts:38` ; `lib/legal/rgpd.ts:29,137,222` | **OK** |
| TVA | LU 31988923 | `lib/legal/mentions.ts:35,116,176` ; `lib/legal/cgv.ts:38` | **OK** |
| AE | 10108681 | `lib/legal/mentions.ts:34,116,176` ; `lib/legal/cgv.ts:38` | **OK** |
| Matricule | 2020 2407 901 | **ABSENT du code** (mais non requis pour mentions légales B2B) | **N/A** |
| BIC | BCEELULL | `lib/legal/mentions.ts:36,117,177` ; `lib/legal/cgv.ts:39` | **OK** |
| IBAN | LU88 0019 5655 88 84 9000 | `lib/legal/mentions.ts:36,117,177` ; `lib/legal/cgv.ts:39` | **OK** |
| Téléphone Julien | +352 691 620 127 | `lib/legal/mentions.ts:43, 124, 184` ; `app/[locale]/qui-sommes-nous/page.tsx:75, 78` | **OK** |
| Téléphone Frédéric | +352 691 113 018 | `lib/legal/mentions.ts:51, 131, 191` | **OK** |
| Email Julien | j.brebion@mapagroup.org | `lib/legal/mentions.ts:44, 124, 184` ; `lib/legal/cgv.ts:154` ; `lib/legal/rgpd.ts:30,137,222` ; `app/[locale]/qui-sommes-nous/page.tsx:81, 84` | **OK** |
| Email RGPD | admin@mapagroup.org | `lib/legal/rgpd.ts:93, 179, 264` ; `app/admin/settings/page.tsx:32` | **OK** |
| Email Frédéric | contact@mapagroup.org | `lib/legal/mentions.ts:52, 131, 191` | **OK** |
| Adresse siège (interne) | 1, rue de la Vallée, L-3593 Dudelange | `lib/legal/mentions.ts:32,115,175` ; `lib/legal/cgv.ts:37` ; `lib/legal/rgpd.ts:29` | **OK** (uniquement dans pages légales) |
| Adresse publique | Luxembourg | `messages/fr|en|de.json` (`hq_value`, `baseline`, `micro_legal`) | **OK** |

---

## Erreurs détectées

### 1. CSSF au lieu de AED — **AUCUNE en contexte légal MAPA**

Les occurrences de "CSSF" trouvées sont **toutes en contexte BCL/CSSF règle prudentielle 35%** (recommandation officielle BCL et CSSF sur le plafond d'endettement crédit), donc **légitimes** :

- `components/chatbot/chatbot-knowledge.ts:52, 139, 194` — "Plafond endettement : 35 % des revenus (recommandation BCL/CSSF)" — **CORRECT**
- `messages/fr.json:566, 596` ; `messages/en.json:566, 596` ; `messages/de.json:566, 596` — disclaimers simulateur — **CORRECT**

**Aucune mention CSSF en tant qu'autorité de tutelle de MAPA**. La supervision de l'agence (AED + Chambre de Commerce) n'est explicitement mentionnée nulle part hors `lib/legal/rgpd.ts:54, 155, 240` qui réfère correctement aux "dossiers KYC **AED**" (conservation 7 ans). **Statut : OK.**

### 2. Chambre Immobilière au lieu de Chambre de Commerce — **AUCUNE**

Le grep `Chambre\s+Immobilière` ne retourne aucun résultat. Les hits "Chambres" trouvés (`messages/*.json`, `components/admin/OffmarketForm.tsx`) désignent uniquement le nombre de **chambres à coucher** d'un bien immobilier. **Statut : OK.**

À noter : aucune mention explicite de la **Chambre de Commerce** non plus en tant qu'organe de tutelle. Acceptable pour une page de mentions légales B2C, mais cf. recommandations §3.

### 3. Dudelange hors mentions-légales — **2 occurrences à statuer**

Conformément à la règle `CLAUDE.md` (Dudelange uniquement dans `app/[locale]/legal/mentions-legales/page.tsx`), audit des hits :

| Fichier:ligne | Contexte | Statut |
|---|---|---|
| `lib/legal/mentions.ts:32, 115, 175` | "Siège social : 1, rue de la Vallée, L-3593 Dudelange" — pages mentions légales officielles | **OK** (exception explicite autorisée) |
| `lib/legal/cgv.ts:37` | "Siège : 1, rue de la Vallée, L-3593 Dudelange" — pages CGV | **OK** (extension légitime de la règle aux autres docs légaux) |
| `lib/legal/rgpd.ts:29` | "MAPA Synergy Sàrl, RCS Luxembourg B241974, 1, rue de la Vallée, L-3593 Dudelange." — page RGPD | **OK** (idem, page légale) |
| `app/admin/settings/page.tsx:33` | `<Info label="Siège (privé)" value="Dudelange, Luxembourg" />` — **page admin back-office privée** | **OK** (étiquetée "privé", non publique) |
| `components/chatbot/chatbot-knowledge.ts:13, 101, 157` | Knowledge base chatbot — `"HQ public : Luxembourg (l'adresse Dudelange n'apparaît que dans les pages légales)"` | **OK** (instruction pour le LLM, jamais affichée en clair) |
| `lib/cities.ts:352-364` | Fiche ville Dudelange (4ᵉ ville du Luxembourg, marché immobilier) | **OK** (toponyme géographique légitime, pas siège MAPA) |

**Conclusion : aucune violation. Toutes les mentions Dudelange sont contextuellement justifiées.**

### 4. .com au lieu de .lu — **AUCUNE**

Le grep `mapaproperty\.com` retourne 0 résultat. Toutes les URLs utilisent `mapaproperty.lu` ou la variable `SITE_URL` (`lib/seo.ts:1-2`). **Statut : OK.**

---

## JSON-LD (`lib/seo.ts`)

Conformité RGPD (post-Agent 6 Phase A-bis) :

- **Email exposé** : **NON** — lignes 19-21 et 80 contiennent des commentaires explicites "RGPD : email + téléphone retirés du JSON-LD public". Aucun champ `email` n'est sérialisé.
- **Téléphone exposé** : **NON** — idem.
- `RealEstateAgent` n'expose plus que : `@id`, `name`, `url`, `logo`, `image`, `description`, `address` (locality + country uniquement, pas de `streetAddress`), `geo`, `areaServed`, `sameAs`, `founder`, `foundingDate`, `aggregateRating`.
- `Person` (Julien) : `name`, `jobTitle`, `worksFor`, `sameAs` (LinkedIn). Pas d'`email` ni `telephone`. **OK.**

**Statut JSON-LD : conforme RGPD et anti-scraping.**

---

## Anomalies à corriger (non bloquantes)

### A1. Coordonnées en clair sur `qui-sommes-nous` — contournement du dispositif anti-scraping

`app/[locale]/qui-sommes-nous/page.tsx:73-86` affiche **en clair** le téléphone (`+352 691 620 127`) et l'email (`j.brebion@mapagroup.org`) avec des liens `tel:` et `mailto:` directs.

```tsx
<a href="tel:+352691620127">+352 691 620 127</a>
<a href="mailto:j.brebion@mapagroup.org">j.brebion@mapagroup.org</a>
```

**Problème** : contourne le dispositif anti-bot mis en place dans `components/ContactButtons.tsx` (honeypot, délai mount→clic, API `/api/contact-reveal`). Un scraper récupère directement ces données sur cette page publique.

**Recommandation** : remplacer le bloc par `<ContactButtons />` (déjà utilisé dans le Footer). La page admin `settings/page.tsx:30-31` affiche d'ailleurs explicitement "Voir mentions légales (source unique)" — le frontend public devrait suivre la même règle.

### A2. Discordance "Gérant" entre mentions légales et données officielles

Selon le brief officiel MAPA fourni : **Frédéric Mannis est le gérant** et **Julien Brebion est Real Estate Director**.

`lib/legal/mentions.ts:40-53` distingue bien :
- Directeur de la publication = Julien Brebion (Real Estate Director)
- Gérant = Frédéric Mannis

**MAIS** `lib/legal/cgv.ts:40` mentionne : `"Représentant : Julien Brebion, gérant et Real Estate Director."` — qualifie Julien comme **gérant**, ce qui **contredit** `mentions.ts`.

**Recommandation** : corriger `lib/legal/cgv.ts:40` en `"Représentant : Julien Brebion, Real Estate Director. Gérant : Frédéric Mannis."` ou similaire, pour cohérence inter-documents légaux.

---

## Warnings informatifs

### W1. Supervision AED + Chambre de Commerce non mentionnée explicitement

`lib/legal/mentions.ts` mentionne uniquement la **CNPD** (autorité RGPD, ligne 82) mais **n'identifie pas explicitement** :
- L'**AED** (Administration de l'Enregistrement, des Domaines et de la TVA) comme autorité délivrant l'autorisation d'établissement 10108681.
- La **Chambre de Commerce** comme organe de représentation.

Ce n'est pas une obligation légale stricte pour des mentions légales B2C luxembourgeoises (le n° AE 10108681 est suffisant), mais une mention explicite renforcerait la transparence. Phrase suggérée pour la section "Éditeur" :

> "Activité d'agent immobilier autorisée par l'Administration de l'Enregistrement, des Domaines et de la TVA (AED), Luxembourg. Membre de la Chambre de Commerce du Grand-Duché de Luxembourg."

### W2. Matricule national 2020 2407 901 absent

Le numéro de matricule national (`2020 2407 901`) n'apparaît nulle part dans le code. Il n'est **pas obligatoire** sur des mentions légales web (à la différence du RCS, AE et TVA), mais peut être utile pour certaines démarches B2B (factures, courriers KYC). Inclure éventuellement dans le PDF `MAPA_Mentions_Legales.pdf` officiel uniquement.

---

## Recommandations correctifs (par ordre de priorité)

1. **[Priorité 1 / A1]** Remplacer le bloc téléphone/email en clair dans `app/[locale]/qui-sommes-nous/page.tsx:73-86` par `<ContactButtons variant="default" />` pour préserver la stratégie anti-scraping uniforme.

2. **[Priorité 2 / A2]** Corriger `lib/legal/cgv.ts:40` pour cohérence inter-documents : Julien Brebion = Real Estate Director (directeur publication) ; Frédéric Mannis = gérant statutaire.

3. **[Priorité 3 / W1]** Ajouter une mention explicite de l'AED comme autorité de tutelle et de la Chambre de Commerce dans `lib/legal/mentions.ts` section "Éditeur" (3 langues).

4. **[Optionnel / W2]** Ajouter le matricule national `2020 2407 901` dans le PDF officiel `public/MAPA_Mentions_Legales.pdf` (pas obligatoire en web).

---

## Fichiers audités (chemins absolus)

- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/lib/legal/mentions.ts`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/lib/legal/cgv.ts`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/lib/legal/cgu.ts`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/lib/legal/rgpd.ts`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/lib/legal/honoraires.ts`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/lib/seo.ts`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/components/layout/Footer.tsx`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/components/ContactButtons.tsx`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/app/[locale]/legal/mentions-legales/page.tsx`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/app/[locale]/qui-sommes-nous/page.tsx`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/app/admin/settings/page.tsx`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/messages/fr.json`, `en.json`, `de.json`
- `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/components/chatbot/chatbot-knowledge.ts`

---

*Audit généré le 2026-05-12 par Agent AUDIT 4, en mode lecture seule. Aucun fichier modifié, aucun commit, aucun push.*
