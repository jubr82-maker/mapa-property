# Audit Formulaires — 2026-05-12

Auditeur : Agent AUDIT 8 / Phase A-quinquies — mode lecture seule.
Cible : codebase `mapa-property-nextjs` (branche `main`, commit `b22375d` en prod).
Domaine de prod (preview) : `https://mapa-property-liard.vercel.app`.

---

## 1. Liste des formulaires (frontend)

| Composant | Endpoint POST | Pages où monté | Branché frontend |
|---|---|---|---|
| `components/forms/ContactForm.tsx` | `/api/lead` | `/[locale]/contact` (`type=general_contact`), `/[locale]/biens/[slug]` (`type=property_request`), `/[locale]/mandats/[type]` (`type=config.formType`) | OUI |
| `components/forms/NDAForm.tsx` | `/api/offmarket-request` | `/[locale]/off-market/[id]` | OUI |
| `components/forms/EstimateForm.tsx` | `/api/estimate` | `/[locale]/services/estimer` | OUI |
| `components/home/SearchBar.tsx` (input IA) | `/api/search-ia` | `/[locale]` (hero) | OUI |
| `components/chatbot/ChatbotWidget.tsx` | `/api/chatbot` | layout global | OUI |
| `components/ContactButtons.tsx` (reveal tel/email) | `/api/contact-reveal` | Header / pages contact | OUI |
| `components/property/PropertyViewTracker.tsx` | `/api/track-view` | `/[locale]/biens/[slug]` (et off-market) | OUI |
| (aucun) | `/api/arcova-waitlist` | aucune — la page `/[locale]/arcova` renvoie vers `/contact` (lien, pas de form) | NON — orphelin |
| (aucun) | `/api/mandate-request` | aucune — `mandats/[type]` utilise `ContactForm` → `/api/lead` | NON — orphelin |
| (aucun) | `/api/nda-offmarket` | aucune — `NDAForm` POSTe vers `/api/offmarket-request`, pas `/api/nda-offmarket` | NON — orphelin |
| (aucun) | `/api/contact` | aucun composant ne POSTe vers `/api/contact` (doublon historique de `/api/lead`) | NON — orphelin |

Sources : grep `fetch.*api/...` sur `components/ app/` → tous les POST listés ci-dessus ; pages : `app/[locale]/contact/page.tsx:35`, `mandats/[type]/page.tsx:192`, `biens/[slug]/page.tsx:346`, `off-market/[id]/page.tsx:215`, `services/estimer/page.tsx:28`.

---

## 2. Endpoints API — détail

### `/api/lead` (POST)
- Fichier : `app/api/lead/route.ts`
- Rate limit : OUI — `lib/rate-limit.ts` (in-memory, 5 req / 60 s par IP, namespace `lead`).
- Honeypot : **NON** (le commentaire d'en-tête n'évoque pas honeypot ; aucun appel `checkHoneypot`).
- Turnstile : OUI — `verifyTurnstile(body.turnstile_token, clientIp(req))`, retourne 403 si KO. Ordre documenté : rate-limit → parse → validate (`isEmail`/`type`) → Turnstile → INSERT.
- Validation : `isEmail(body.email)` + `body.type` non vide. Aucune contrainte de taille sur `message`, ni sanitization.
- Table INSERT : `leads`.
- Champs persistés : `email, first_name, last_name, phone, message, type, property_ref, source, lang, country, city`.
- Email Resend : **stub** (TODO ligne 78). `if (process.env.RESEND_API_KEY)` mais corps commenté.
- Codes : 200 / 400 (`invalid_email`, `missing_type`) / 403 (`turnstile_failed`) / 429 (`rate_limited`) / 500 (`db_error`).
- Cohérence avec `ContactForm.tsx` : OK. Le composant envoie `first_name, last_name, email, phone, message, type, source, property_ref, lang, turnstile_token`. **Le champ `subject` (showSubject=true côté page contact) est saisi côté UI mais N'EST PAS envoyé dans le payload** (non listé dans l'objet payload du ContactForm → perdu silencieusement). Bug mineur de remontée.

### `/api/contact` (POST)
- Fichier : `app/api/contact/route.ts`
- **Endpoint orphelin** : aucun composant ne POST vers `/api/contact`.
- Rate limit : OUI (5/60 s, namespace `contact`).
- Honeypot : OUI (`checkHoneypot(body.honeypot)`).
- Turnstile : OUI (`body.captchaToken`).
- Validation : `isEmail`, `name.length >= 2`.
- Table INSERT : `leads` avec `name` (champ unique, pas `first_name/last_name`).
- Email Resend : stub.
- Codes : 200 / 400 / 403 / 429 / 500.
- **Action recommandée** : supprimer (doublon historique de `/api/lead`).

### `/api/arcova-waitlist` (POST)
- Fichier : `app/api/arcova-waitlist/route.ts`
- **Endpoint orphelin** : la page `/[locale]/arcova` n'a PAS de formulaire — elle renvoie vers `/contact` via un `<Link>`. Pas de POST émis par le front.
- Rate limit : OUI (5/60 s, namespace `arcova`).
- Honeypot : OUI.
- Turnstile : OUI (`body.captchaToken`).
- Validation : `isEmail`, `first_name`, `last_name` requis.
- Table INSERT : `arcova_waitlist` (`source: arcova-landing`).
- Email Resend : stub.
- Codes : 200 / 400 / 403 / 429 / 500.

### `/api/mandate-request` (POST)
- Fichier : `app/api/mandate-request/route.ts`
- **Endpoint orphelin** : la page `mandats/[type]` utilise `ContactForm` → `/api/lead`, pas `/api/mandate-request`.
- Rate limit : OUI (5/60 s, namespace `mandate`).
- Honeypot : OUI.
- Turnstile : OUI (`body.captchaToken`).
- Validation : `isEmail`, `client_name` (composé de first/last ou direct).
- Table INSERT : `mandats_recherche` (`transaction_type ∈ {search,buy,sell,rent}`, default `search`, status `draft`).
- Email Resend : stub.
- Codes : 200 / 400 / 403 / 429 / 500.

### `/api/nda-offmarket` (POST)
- Fichier : `app/api/nda-offmarket/route.ts`
- **Endpoint orphelin** : `NDAForm` POSTe vers `/api/offmarket-request`. Personne ne POST vers `/api/nda-offmarket`.
- Rate limit : OUI (5/60 s, namespace `nda`).
- Honeypot : OUI.
- Turnstile : OUI (accepte `captchaToken` OU `turnstile_token`).
- Validation : `isEmail`, `full_name` (ou `name` legacy).
- Table INSERT : `nda_requests` (`source_ip`, `user_agent`, `status: pending`, retourne `nda_id`).
- Email Resend : stub.
- Codes : 200 / 400 / 403 / 429 / 500.

### `/api/offmarket-request` (POST)
- Fichier : `app/api/offmarket-request/route.ts`
- Branché frontend : OUI — `NDAForm.tsx`.
- Rate limit : OUI (5/60 s, namespace `offmarket-request`).
- Honeypot : OUI.
- Turnstile : OUI (accepte `captchaToken` OU `turnstile_token`).
- Validation : `isEmail`, `prenom`, `nom`, `property_id` (tous string).
- Tables INSERT : DEUX — d'abord `leads` (`type=offmarket_request`, récup `lead_id`), puis `offmarket_requests` (lien via `lead_id`). **Pas de rollback si la 2e INSERT échoue** → un lead peut rester orphelin.
- Email Resend : stub.
- Codes : 200 / 400 / 403 / 429 / 500.
- Cohérence avec `NDAForm.tsx` : OK (envoie `prenom, nom, email, telephone, criteres_precis, property_id, lang, turnstile_token`). Les champs `pays_recherche`, `ville_quartier`, `budget_max_eur`, `surface_souhaitee_m2` sont supportés côté API mais **pas remontés par le formulaire** (toujours `null` côté DB).

### `/api/contact-reveal` (POST)
- Fichier : `app/api/contact-reveal/route.ts`
- Anti-bot : blocage UA suspect (`curl|wget|python-requests|...`) avant tout traitement.
- Rate limit : OUI (5 / 15 min, namespace `contact-reveal`).
- Turnstile : **optionnel** (vérifié seulement si token fourni ET secret présent — UA + rate-limit considérés suffisants).
- Body validé : `type ∈ {phone, email}`.
- Source des coordonnées : `process.env.MAPA_PHONE`, `process.env.MAPA_EMAIL`, fallback "Voir mentions légales".
- Test live (Mozilla UA) : **200** `{"phone":"+352 691 620 127"}` — OK, MAPA_PHONE injecté.
- Test live (curl UA) : **403** `{"error":"forbidden"}` — OK, anti-bot fonctionne.
- Note RGPD : tel/email exposés dans Vercel env vars, jamais dans le repo public — conforme au commentaire en tête de fichier.

### `/api/estimate` (POST)
- Fichier : `app/api/estimate/route.ts`
- Pas de rate limit, pas de honeypot, pas de Turnstile (calcul local, lecture publique de `interest_rates`).
- Validation : `country`, `type`, `state`, `livingSurface > 0`.
- Pas d'INSERT en DB.
- Codes : 200 / 400.

### `/api/search-ia` (POST)
- Fichier : `app/api/search-ia/route.ts`
- Parsing heuristique côté serveur (TODO Mistral/Groq). Pas de rate limit, pas de Turnstile.
- Validation : `query` string non vide.
- Pas d'INSERT en DB.
- Codes : 200 / 400.

### `/api/chatbot` (POST)
- Fichier : `app/api/chatbot/route.ts`
- Rate limit : OUI (30/60 s, namespace `chatbot`).
- Pas de Turnstile (UX conversationnelle).
- Cascade : Mistral → Groq → fallback heuristique multilingue.
- **Auto-lead silencieux** : si email OU phone détecté dans la conversation utilisateur, INSERT `leads` (`type=chatbot`, `source=chatbot:<pageContext>`). Fire-and-forget. **Pas de Turnstile, pas de honeypot, pas de consentement** — point d'attention RGPD (cf. §5).
- Codes : 200 / 400 / 429.

### `/api/track-view` (POST)
- Fichier : `app/api/track-view/route.ts`
- Pas de rate limit (privé / interne — appelé par `PropertyViewTracker` au mount).
- Pas de Turnstile.
- Hash visiteur SHA-256(ip|UA) tronqué 32 chars.
- Table INSERT : `property_views`. Ignore `23505` (unique violation = vue déjà comptée) et `42P01` (table absente).
- Codes : 200 (toujours) / 400 (`missing_property_id`).

### `/api/health` (GET)
- Fichier : `app/api/health/route.ts`
- Test live : **200** `{"status":"ok","timestamp":"2026-05-12T15:50:56.846Z","db":true,"supabase_storage":true,"version":"b22375d"}`.

### `/api/cron/bce-rates` (GET, cron)
- Hors scope formulaires. Job nocturne.

---

## 3. Tests live (3 endpoints publics non-destructifs)

| Test | HTTP | Réponse | Verdict |
|---|---|---|---|
| `POST /api/contact-reveal` UA Mozilla `{type:"phone"}` | 200 | `{"phone":"+352 691 620 127"}` | OK |
| `POST /api/contact-reveal` UA curl `{type:"phone"}` | 403 | `{"error":"forbidden"}` | OK (anti-bot effectif) |
| `GET /api/health` | 200 | `{status:"ok", db:true, version:"b22375d"}` | OK |

Pas de test POST sur `/api/lead`, `/api/arcova-waitlist`, `/api/mandate-request`, `/api/nda-offmarket`, `/api/offmarket-request` (interdit — inséreraient en DB réelle).

---

## 4. Resend — configuration

- **Aucun import `resend` ou `Resend`** dans `lib/` ni `app/` (grep exhaustif négatif côté code applicatif ; les occurrences trouvées concernent seulement le test `if (RESEND_API_KEY)` et des logs `[stubbed]`).
- Variables d'env : `RESEND_API_KEY` (vide dans `.env.example`), `MAPA_NOTIFICATION_EMAIL=j.brebion@mapagroup.org`.
- Destinataire CRM affiché : `admin@mapagroup.org` (cf. `app/admin/settings/page.tsx:32`, `lib/legal/rgpd.ts` × 3 mentions).
- **Mismatch** : `.env.example` pointe vers `j.brebion@mapagroup.org`, l'admin settings et les mentions RGPD vers `admin@mapagroup.org`. À aligner avant déploiement.
- From : non défini (variable `RESEND_FROM` absente du repo).
- Templates : aucun. Tous les endpoints loggent `[Resend stubbed]` ou ont un TODO.
- DKIM/SPF : à valider via DNS (hors codebase).

**Conclusion** : la branche email Resend N'EST PAS branchée. Tous les formulaires INSERT en Supabase, mais aucune notification email n'est envoyée. C'est explicite (TODO assumé) mais bloquant pour le go-live.

---

## 5. Branche RGPD — tel / email

Vérifications transversales :

- `ContactForm` → `/api/lead` envoie `email` (validé), `phone` (optionnel, brut, pas de normalisation E.164). Stockés dans `leads.email` / `leads.phone`.
- `NDAForm` → `/api/offmarket-request` envoie `email`, `telephone` (requis côté UI), stockés dans `offmarket_requests.email` / `telephone` ET dupliqués dans `leads.email` / `phone`. **Duplication assumée** (cross-référencée via `lead_id`).
- `/api/contact-reveal` lit les env vars MAPA_PHONE / MAPA_EMAIL, jamais de PII en clair dans le repo (OK). UA + rate limit (5 / 15 min).
- `/api/chatbot` auto-lead : INSERT silencieux dès qu'un email OU phone est détecté dans la conversation. Pas de consentement explicite, **pas de mention dans `rgpd_notice` du chatbot** (à vérifier dans i18n) — point sensible RGPD.
- Notice RGPD UI : `ContactForm` et `NDAForm` affichent `t("rgpd_notice")` à côté du bouton submit, OK.
- Cases NDA / proof_of_funds : `NDAForm.tsx` vérifie côté client `nda_accepted && proof_of_funds`. **Mais le payload envoyé ne contient PAS ces flags** — le serveur insère `criteres_precis` qui concatène `[NDA] Accepté · [Capacité] Confirmée · …` (texte libre, pas booléen DB). L'endpoint `/api/nda-offmarket` (orphelin) lui sait persister `nda_accepted: boolean` dans `nda_requests` — incohérence d'architecture entre l'endpoint utilisé et l'endpoint conçu.

---

## 6. Erreurs / incohérences détectées

1. **Endpoints orphelins (4)** : `/api/contact`, `/api/arcova-waitlist`, `/api/mandate-request`, `/api/nda-offmarket`. Aucun composant ne les appelle. Soit (a) leur formulaire est à créer (Phase B), soit (b) ils doivent être supprimés.
2. **`/api/lead` perd le champ `subject`** (`showSubject=true` côté page contact) — non listé dans le payload. Bug mineur, donnée perdue.
3. **`/api/lead` pas de honeypot** — tous les autres endpoints publics en ont un. Incohérence.
4. **`NDAForm` envoie les confirmations NDA/proof_of_funds en texte libre** plutôt qu'en booléens — l'endpoint `/api/offmarket-request` ne sait pas les stocker en tant que tels, alors que `/api/nda-offmarket` (orphelin) le fait.
5. **`/api/offmarket-request` : pas de rollback** si la 2e INSERT (`offmarket_requests`) échoue après la 1re (`leads`) — risque de lead orphelin sans demande associée.
6. **`RESEND_API_KEY` jamais utilisée concrètement** : 6 endpoints possèdent `if (process.env.RESEND_API_KEY)` mais tous sont vides ou stubs. Bloquant déploiement si emails de notif attendus.
7. **Mismatch email destinataire** : `.env.example` → `j.brebion@mapagroup.org` ; admin settings + RGPD → `admin@mapagroup.org`.
8. **Chatbot auto-lead** : INSERT silencieux sans consentement explicite, à mentionner dans la politique RGPD du chatbot ou dans `t("rgpd_notice")`.
9. **`MAPA_PHONE` / `MAPA_EMAIL` dans `.env.example`** : contient les vraies valeurs en clair (`+352 691 620 127`, `j.brebion@mapagroup.org`). Pas un secret au sens cryptographique, mais perd l'intérêt du `contact-reveal` si une valeur prod est exposée. À retirer ou remplacer par des placeholders.
10. **Rate limit in-memory** (`Map<string, Bucket>`) — sur Vercel serverless avec instances multiples, le compteur n'est pas partagé. Le commentaire dans le fichier le reconnaît ("MVP, prod = Upstash/Cloudflare").

---

## 7. Recommandations (priorisées)

### Bloquants go-live
- **R1** Décider du sort des 4 endpoints orphelins :
  - Soit créer `ArcovaWaitlistForm`, `MandateRequestForm`, `NDAOffmarketForm`, et supprimer `/api/contact` (doublon `/api/lead`).
  - Soit supprimer ces 4 endpoints jusqu'à Phase B.
- **R2** Brancher Resend sur au moins 2 endpoints critiques : `/api/lead` + `/api/offmarket-request`. Destinataire `admin@mapagroup.org`, From `noreply@mapaproperty.lu`. Templates HTML simples.
- **R3** Aligner `MAPA_NOTIFICATION_EMAIL` (`.env.example`) sur `admin@mapagroup.org` (cohérence avec admin settings + RGPD).

### Importants
- **R4** Ajouter honeypot à `/api/lead` (cohérence avec les 5 autres POST).
- **R5** Inclure le champ `subject` dans le payload de `ContactForm` quand `showSubject=true`.
- **R6** Persister `nda_accepted` et `proof_of_funds` en booléens dans `offmarket_requests` (ou migrer `NDAForm` vers `/api/nda-offmarket`).
- **R7** Rollback / transaction sur `/api/offmarket-request` pour éviter les leads orphelins.

### Hygiène
- **R8** Retirer `MAPA_PHONE` / `MAPA_EMAIL` (valeurs réelles) de `.env.example` — mettre placeholders.
- **R9** Documenter le comportement chatbot auto-lead dans `t("rgpd_notice")` chatbot ou notice cookies.
- **R10** Migrer le rate-limit en Cloudflare Rate Limiting Rules (couche edge, partagée) ou Upstash Redis pour Vercel serverless.
- **R11** Sanitization / longueur max `message` (`/api/lead`, `/api/offmarket-request`) — limiter à 4000 chars pour éviter abus DB.

---

## 8. Synthèse

| Endpoint | Frontend lié | RL | HP | TS | INSERT | Resend | Status |
|---|---|---|---|---|---|---|---|
| /api/lead | ContactForm | OUI | NON | OUI | leads | stub | OK (subj perdu) |
| /api/contact | — | OUI | OUI | OUI | leads | stub | ORPHELIN |
| /api/arcova-waitlist | — | OUI | OUI | OUI | arcova_waitlist | stub | ORPHELIN |
| /api/mandate-request | — | OUI | OUI | OUI | mandats_recherche | stub | ORPHELIN |
| /api/nda-offmarket | — | OUI | OUI | OUI | nda_requests | stub | ORPHELIN |
| /api/offmarket-request | NDAForm | OUI | OUI | OUI | leads + offmarket_requests | stub | OK (pas de rollback) |
| /api/contact-reveal | ContactButtons | OUI (15min) | — | optionnel | — | — | OK (testé 200/403) |
| /api/estimate | EstimateForm | NON | NON | NON | — (pas d'écriture) | — | OK |
| /api/search-ia | SearchBar | NON | NON | NON | — | — | OK (heuristique) |
| /api/chatbot | ChatbotWidget | OUI (30/min) | NON | NON | leads (auto-lead) | — | OK (RGPD à doc) |
| /api/track-view | PropertyViewTracker | NON | — | — | property_views | — | OK |
| /api/health | (interne) | NON | — | — | — | — | OK (testé 200) |

Légende : RL = rate limit · HP = honeypot · TS = Turnstile.

**4 endpoints orphelins** + **Resend non branché** = bloquants identifiés pour le go-live.
