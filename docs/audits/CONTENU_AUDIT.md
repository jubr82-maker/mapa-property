# Audit Contenu Blog + Chatbot — 2026-05-12

Agent AUDIT 6 — Phase A-quinquies. Mode lecture seule. Aucun commit.

Repo : `/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/`
Sources distantes consultées :
- `https://mapa-property-liard.vercel.app/fr/journal`
- `https://mapa-property-liard.vercel.app/fr/blog/{slug}` × 3

---

## 1. Blog / Journal

### 1.1 Routing

- Page `app/[locale]/journal/page.tsx` (alias éditorial AD Magazine, brief V3 CHANTIER 6).
- Page `app/[locale]/blog/page.tsx` (URL legacy).
- Page article : `app/[locale]/blog/[slug]/page.tsx` (un seul fichier, les liens du journal pointent vers `/blog/<slug>` — incohérent avec le titre "Le Journal").
- Fetch : `lib/data.ts:425-467` (`fetchAllBlogPosts`, `fetchBlogPostBySlug`) — filtre `is_published = true`, log + retourne `[]/null` en cas d'erreur (conforme aux conventions projet).

### 1.2 Articles publiés (3)

| Slug | Date publiée | Auteur (HTML) | Statut |
|---|---|---|---|
| `off-market-luxembourg-fin-modele-informel` | 24 février 2026 | Julien **Brebion** | Publié |
| `vendre-luxembourg-2026-prix-estimation` | 10 février 2026 | Julien **Brebion** | Publié |
| `vivre-au-luxembourg-choix-rationnel-europe` | 17 mars 2026 | Julien **Brebion** | Publié |

Bio commune : « Julien Brebion — Real Estate Director · MAPA Property · Sourcing Specialist ». Lien `linkedin.com/in/julien-brebion/` exposé dans le JSON-LD Person (`sameAs`).

### 1.3 Détail par article

#### 1.3.1 Off-Market Luxembourg : la fin du modèle informel
- **Auteur affiché** : "Julien Brebion" — l'usage du nom de famille hors mentions légales est documenté dans le brief comme déviation potentielle (le brief impose "Julien" seul, sauf si auteur explicite signé sur un article : c'est ici un cas limite — à valider auprès du donneur d'ordre).
- **Chiffres cités** : 7% (frais notaire), 5%, 35% (plafond endettement), 1% (notaire), 17%, 20%, 3%, 4%, 0%, 700 000 (référence chiffrée), 2000 (date).
- **Sources citées (fin d'article)** : Loi du 12 novembre 2004 (AML), AED, AML Package européen, AMLA, Chambre Immobilière du Grand-Duché. **Sources officielles, cohérentes**.
- **Cohérence** : les références AML matchent celles de `components/chatbot/chatbot-knowledge.ts:51` (loi 12.11.2004). OK.

#### 1.3.2 Vendre au Luxembourg 2026 : prix, estimation, erreurs
- **Auteur** : Julien Brebion (idem).
- **Chiffres clés cités** : indices hédoniques, 17%, 3%, 7% (notaire), 5%, 35%, 1%, 1,4%, 2,3%, 2,85%, 3,05%, 3,1%, 3,40%, 3,70%, 3,90%, 7,1%, 10,1%, 14,5%, 15,9%, 16,3%, 21,5%, 50%, 47% (sans doute évolutions de prix). Montants : 10 000 €, 13 000 €, 15 000 €, 16 000 €, 20 000 €, 30 000 €, 40 000 €, 70 000 €, 80 000 €, 150 000 €, 200 000 €, 250 000 €, 7 000 €, 177 €, 400 €, 500 €.
- **Sources citées** : STATEC (indices hédoniques), Observatoire de l'Habitat, Immotop.lu, Ministère du Logement, **TEGoVA (European Valuation Standards 2025)**, BCE, Chambre Immobilière. **Sources officielles, robustes**.
- **Cohérence Bëllegen Akt (40 000 €)** : match `lib/state-aids.ts:52` et `lib/legal-fees.ts:41`. OK.

#### 1.3.3 Vivre au Luxembourg 2026 : guide complet pour familles
- **Auteur** : Julien Brebion.
- **Chiffres clés** : 17%, 7%, 5%, 35%, 47% (population étrangère ?), 95% (transports gratuits ?), 11 000, montants 383 €, 446 €, 500 €, 550 €, 719 €, 750 €, 805 €.
- **Sources citées** : STATEC (démographie au 1er janvier 2025), Ministère de la Mobilité (transports gratuits depuis 1er mars 2020), Ministère de l'Éducation, documents officiels Vauban / ISL / St. George's (tarifs 2025-2026), Observatoire de l'Habitat, Ville de Luxembourg. **Sources nominatives et datées, robustes**.

### 1.4 Erreurs détectées (blog)

| # | Sévérité | Constat |
|---|---|---|
| B-01 | MOYEN | Les 3 articles signent **"Julien Brebion"** + bio + LinkedIn. Le brief MAPA dit "Julien seul attendu (sauf si auteur explicite)". Comme il s'agit ici de la signature explicite d'un auteur, c'est défendable, mais incohérent avec la consigne stricte du projet. **Décision donneur d'ordre requise**. |
| B-02 | FAIBLE | Le titre de l'index "Le Journal" pointe vers `/blog/<slug>` (pas `/journal/<slug>`). Le slug d'URL reste `/blog` côté lecture article. C'est une incohérence éditoriale (URL ≠ marque), pas un bug technique. |
| B-03 | INFO | Aucun téléphone, aucune adresse email en clair détecté dans le HTML des 3 articles. Conforme RGPD/Phase A-bis. |

---

## 2. Chatbot — `components/chatbot/chatbot-knowledge.ts`

### 2.1 Téléphone / email en clair (RGPD)

- **Aucune** mention `tel:`, `mailto:`, ni numéro de téléphone luxembourgeois (format `+352 …` ou `26 …`).
- Aucune adresse email réelle. Seule chaîne ressemblante (FR ligne 12) : « *Coordonnées directes (téléphone, email) : disponibles via les boutons de contact présents sur le site. Ne jamais divulguer ni numéro de téléphone ni adresse email en clair dans la conversation.* » — c'est une consigne au LLM, pas une divulgation.
- **Résultat** : conforme. Aucune régression Phase A-bis.

### 2.2 Mention "Brebion"

- **Aucune** occurrence de "Brebion" dans `chatbot-knowledge.ts` (FR/EN/DE).
- **Aucune** occurrence de "Brebion" dans `app/api/chatbot/route.ts`.
- Real Estate Director nommé exclusivement **"Julien"**. Conforme au brief.

### 2.3 Chiffres cités — tableau de cohérence

| Section | Chiffre dans chatbot | Source de vérité | Statut |
|---|---|---|---|
| TVA Lu | 17% (honoraires) | `lib/legal/honoraires.ts:75` | OK |
| TVA neuf résidence principale | 3% jusqu'à 50 000 € crédit | `lib/state-aids.ts:71` | OK |
| Frais de notaire | ~7% dont 1% Bëllegen Akt | `lib/legal-fees.ts:35-36` | OK |
| **Bëllegen Akt — primo-acquéreur** | **« 40 000 € par primo-acquéreur résidence principale »** (FR L.50, L.55 ; EN L.137) | `lib/legal/honoraires.ts:75` : **« 40 000 € par acquéreur, sans condition d'âge ni de primo-accession »** ; `lib/state-aids.ts:51` : **« 40 000 EUR par acquéreur »** | **DIVERGENCE C-01** |
| Plafond endettement | 35% (BCL/CSSF) | `messages/*.json` disclaimers | OK |
| Plafond loyer | 5% capital investi / an (loi 21.09.2006) | idem | OK |
| AML | Loi 12.11.2004 modifiée | Blog 1, lib/legal-fees.ts | OK |
| **Honoraires Vente Exclusif** | **3,5%** (FR L.18, EN L.106, DE L.162) | `messages/fr.json:171` : **3%** + Pack Vidéo en option | **DIVERGENCE C-02** |
| **Honoraires Vente Semi-Exclusif** | **4,0%** | `messages/fr.json:173` : **4%** | OK (équivalent) |
| **Honoraires Vente Simple** | **4,5%** | `messages/fr.json:175` : **5%** | **DIVERGENCE C-03** |
| **Honoraires Vente Autonome** | **« Forfait sur devis »** | `messages/fr.json:177` : **1% HT + 17% TVA** | **DIVERGENCE C-04** |
| Mandat de recherche | 1-3% HT | (pas trouvé dans messages — référence externe) | À vérifier (donneur d'ordre) |
| Location mise en location | 1 mois loyer HT | (non vérifié dans messages) | À vérifier |
| Gestion locative | 6-8% HT | (non vérifié dans messages) | À vérifier |
| 24 communes / 28 villes premium | OK | `messages/fr.json:185-188` | OK |

### 2.4 Erreurs détectées (chatbot-knowledge.ts)

| # | Sévérité | Constat | Localisation |
|---|---|---|---|
| **C-01** | HAUT | Bëllegen Akt présenté comme « **par primo-acquéreur** » alors que la loi du 3 juillet 2025 (et `lib/legal/honoraires.ts:75`) précise « **sans condition d'âge ni de primo-accession**, pour toute résidence principale ». Le chatbot peut induire en erreur en refusant l'éligibilité à un non-primo. | FR L.50 + L.55 ; EN L.137 |
| **C-02** | HAUT | Mandat **Exclusif annoncé à 3,5%** alors que le site affiche **3%**. Risque commercial direct : un prospect voit 3% sur la page Vendre puis 3,5% dans le chatbot. | FR L.18 ; EN L.106 ; DE L.162 ; et **identique dans le fallback** `app/api/chatbot/route.ts:79, 88, 94` |
| **C-03** | HAUT | Mandat **Simple annoncé à 4,5%** alors que le site affiche **5%**. Inverse du précédent (sous-évaluation). | FR L.20 ; EN L.108 ; DE L.164 ; et **fallback** |
| **C-04** | HAUT | Mandat **Autonome annoncé « sur devis »** alors que le site affiche **1% HT + 17% TVA** explicitement. Le chatbot devrait connaître le tarif. | FR L.21 ; EN L.109 ; DE L.165 |
| C-05 | MOYEN | Chatbot dit « Mandat Exclusif (3,5 % HT) — **Pack Vidéo inclus** ». Le site (`messages/fr.json:368, 390, 376`) dit Pack Vidéo **en option (déductible)** sur Exclusif. Promesse marketing potentiellement excessive. | FR L.18 |
| C-06 | INFO | Mandat de recherche : « Honoraire dû en cas d'identification d'un bien dans les 24 mois suivant identification » (FR L.27). Cohérent avec `lib/legal/honoraires.ts:69` (24 mois). OK. |

### 2.5 Fallback `app/api/chatbot/route.ts:73-100`

- **Tel/email en clair** : aucun. Seule chaîne email = adresse technique synthétique `no-email@chatbot.mapaproperty.lu` côté insertion DB (ligne 117), invisible côté chat. **Conforme**.
- **Mentions "Brebion"** : aucune. Real Estate Director désigné "Julien" partout (lignes 77, 82, 86, 89, 92, 99). **Conforme**.
- **Honoraires répétés** : « **Exclusif 3,5%, Semi 4,0%, Simple 4,5%** » (lignes 79 FR, 88 DE, 94 FR). **Reproduit les mêmes divergences C-02 et C-03** que la knowledge base. Double surface à corriger.

---

## 3. Cohérence inter-sources — synthèse

| Item | Site (messages/services) | Chatbot KB | Fallback route | Verdict |
|---|---|---|---|---|
| Exclusif | 3% | 3,5% | 3,5% | **Chatbot à corriger** |
| Semi-Exclusif | 4% | 4,0% | 4,0% | OK |
| Simple | 5% | 4,5% | 4,5% | **Chatbot à corriger** |
| Autonome | 1% | sur devis | (non cité) | **Chatbot à corriger** |
| Bëllegen Akt 40k | « par acquéreur, sans primo » (sources internes) | « par primo-acquéreur » | (non cité) | **Chatbot à corriger** |
| Droits LU 7% | OK | OK | OK | OK |
| TVA neuf 3% | OK | OK | OK | OK |
| AML loi 12.11.2004 | Blog 1 + sources | OK | OK | OK |
| 24 communes / 28 villes | OK | OK | (non cité) | OK |
| Tel/email en clair | Non | **Non** | **Non** | OK (Phase A-bis tenue) |
| Mention "Brebion" | Articles blog (auteur) | **Non** | **Non** | À arbitrer pour blog |

---

## 4. Recommandations (par sévérité)

### HAUT — divergences chiffrées entre chatbot et site
1. **C-02 / C-03 / C-04** : aligner `components/chatbot/chatbot-knowledge.ts` (3 langues) et `app/api/chatbot/route.ts:73-100` sur la grille **3 / 4 / 5 / 1 %** déjà en place dans `messages/fr.json` lignes 171-177. Risque actuel : prospect contradicté entre une page et le chatbot — perte de confiance.
2. **C-01** : corriger la formulation Bëllegen Akt dans `chatbot-knowledge.ts` (FR L.50 + L.55, EN L.137) pour retirer « primo-acquéreur » et reprendre « par acquéreur, résidence principale, sans condition d'âge ni de primo-accession (loi du 3 juillet 2025) » — exactement la formule de `lib/legal/honoraires.ts:75`.

### MOYEN
3. **C-05** : reformuler « Pack Vidéo inclus » en « Pack Vidéo en option déductible » pour Exclusif, cohérent avec `messages/fr.json:368`.
4. **B-01** : arbitrer (donneur d'ordre) : maintenir "Julien Brebion" comme auteur explicite signé sur les articles (acceptable comme signature d'auteur), ou retirer le nom de famille pour stricte conformité au brief. Si on garde, mettre à jour le brief AGENTS.md pour documenter l'exception « signature auteur sur article ».
5. **B-02** : choisir entre `/blog/<slug>` et `/journal/<slug>` côté URL — l'index s'appelle "Le Journal" mais les permaliens sont sur `/blog`. Décision SEO/branding requise.

### FAIBLE / INFO
6. Compléter `messages/*.json` (ou un nouvel objet `lib/honoraires-rates.ts` source unique) pour : mandat de recherche 1-3%, mise en location 1 mois, gestion locative 6-8% — actuellement seuls cités dans le chatbot, sans source de vérité partagée. Risque de dérive à long terme.

---

## 5. Récapitulatif sécurité contenu

| Check | Résultat |
|---|---|
| Tel en clair (chatbot) | **Aucun** |
| Email en clair (chatbot) | **Aucun** |
| Tel en clair (blog) | **Aucun** |
| Email en clair (blog) | **Aucun** |
| Mention "Brebion" (chatbot) | **Aucune** |
| Mention ".com" (chatbot) | **Aucune** (mention "jamais .com" présente, conforme) |
| Adresse Dudelange (chatbot) | **Aucune** (mention "n'apparaît que dans pages légales") |
| Sources articles | Officielles (STATEC, Observatoire de l'Habitat, AED, BCE, Min. Logement, TEGoVA, Vauban/ISL/St. George's) |

— fin de l'audit.
