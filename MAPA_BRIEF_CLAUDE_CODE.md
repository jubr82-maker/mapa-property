# MAPA Property — Brief technique complet pour Claude Code

> **Note d'utilisation** : copie-colle l'intégralité de ce document dans une session Claude Code fraîche, dans un dossier vide. Claude Code va construire le projet en suivant les sections dans l'ordre. Lance les commandes au fur et à mesure qu'il te les propose. Toujours valider avec `npm run dev` après chaque grande étape.

---

## 0. Identité du projet

**Nom** : MAPA Property — site immobilier de prestige
**Client** : Julien Brebion, Real Estate Director — MAPA Synergy Sàrl
**Domaine cible** : `mapaproperty.lu` (jamais `.com`)
**Email contact** : `j.brebion@mapagroup.org`
**Téléphone** : `+352 691 620 127`
**HQ public** : "Luxembourg" (jamais "Dudelange" en frontal — Dudelange uniquement dans Mentions légales / CGU / CGV / Honoraires / RGPD)
**Lieu RDV public** : "Luxembourg-Ville, sur site (dans le bien visité), à votre domicile, ou en visioconférence"

Ce projet est une **refonte cosmétique** d'un site v28 existant déjà en production sur la même base Supabase. Aucune table à créer. Lecture seule + écriture uniquement dans `leads` (cf. section 7). Le v28 reste intouché.

---

## 1. Stack technique imposée

```
Next.js 15 (App Router)
TypeScript strict
Tailwind CSS v4
shadcn/ui (sélectif)
next-intl pour i18n FR/EN/DE
Supabase JS v2 (lecture + écriture leads uniquement)
Resend (à brancher quand clé API dispo)
Cloudflare Turnstile sur tous les formulaires
Vercel Analytics + Speed Insights
Hébergement : Vercel (Hobby tier gratuit)
DNS + WAF + Turnstile : Cloudflare devant Vercel
Versioning : GitHub
```

**Pas de Redux, pas de Zustand**, on reste sur React Context + Server Components.
**Pas de framer-motion lourd**, animations via Tailwind transitions + quelques `view-transitions` natives.

---

## 2. Variables d'environnement (`.env.local`)

```bash
# Supabase (anon key publique, sans risque)
NEXT_PUBLIC_SUPABASE_URL=https://dutfkblygfvhhwpzxmfz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dGZrYmx5Z2Z2aGh3cHp4bWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTcxMTMsImV4cCI6MjA5MTA5MzExM30.iauOM8aJhvdMCD1Cz4TzFLBTDKLO5tUc_fb1rTuUxrQ

# Email (à compléter quand dispo)
RESEND_API_KEY=
MAPA_NOTIFICATION_EMAIL=j.brebion@mapagroup.org

# Cloudflare Turnstile (créer sur dash.cloudflare.com → Turnstile → Add site)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Mistral AI pour le chatbot (gratuit sur console.mistral.ai)
MISTRAL_API_KEY=
# Fallback Groq (gratuit sur console.groq.com)
GROQ_API_KEY=

# Site
NEXT_PUBLIC_SITE_URL=https://mapaproperty.lu
```

---

## 3. Schéma Supabase existant (à NE PAS modifier)

Tables déjà créées en prod, RLS configuré pour lecture anonyme :

### Tables lues
- `properties` — 16 biens publiés (transaction: sale/rent/offmarket, country, city, title_fr/en/de, description_fr/en/de, price, surface, bedrooms, bathrooms, badge, parking, terrace_surface, land_surface, living_surface, year, energy, is_featured, featured_order, is_published)
- `property_images` — 187 photos (property_id, url, sort)
- `properties_offmarket` — biens off (id, title, internal_ref, country, city_label, surface_hab, surface_terrain, bedrooms, bathrooms, energy_class, price_display, short_pitch, description, highlights, cover_image_url, gallery_urls, is_published, display_order)
- `reviews` — avis clients (name, rating, comment, review_date, is_published)
- `blog_posts` — articles (title_fr/en/de, excerpt_fr/en/de, content_fr/en/de, cover_image, published_at, is_published, slug, author, primary_tag, tags, faq_fr/en/de, meta_title, meta_description)
- `interest_rates` — dernière ligne BCL (rates jsonb avec fixed_5/10/15/20/25/30 et variable, reference_month, source)

### Table écrite (UNIQUEMENT)
- `leads` — colonnes : id, email, first_name, last_name, phone, message, type, property_ref, source, lang, country, city, status (default 'new')

**RLS confirmées OK** pour SELECT anon sur les 6 tables lues. Pour `leads`, la policy d'INSERT anonyme doit exister — si elle n'existe pas, créer côté client une edge function Supabase `submit-lead` qui passe la service_role key côté serveur.

---

## 4. Storage Supabase (buckets publics)

```
Videos/mapa_showcase_new.mp4    → vidéo hero (13.59 MB, déjà compressée)
photos/IMG_2461.jpg             → photo Julien Brebion (64 KB)
property-images/                → si jamais des images custom uploadées (vide actuellement, prévoir le case)
property-media/                 → vidéos de biens (1 fichier policy déjà)
blog-covers/                    → covers articles blog (3 policies)
Documents/MAPA_Honoraires.pdf   → PDF honoraires officiel à servir
Logo/                           → logos (vide, on en parle plus bas)
```

Helper TypeScript à créer dans `lib/supabase-url.ts` :
```typescript
export const sbUrl = (bucket: string, path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
```

---

## 5. Identité visuelle — palette dorée brillante

**Remplacer toute la chartreuse (#C8E15B) par une palette dorée stylée et brillante.**

### Light mode (défaut)
```css
--bg:           #F5F0E6;  /* ivoire chaud premium */
--bg-deep:      #E8DFC9;  /* ivoire deeper */
--bg-soft:      #F0E9D8;  /* élévation cards */
--ink:          #0D0F12;  /* presque noir, légère teinte bleutée */
--ink-mid:      #2C2E33;
--ink-soft:     #5C5E66;
--gold:         #C9A24E;  /* or principal — riche, mat */
--gold-bright:  #E5C77A;  /* or éclat — highlights, hover */
--gold-deep:    #8E6F30;  /* or profond — CTAs sur clair */
--gold-shine:   #F2D88E;  /* or brillant — accents lumineux */
--accent-warm:  #B8865A;  /* cuivre brand MAPA, usage modéré */
--line:         rgba(13,15,18,0.18);
--line-strong:  rgba(13,15,18,0.32);
```

### Dark mode
```css
--bg:           #0F0E0B;  /* noir chaud, jamais noir pur */
--bg-deep:      #0A0908;
--bg-soft:      #1A1612;
--ink:          #F5F0E6;  /* ivoire pour texte */
--ink-mid:      #BFB59E;
--ink-soft:     #847B65;
--gold:         #E5C77A;  /* or plus brillant en dark */
--gold-bright:  #F2D88E;
--gold-deep:    #C9A24E;
--gold-shine:   #FAE6A8;
--accent-warm:  #C99868;
--line:         rgba(245,240,230,0.14);
--line-strong:  rgba(245,240,230,0.28);
```

### Effet "or brillant" pour CTAs et accents

```css
.gold-shine {
  background: linear-gradient(135deg,
    var(--gold-deep) 0%,
    var(--gold) 30%,
    var(--gold-shine) 50%,
    var(--gold-bright) 70%,
    var(--gold) 100%);
  background-size: 200% 200%;
  animation: shimmer 8s ease infinite;
}
@keyframes shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.gold-text {
  background: linear-gradient(135deg, var(--gold-deep), var(--gold-shine), var(--gold));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

### Garde-fou contraste (CRITIQUE)

**Règle absolue** : jamais de texte sombre sur fond sombre, jamais clair sur clair.
Implémenter dans `lib/contrast.ts` un helper qui retourne automatiquement la bonne couleur de texte pour chaque background. Tester systématiquement chaque section dans les 2 modes avant validation.

### Typographies
```
Display : Big Shoulders Display (700, 900) — titres XL brutaliste
Sans    : Archivo (300, 400, 500, 600, 700) — corps de texte
Mono    : JetBrains Mono (400, 500) — labels, refs, coords
```

Charger via `next/font/google` dans `app/layout.tsx`.

---

## 6. Architecture des fichiers Next.js

```
mapa-property/
├── app/
│   ├── [locale]/                          # routing i18n
│   │   ├── layout.tsx                     # header + footer + ThemeProvider + LangProvider
│   │   ├── page.tsx                       # home
│   │   ├── biens/
│   │   │   ├── page.tsx                   # tous les biens (grid filtrable)
│   │   │   └── [slug]/page.tsx            # fiche bien individuelle (plein écran)
│   │   ├── off-market/
│   │   │   ├── page.tsx                   # liste off-market
│   │   │   └── [id]/page.tsx              # fiche off-market
│   │   ├── services/
│   │   │   ├── vendre/page.tsx
│   │   │   ├── acheter/page.tsx
│   │   │   ├── louer/page.tsx
│   │   │   ├── estimer/page.tsx           # estimateur enrichi
│   │   │   ├── simulateurs/page.tsx       # 3 calculateurs
│   │   │   └── marches-actifs/page.tsx    # 24 communes LU + 28 villes intl
│   │   ├── mandats/
│   │   │   ├── exclusif/page.tsx
│   │   │   ├── semi-exclusif/page.tsx
│   │   │   ├── simple/page.tsx
│   │   │   ├── autonome/page.tsx
│   │   │   └── recherche/page.tsx
│   │   ├── qui-sommes-nous/page.tsx       # storytelling Julien + agence
│   │   ├── blog/
│   │   │   ├── page.tsx                   # liste articles
│   │   │   └── [slug]/page.tsx            # article format livret swipable
│   │   ├── contact/page.tsx
│   │   └── legal/
│   │       ├── mentions-legales/page.tsx
│   │       ├── cgu/page.tsx
│   │       ├── cgv/page.tsx               # à rédiger NEUF (cf. section 12)
│   │       ├── rgpd/page.tsx
│   │       └── honoraires/page.tsx
│   ├── api/
│   │   ├── chatbot/route.ts               # proxy vers Mistral + Groq fallback
│   │   ├── lead/route.ts                  # POST → Supabase + Resend
│   │   ├── estimate/route.ts              # logique estimateur server-side
│   │   └── bcl-rates/route.ts             # fetch taux BCL (cron daily)
│   ├── globals.css                        # variables CSS + Tailwind base
│   └── robots.txt / sitemap.xml           # générés
├── components/
│   ├── layout/
│   │   ├── Header.tsx                     # nav + logo + lang + theme + burger
│   │   ├── Footer.tsx                     # 4 colonnes + légal + social
│   │   ├── MobileMenu.tsx
│   │   └── PageWrapper.tsx                # wrapper avec close button intelligent
│   ├── home/
│   │   ├── Hero.tsx                       # vidéo + brackets + nouveau titre
│   │   ├── SearchBar.tsx                  # recherche manuelle/IA selon device
│   │   ├── FeaturedCarousel.tsx           # 6 coups de cœur swipable
│   │   ├── CoverageGrid.tsx               # 4 typologies hover-flip
│   │   ├── ServicesTable.tsx              # 6 expertises
│   │   ├── OffMarketBand.tsx
│   │   ├── MandatesGrid.tsx               # 4 cards hover-flip
│   │   ├── MarketsSection.tsx             # 24 LU + 28 intl
│   │   ├── StatsBand.tsx                  # 4 chiffres dark
│   │   ├── ProcessTable.tsx               # 3 étapes
│   │   ├── QuoteBand.tsx
│   │   ├── ReviewsCarousel.tsx            # avis swipable
│   │   ├── BlogTeaser.tsx                 # 3 derniers articles
│   │   └── ContactCTA.tsx
│   ├── property/
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyGrid.tsx
│   │   ├── PropertyDetail.tsx             # fiche complète full screen
│   │   ├── PropertyGallery.tsx            # carousel photos + vidéo
│   │   ├── PropertyDownloadBtn.tsx        # téléchargement PDF
│   │   └── FavoriteHeart.tsx              # localStorage pour MVP
│   ├── chatbot/
│   │   ├── ChatbotWidget.tsx              # bulle visible en permanence
│   │   ├── ChatbotPanel.tsx               # ouverture
│   │   └── chatbot-knowledge.ts           # base de connaissance MAPA
│   ├── ui/
│   │   ├── HoverFlipCard.tsx              # composant clé : recto/verso au hover
│   │   ├── GoldButton.tsx                 # bouton or shimmer
│   │   ├── LangSwitcher.tsx
│   │   ├── ThemeToggle.tsx                # jour/nuit avec icône SVG
│   │   ├── BackButton.tsx                 # ramène à la page précédente
│   │   ├── SVGIcons.tsx                   # toutes les icônes monochrome
│   │   └── Turnstile.tsx                  # wrapper Cloudflare
│   └── forms/
│       ├── ContactForm.tsx
│       ├── SellForm.tsx
│       ├── SearchMandateForm.tsx
│       └── EstimateForm.tsx               # multi-step
├── lib/
│   ├── supabase.ts                        # client browser
│   ├── supabase-server.ts                 # client server (RSC)
│   ├── supabase-url.ts                    # helper buckets
│   ├── i18n.ts                            # config next-intl
│   ├── tracking.ts                        # event tracker (POST → Supabase)
│   ├── pdf-generator.ts                   # @react-pdf/renderer pour fiches biens
│   └── contrast.ts                        # garde-fou contraste
├── messages/
│   ├── fr.json                            # ~800 clés
│   ├── en.json
│   └── de.json
├── public/
│   ├── icons/                             # SVG monochrome only
│   ├── og/                                # images Open Graph FR/EN/DE
│   └── ...
├── middleware.ts                          # i18n routing + locale detection
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 7. Décisions tranchées (à respecter sans ré-arbitrer)

| Sujet | Décision |
|---|---|
| **Leads** | INSERT direct dans `public.leads` Supabase. Email mailto en parallèle EN ATTENDANT que Resend soit configuré. Quand `RESEND_API_KEY` est présente, basculer sur Resend. |
| **Chatbot LLM** | Mistral Small (gratuit, 1 req/sec) en principal, Groq Llama 3.3 70B (gratuit) en fallback automatique. Edge function Next.js qui essaie Mistral puis Groq si erreur. |
| **Hébergement** | Vercel Hobby (gratuit). DNS + WAF + Turnstile chez Cloudflare devant. |
| **Tracking analytics** | Vercel Analytics + Speed Insights (gratuit, RGPD-friendly, sans cookies). + table custom `analytics_events` (à créer plus tard) pour tracking détaillé. Pas de Google Analytics au démarrage (lourd, RGPD compliqué). |
| **Compte utilisateur favoris** | localStorage uniquement pour MVP. Pas d'auth Supabase au démarrage. Le cœur sur une fiche stocke l'ID en local. |
| **Téléchargement fiches** | PDF généré côté client avec `@react-pdf/renderer`, format A4 propre, pré-formaté MAPA. |
| **Vidéo dans fiches biens** | Champ `video_url` à lire depuis `properties.video_url` si existe (sinon ignoré). À ajouter colonne plus tard via SQL si pas présente. |
| **Recherche IA mobile** | Barre de recherche unique sur desktop = filtres manuels (ville, type, prix). Sur mobile = champ texte libre + envoi à `/api/chatbot` avec prompt système "interprète et retourne JSON {city, type, max_price}". |
| **Format multi-fichiers** | Oui, structure ci-dessus. Pas de monolithique. |
| **Logo** | Voir section 14. |

---

## 8. Internationalisation FR/EN/DE

**Toute** chaîne visible doit être dans `messages/{locale}.json`. Aucune string en dur dans les composants.

Structure des clés (exemple) :
```json
{
  "nav": {
    "buy": "Acheter",
    "sell": "Vendre",
    "rent": "Louer",
    "services": "Services",
    "off_market": "Off-Market",
    "about": "Qui sommes-nous",
    "contact": "Contact"
  },
  "hero": {
    "eyebrow": "Lux. & Intl.",
    "title_line_1": "REAL ESTATE",
    "title_line_2": "THREE STEPS,",
    "title_line_3": "TOTAL CONTROL.",
    "subtitle": "Agence immobilière au Luxembourg · Broker international",
    "scroll": "Découvrir"
  },
  ...
}
```

**Toutes les versions** (FR base, EN, DE) doivent être rédigées **dès la première implémentation**. Pas de "TODO traduire plus tard".

Routing : `/fr/...`, `/en/...`, `/de/...`. Détection automatique langue navigateur, fallback FR. Switcher visible dans le header.

---

## 9. Header (specs précises)

**Hauteur** : 88px desktop, 64px mobile.
**Logo** : taille agrandie, à gauche. Format : voir section 14.

**Structure desktop** (gauche → droite) :
```
[LOGO] [séparateur or fin]
       [ACHETER ▾] [VENDRE ▾] [LOUER ▾] [SERVICES ▾] [OFF-MARKET] [ARCOVA] [QUI SOMMES-NOUS] [BLOG]
                                                                            [FR/EN/DE] [☀/☾] [CONTACT →]
```

Les `▾` sont des dropdowns au hover :
- ACHETER : Tous les biens · Mandat de recherche · Off-Market
- VENDRE : Mandat Exclusif · Semi-Exclusif · Simple · Autonome · Estimation
- LOUER : Trouver une location · Mise en location · Gestion locative
- SERVICES : Estimation · Simulateurs · Marchés actifs · Honoraires

**Structure mobile** :
```
[LOGO]                              [☀/☾] [☰]
```

Le burger ouvre un drawer plein écran avec tous les liens, lang switcher en bas, contact en bas.

**Comportement scroll** : header reste fixé. Background passe de transparent (au-dessus du hero) à `var(--bg)` opaque dès scroll > 60px.

**Texte** : ultra lisible, taille 14px desktop, 16px mobile. Police Archivo medium 500. Tracking-wide 0.05em.

---

## 10. Hero (specs précises)

```
Vidéo background : https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/Videos/mapa_showcase_new.mp4
Overlay : gradient ink → transparent → ink (60% opacité bottom)
4 brackets dorés en coins
Data corners : VOL.I MMXXVI / LIVE [time LU] / Frame 001 / 49°27'N

CONTENU :
- Pill or "Lux. & Intl."
- Eyebrow mono "Vente · Location · Off-Market · Trophy Assets"
- Titre 3 lignes (réduire taille de ~15% par rapport à actuel) :

    REAL ESTATE
    THREE STEPS,
    TOTAL CONTROL.

  → "REAL ESTATE" en blanc cassé
  → "THREE STEPS," en blanc avec stroke
  → "TOTAL CONTROL." en doré shimmer (gold-text class)

- Bouton scroll en bas
- Meta row : Catalogue · Segments · Couverture · Status
```

**Sous le hero, juste après** : la SearchBar (cf. section 11).

---

## 11. SearchBar sous le hero

**Comportement responsive** :
- Desktop / iPad large (>1024px) → mode **manuel** par défaut, toggle vers IA possible
- Mobile / tablette (<1024px) → mode **IA** par défaut, toggle vers manuel possible

### Mode manuel
```
[Pays ▾]  [Ville/Quartier]  [Type ▾]  [Budget ▾]  [Chambres ▾]  [RECHERCHER]
```
Submit → `/[locale]/biens?country=LU&city=Belair&type=appartement&budget_max=2000000&min_bedrooms=3`

### Mode IA
```
[Champ texte libre : "Décrivez le bien recherché..."]  [✨ Recherche IA →]
```
Submit → POST `/api/search-ia` qui appelle Mistral avec prompt système :
```
Tu es un assistant qui transforme une demande immobilière en filtres structurés.
Renvoie uniquement un JSON :
{
  "country": "LU|FR|...",
  "city": "...",
  "type": "appartement|maison|villa|immeuble|...",
  "transaction": "sale|rent|offmarket",
  "budget_max": number|null,
  "min_bedrooms": number|null,
  "min_surface": number|null,
  "must_have": ["terrasse", "parking", "..."]
}
```
Puis redirect vers `/biens` avec query string.

---

## 12. Documents juridiques (CRITIQUE — section juridique)

Julien dispose déjà de PDFs sur Supabase Storage `Documents/`. À récupérer et intégrer :

- `Documents/MAPA_CGU.pdf` (à uploader si pas présent)
- `Documents/MAPA_RGPD.pdf`
- `Documents/MAPA_Honoraires.pdf` ✓ déjà présent
- `Documents/MAPA_Mentions_Legales.pdf`
- `Documents/MAPA_Mandat_Recherche.pdf`
- `Documents/MAPA_Off_Market.pdf`

Pour chaque page légale : afficher le contenu HTML transcrit dans le site **+** lien "Télécharger le PDF officiel" en haut de page.

### CGV à rédiger NEUF (Julien n'en a pas)

**Mission** : rédiger des Conditions Générales de Vente solides et protectrices pour MAPA Synergy Sàrl, agence immobilière luxembourgeoise.

**Disclaimer obligatoire en haut du document** :
> *Ces CGV constituent une base de travail rédigée à titre indicatif. Elles doivent impérativement être validées et amendées par un avocat luxembourgeois inscrit au Barreau avant toute utilisation contractuelle effective. MAPA Synergy Sàrl recommande une revue juridique annuelle.*

**Structure CGV à rédiger** :

1. **Objet et champ d'application** — services agence (vente, achat, location, off-market, mandat de recherche)
2. **Identification du prestataire** — MAPA Synergy Sàrl, AE 10108681, RCS B241974, TVA LU 31988923, IBAN LU88 0019 5655 88 84 9000 BIC BCEELULL, adresse Dudelange
3. **Définitions** — Mandant, Mandataire, Acquéreur, Vendeur, Bien, Off-Market, NDA, Compromis, Acte authentique
4. **Formation du contrat** — devis, signature mandat, délai de rétractation 14 jours (consommateur)
5. **Obligations du mandataire** — moyens et non résultat, conformité AML/KYC loi 12.11.2004
6. **Obligations du mandant** — sincérité, exclusivité (selon mandat), non-concurrence pendant durée
7. **Honoraires** — barèmes officiels, conditions de paiement, exigibilité (notamment article-clé : "L'honoraire est dû dès lors que l'intervention de MAPA Property a contribué directement ou indirectement à la conclusion de l'opération, y compris si l'acquéreur a été présenté par MAPA et que la vente se conclut postérieurement à la fin du mandat dans un délai de 24 mois.")
8. **Pack Vidéo** — conditions, déduction
9. **Off-Market** — NDA obligatoire, exclusion totale de publication, sanctions en cas de divulgation
10. **Mandat de recherche** — exclusivité, avance sur frais, déduction
11. **Confidentialité** — engagement réciproque, durée 5 ans après fin de relation
12. **Propriété intellectuelle** — descriptifs, photos, vidéos, sont propriété MAPA, interdiction de réutilisation
13. **Responsabilité** — limitation aux dommages directs prévisibles, exclusion dommages indirects (perte de chance, préjudice commercial), plafond annuel = montant honoraires perçus
14. **Force majeure** — définition large
15. **AML/KYC** — droit de refus de prestation si client refuse de fournir documents requis
16. **Données personnelles** — renvoi RGPD
17. **Droit de rétractation** — 14 jours hors lieux commerciaux (consommateur)
18. **Réclamations** — médiateur de la consommation Luxembourg avant tout recours
19. **Cession** — interdite sans accord écrit
20. **Modification CGV** — préavis 30 jours
21. **Loi applicable** — droit luxembourgeois
22. **Juridiction** — tribunaux de Luxembourg, exclusion compétence
23. **Clause de sauvegarde** — nullité partielle ne vicie pas l'ensemble
24. **Anti-scraping** — clause explicite : "Toute extraction automatisée des données du site, notamment des descriptifs de biens, photographies, prix, est strictement interdite et constitue une violation du droit sui generis du producteur de bases de données (loi du 18 avril 2001) et une atteinte aux systèmes de traitement automatisé de données (article 509-1 du Code pénal luxembourgeois). Toute infraction fera l'objet de poursuites."

**Penser comme un avocat** : favoriser les clauses asymétriques en faveur de MAPA, mais rester dans les limites du droit luxembourgeois consommation.

### Révision CGU et RGPD existantes

Reprendre celles déjà rédigées dans le précédent essai et les renforcer dans le même esprit protecteur. Notamment :

**CGU** — ajouter :
- Clause anti-scraping forte (cf. ci-dessus)
- Clause "logging" : "Tout accès au site fait l'objet d'un enregistrement technique (IP anonymisée, timestamp, pages consultées). Ces données sont conservées 13 mois à des fins de sécurité et de prévention des abus."
- Clause IP : "Le code source du présent site, ainsi que sa structure, son design, ses contenus textuels et iconographiques, sont la propriété exclusive de MAPA Synergy Sàrl. Toute reproduction même partielle est interdite."

**RGPD** — vérifier que sont bien présents :
- Base légale pour chaque traitement
- DPO (si désigné, sinon mentionner que MAPA n'est pas tenue d'en désigner mais que Julien Brebion est référent)
- Droit à la portabilité
- Droit à l'oubli avec délai de réponse 30 jours
- CNPD comme autorité de recours

---

## 13. Texte fondateur (à utiliser tel quel, mot pour mot)

À placer en haut de la page **"Marchés actifs"** et **"Qui sommes-nous"**, et en variante courte sur la home :

> **MAPA Property est une agence immobilière luxembourgeoise et un broker (courtier) international.**
>
> Pour sécuriser la conformité juridique dans chaque juridiction, nous opérons à l'international **exclusivement en qualité de broker, sous mandat de recherche signé au Luxembourg**, avec des partenaires locaux sélectionnés et habilités.
>
> Cette approche nous permet d'accompagner nos clients sur des **Trophy Assets**, des **résidences secondaires de prestige**, des **investissements patrimoniaux** ou des **actifs off-market** dans les marchés les plus recherchés d'Europe, des Émirats et d'Amérique.
>
> Chaque recherche à l'international est traitée avec la même rigueur qu'au Grand-Duché : **due diligence locale, expertise notariale coordonnée, confidentialité contractuelle**.
>
> *— Source : MAPA Property (https://www.mapaproperty.lu) — © 2026. Tous droits réservés. Toute reproduction interdite.*

Le copyright doit apparaître discrètement (font-size 11px, color ink-soft) en bas de chaque page contenant ce texte.

---

## 14. Logo — recommandation

**Diagnostic honnête** : le wordmark actuel "MAPA PROPERTY" légèrement travaillé est faible visuellement. Il manque de signature.

**Trois options à présenter à Julien** :

**A. Monogramme M+P stylisé** : un "M" et un "P" entrelacés en SVG géométrique pur, doré shimmer. Compact, mémorable, fonctionne en favicon.

**B. Marque géométrique abstraite** : un losange ou un rectangle d'or contenant les initiales "MP" en finesse, façon marque de luxe (Hermès, FRED). Très chic, intemporel.

**C. Wordmark renforcé** : garder "MAPA" en très gros Big Shoulders 900, ajouter "PROPERTY" en mono très petit dessous, ajouter un **filet doré sous "MAPA"** comme signature. Less is more assumé.

**Reco Claude** : option **C** pour démarrer (rapide, cohérent avec brutalisme), avec option **A** ou **B** en évolution future si Julien fait faire un vrai branding par un designer.

Implémenter option C dès le départ. Mettre dans `components/Logo.tsx` un composant SVG inline (pas un PNG) pour que ça scale parfaitement et change de couleur en dark mode.

---

## 15. Chatbot "Eléna"

**Nom** : Eléna (suggéré par Claude — italianisant, classe, mémorable, doux).
**Avatar** : silhouette féminine SVG monochromatique très épurée, dorée.

**Visibilité** : bulle ronde dorée fixed bottom-right, **toujours visible**, taille 64px desktop / 56px mobile. Légère animation pulsation très subtile pour attirer l'œil.

**Déclenchement automatique** : après **10 secondes** sur n'importe quelle page (hors home), Eléna ouvre toute seule un message d'accueil contextuel :
- Sur fiche bien : "Souhaitez-vous le dossier complet de ce bien ?"
- Sur fiche off-market : "Cette propriété vous intéresse ? Je peux vous transmettre l'NDA."
- Sur page mandats : "Besoin d'aide pour choisir entre nos 4 formules ?"
- Sur page services : "Une question sur nos prestations ?"
- Par défaut : "Bonjour, je suis Eléna. Comment puis-je vous aider ?"

L'utilisateur peut fermer (croix). Un cookie `elena_dismissed=true` (durée 7 jours) empêche la ré-ouverture automatique.

**Architecture** :
- Composant `ChatbotWidget` côté client
- API route `/api/chatbot` qui :
  1. Reçoit historique conversation + message + lang + page contexte
  2. Construit prompt système avec base de connaissance MAPA
  3. Appelle Mistral Small via `https://api.mistral.ai/v1/chat/completions`
  4. Si erreur (rate limit, panne), fallback sur Groq `https://api.groq.com/openai/v1/chat/completions` avec Llama 3.3 70B
  5. Retourne la réponse au client

**Base de connaissance** dans `components/chatbot/chatbot-knowledge.ts` (~500 lignes, en FR/EN/DE) :
- Histoire MAPA depuis 2018, fondation 2020
- 4 mandats détaillés avec verbatim
- Off-Market : process 6 étapes, NDA, capacité financière
- Mandat de recherche LU/EU/Hors EU avec tarifs
- Honoraires complets (voir section 12)
- Estimation EVS multi-modèles
- Bëllegen Akt (40k/personne primo-acquéreur LU)
- Loi 21.09.2006 plafond loyer 5%
- TVA neuf 17% / réduit 3% jusqu'à 50k crédit
- Frais notaire ~7% LU dont 1% Bëllegen
- 24 communes LU couvertes (liste)
- 28 villes intl couvertes (liste)
- Différences vente / location / off-market
- Délais moyens transactions
- Documents AML/KYC requis

Le prompt système :
```
Tu es Eléna, assistante virtuelle de MAPA Property, agence immobilière luxembourgeoise et broker international (Julien Brebion, Real Estate Director, depuis 2018).

LANGUE : réponds STRICTEMENT en {lang} (fr, en, ou de selon la requête).

TON : professionnel, chaleureux, précis, jamais insistant. Comme un concierge de palace.

RÈGLES STRICTES :
- Tu connais TOUT sur MAPA Property (cf. base ci-dessous)
- Si tu ne sais pas, tu proposes le contact direct : +352 691 620 127 / j.brebion@mapagroup.org
- Tu n'inventes JAMAIS un bien, un prix, ou un détail légal
- Pour toute question fiscale précise, tu redirige vers un notaire
- Tu encourages doucement la prise de RDV ou le dépôt d'un mandat
- Réponses courtes, max 4 phrases, sauf si la question demande détail
- Jamais d'emoji
- Si on te demande de ne plus répondre, tu confirmes et tu te tais

[BASE DE CONNAISSANCE INJECTÉE ICI]
```

**Tracking lead chatbot** : si l'utilisateur écrit son email ou téléphone dans la conversation, déclencher automatiquement un POST `/api/lead` avec `source: 'chatbot'` et le contenu de la conversation en `message`.

---

## 16. Estimateur enrichi

Page `/services/estimer` avec formulaire multi-step (3 étapes) :

**Étape 1 — Le bien**
- Type (Appartement, Maison, Penthouse, Duplex, Villa, Immeuble, Terrain)
- Surface habitable (m²)
- Surface terrain (m²) si pertinent
- Surface terrasse / balcon (m²)
- Année construction
- État général (à rénover, bon, rénové, neuf)
- Classe énergétique (A à I)
- Chambres
- Salles de bain
- Parkings
- Vue / orientation (optionnel)

**Étape 2 — La localisation**
- Pays (default LU)
- Commune (autocomplete depuis la liste 24 communes LU)
- Adresse exacte (optionnel — tooltip "permet une estimation plus précise via géocoding")
- Code postal

**Étape 3 — L'acquisition (pour personnaliser les aides)**
- Acquisition seul ou à 2 ?
- Si à 2, deuxième personne âge
- Âge du(des) acquéreur(s)
- Première acquisition au Luxembourg ? (oui/non)
- Résidence principale ? (oui/non)
- Apport disponible (€)
- Revenus mensuels nets cumulés (€)
- Charges mensuelles cumulées (€)

**Calcul côté serveur** dans `/api/estimate/route.ts` :
1. Fetch dernière ligne `interest_rates` depuis Supabase
2. Si âge > 65 : exclure prêts > 20 ans automatiquement
3. Si âge entre 55 et 65 : exclure prêts > 25 ans
4. Calcul mensualité disponible = (revenus - charges) × 0.35
5. Retourner :
   - **Fourchette indicative** basse / centrale / haute (calcul hédoniste basé STATEC + Observatoire)
   - **Plan de financement** : capacité empruntable selon âge, frais notaire ~7%, mensualité, durée optimale
   - **Aides applicables** :
     - **Bëllegen Akt** si primo + résidence principale : abattement droits enregistrement 40 000 € par personne
     - **Aide étatique** si revenus < seuil (consulter site Logement.lu)
     - **Garantie d'État** si primo + revenus modestes
     - **PTZ équivalent luxembourgeois** : prêt climatique
     - **TVA réduite 3%** si neuf + résidence principale (jusqu'à 50 k€ crédit)
     - **Bëllegen Akt complémentaire** sous conditions
   - Toutes les aides doivent inclure : conditions précises, montant exact selon situation, lien vers source officielle

**Disclaimer obligatoire** sur la page :
> Notre simulateur vous donne une fourchette indicative. La visite la rend juste.
> Notre simulateur s'appuie sur les données publiques de l'Observatoire de l'Habitat (Ministère du Logement luxembourgeois), adaptées en continu par notre agence aux tendances du marché. Pour une valeur opposable, une visite par un de nos conseillers reste indispensable — c'est le seul moyen de tenir compte de la vue, l'orientation, l'agencement, l'état réel et les spécificités du bien.
>
> *— Source : MAPA Property — © 2026. Tous droits réservés. Toute reproduction interdite.*

---

## 17. Simulateurs (3 calculateurs)

Page `/services/simulateurs` avec 3 onglets :

**1. Mensualité de prêt**
- Inputs : capital, durée, taux (pré-rempli avec dernier taux BCL fixed_25)
- Outputs : mensualité, coût total, intérêts totaux, tableau d'amortissement

**2. Rendement locatif**
- Inputs : prix achat, loyer mensuel, charges annuelles, frais gestion
- Outputs : rendement brut, rendement net charges, rendement net après abattement fiscal LU 35%
- Alerte rouge si rendement brut > 5% : "Loyer probablement supérieur au plafond légal LU (5% du capital investi · loi 21.09.2006)"

**3. Capacité d'emprunt**
- Inputs : revenus nets mensuels, charges mensuelles, apport, durée
- Outputs : mensualité disponible (35% effort), capacité d'achat indicative (capital + apport + frais notaire)

**Disclaimer en bas** :
> Notre simulateur s'appuie sur les données publiques de l'Observatoire de l'Habitat (Ministère du Logement luxembourgeois) et les taux de référence de la Banque centrale du Luxembourg (BCL), adaptés en continu par notre agence aux tendances du marché. Outil indicatif uniquement, non contractuel.
>
> Plafond d'endettement 35% conformément aux recommandations BCL/CSSF. Plafond loyer 5% du capital investi (loi du 21 septembre 2006). Frais de notaire ~7% du prix d'acquisition au Luxembourg dont 1% Bëllegen Akt avec abattement éventuel.
>
> *— Source : MAPA Property — © 2026. Tous droits réservés. Toute reproduction interdite.*

**Fetch automatique taux BCL** : route `/api/bcl-rates` qui lit la dernière ligne de `interest_rates`. Champs `taux annuel %` pré-remplis avec les vraies valeurs (`fixed_5`, `fixed_10`, `fixed_15`, `fixed_20`, `fixed_25`, `fixed_30`, `variable`) selon la durée choisie.

---

## 18. Fiches biens — features détaillées

Chaque bien (vente/location et off-market) a sa page plein écran `/biens/[slug]` ou `/off-market/[id]`.

**Header** : header global du site reste en place.
**Hero fiche** : grande photo principale, infos overlay (titre, ville, prix, badge).
**Galerie** : carousel swipable de toutes les photos (depuis `property_images` triées par `sort`). + champ vidéo si `properties.video_url` existe (à ajouter en colonne SQL plus tard).
**Spécifications** : grid 4 colonnes avec icônes SVG mono (surface, chambres, sdb, DPE, parking, terrain, étage, année).
**Description** : texte long depuis `description_fr/en/de`.
**Caractéristiques** : liste à puces si `features` ou `highlights` existent.
**Localisation** : carte (à intégrer plus tard via Mapbox gratuit ou OpenStreetMap).
**Plan de financement** : encadré or avec mensualité estimée pour le prix affiché, en utilisant taux BCL réel + mode résidence principale assumé. Lien vers Simulateur complet.
**Avis** : 2 ou 3 avis pertinents tirés de `reviews`.
**Boutons d'action** :
- Cœur favori (localStorage, animation fill or)
- Télécharger PDF (génération `@react-pdf/renderer`)
- Imprimer (window.print + CSS print stylisé MAPA)
- Demander des informations (ouvre form lead)
- Off-market uniquement : "Demander le dossier complet (NDA)" → form spécial
**Footer fiche** : "Voir biens similaires" → grid 3 cards.
**Bouton retour** : flèche en haut à gauche, ramène à `/biens` ou `/off-market` ou page précédente selon source (history.back si possible).

---

## 19. Hover-flip cards (composant clé)

Composant `<HoverFlipCard>` utilisé partout où une info doit être révélée au survol :
- 4 mandats (recto = nom + taux, verso = description complète)
- 4 typologies couverture (recto = nom, verso = liste détaillée)
- 6 expertises (recto = titre, verso = détail)
- Avis clients (recto = nom + étoiles, verso = commentaire)

Implémentation CSS pure :
```css
.flip-card { perspective: 1000px; }
.flip-card-inner { transition: transform 0.7s; transform-style: preserve-3d; }
.flip-card:hover .flip-card-inner { transform: rotateY(180deg); }
.flip-card-back { transform: rotateY(180deg); }
```

Sur mobile (touch), un tap déclenche le flip, second tap = action (lien). Détection via `@media (hover: hover)`.

---

## 20. Carrousels swipables

Sur la home : carousel "6 coups de cœur" — biens où `is_featured=true`, triés par `featured_order`.

Implémentation : **swiper.js** ou natif CSS scroll-snap. Préférer scroll-snap CSS pour légèreté :
```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.carousel-item {
  flex: 0 0 80%;
  scroll-snap-align: center;
}
@media (min-width: 768px) {
  .carousel-item { flex: 0 0 33%; }
}
```

Boutons flèches gauche/droite visibles en or, qui scrollent de la largeur d'une card.

Lien "Voir tous nos biens" en or shimmer sous le carrousel → `/biens`.

---

## 21. Articles blog format livret

Chaque article `/blog/[slug]` s'affiche comme un **livret swipable** :

- Page 1 : couverture pleine page (cover_image + titre énorme + auteur + date)
- Page 2..N : contenu paginé automatiquement (split par H2)
- Navigation : flèches gauche/droite + clavier ← → + swipe mobile
- Indicateur en bas : "Page 2 / 7"
- Croix de fermeture en haut à droite : ramène à `/blog` (page précédente)

Implémentation : composant `<BookletReader>` qui prend un HTML, le splitt par balises `<h2>`, et affiche une page à la fois avec transition slide.

Pour le sentiment "papier" : ombre portée fine, légère texture grain, padding généreux.

---

## 22. Tracking événements (préparation infrastructure)

**Pas implémenter au démarrage**, mais préparer le terrain :

Créer `lib/tracking.ts` avec API minimale :
```typescript
export const track = async (event: string, props?: Record<string, any>) => {
  // En MVP : juste console.log
  // Plus tard : POST vers /api/track qui INSERT dans analytics_events
  if (process.env.NODE_ENV === 'development') console.log('[track]', event, props);
};
```

Appeler dans tout le site sur événements clés :
- Vue de page (auto)
- Clic sur bien
- Clic mandat
- Téléchargement PDF
- Ouverture chatbot
- Submit formulaire
- Vue off-market
- Vue ARCOVA

Plus tard, créer la table Supabase `analytics_events` (id, event, props jsonb, ip_hash, user_agent, lang, locale, page_url, ts) et l'edge function `/api/track` côté serveur.

Pour la **géolocalisation** : utiliser headers `cf-ipcountry` que Cloudflare ajoute automatiquement quand le proxy est actif. Pas de pop-up consentement nécessaire pour pays seulement (donnée non personnelle). Pour ville/IP précise = consentement RGPD obligatoire.

---

## 23. SEO + GEO niveau maximal

**Sitemap.xml dynamique** : route `app/sitemap.ts` qui génère le XML depuis les biens, articles, pages statiques.

**Robots.txt** : route `app/robots.ts` permissif sauf `/admin*` et `/api/*`.

**JSON-LD** sur chaque page :
- Site entier : `RealEstateAgent` + `LocalBusiness` + `Organization`
- Personne : `Person` Julien Brebion
- Page bien : `Product` + `Offer` + `RealEstateListing`
- Page article : `BlogPosting` + `Article`
- FAQ : `FAQPage` avec 12 questions sur la home
- Avis : `Review` agrégés
- Breadcrumb sur toutes pages internes

**Open Graph** : image OG dédiée par locale + par page importante.

**Hreflang** : balises `<link rel="alternate" hreflang>` pour fr-LU, en-US, de-DE, x-default.

**Meta robots** : `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`.

**Geo meta** : `geo.region=LU-LU`, `geo.position=49.4811;6.0878`, `ICBM=49.4811, 6.0878`, `geo.placename=Luxembourg`.

**Performances** :
- Images en `next/image` (lazy automatique) — sur Vercel = optimisation gratuite
- Fonts en `next/font` (auto preload)
- Code split automatique App Router
- Score Lighthouse cible : 95+ Performance, 100 SEO, 100 Accessibility, 100 Best Practices

**Schemas** plus exotiques à intégrer :
- `Service` pour chaque mandat
- `OfferCatalog` pour la collection biens
- `WebSite` avec `SearchAction` pointant vers `/biens?q=`

---

## 24. Cloudflare Turnstile

Ajouter sur **tous les formulaires** :
- Contact général
- Demande mandat vendre
- Demande mandat recherche
- Demande off-market (NDA)
- Soumission lead chatbot
- Estimation

**Setup** :
1. Cloudflare Dashboard → Turnstile → Add Site → domaine `mapaproperty.lu`
2. Récupérer `site key` (public, dans `.env`) et `secret key` (server, dans `.env`)
3. Composant `<Turnstile />` injecté en bas de chaque form
4. API route valide token côté serveur avant de traiter le submit

**Style** : thème "auto" pour qu'il s'adapte au mode jour/nuit du site.

---

## 25. Anti-scraping & sécurité

**Côté code** :
- Ajouter dans `<head>` de chaque page :
  ```html
  <meta name="robots" content="noai, noimageai">
  <meta name="copyright" content="© 2026 MAPA Synergy Sàrl">
  ```
- Désactiver clic droit sur images : `oncontextmenu="return false"` (cosmétique)
- Lazy loading agressif des images sensibles
- Watermark discret en bas à droite des photos via CSS `::after` (signature MAPA en or 30% opacité)

**Côté Cloudflare (à configurer après déploiement)** :
- Bot Fight Mode (gratuit) → activer
- Rate Limiting Rules → max 60 req/min par IP
- WAF Custom Rules → bloquer les User-Agents connus de scraping (HTTrack, wget, curl si suspect)
- Cache Reserve si trafic explose

**Honnêteté technique** : il n'existe AUCUN moyen de cacher 100% le HTML/CSS/JS au navigateur. Ce qu'on peut faire :
1. Build Next.js → JS minifié et chunked (Webpack)
2. Source maps désactivées en prod
3. Noms de variables obfusqués par défaut en prod build
4. WAF Cloudflare devant pour filtrer

C'est le maximum raisonnable. Pas la peine de promettre l'impossible à Julien.

---

## 26. Day/night mode — garde-fou contraste

**Implémentation** : `next-themes` (lib légère, gère localStorage et system preference).

**Toggle** dans header : icône soleil (light) ou lune (dark) en SVG.

**Garde-fou critique** : audit avant validation finale.
Pour chaque section, tester dans les 2 modes :
- ✓ Texte ink sur bg → contraste OK
- ✓ Hover or sur bg dark → contraste OK
- ✗ Si jamais texte gris sur bg gris → corriger immédiatement

Helper `lib/contrast.ts` :
```typescript
export const ensureContrast = (bgVar: string, textVar: string) => {
  // En dev : warn si contraste WCAG AA < 4.5
  // À implémenter avec calcul ratio luminance
};
```

Utiliser systématiquement les variables CSS jamais des couleurs en dur.

---

## 27. Storytelling "Qui sommes-nous"

Page `/qui-sommes-nous` à rédiger en 3 langues, ton :
- Pas trop jeune, pas trop vieux
- Tech-natif (IA assumée comme partenaire de travail)
- Mystérieux, classe, racontée comme une histoire

**Trame narrative** (à rédiger en prose, pas en bullet) :

```
[Eyebrow] Depuis 2018

[H1 énorme] L'immobilier ne se vend pas.
            Il se confie.

[Paragraphe 1 — ouverture mystérieuse]
Il y a des transactions qui se font à la lumière. Et puis il y a celles qui se nouent dans le silence.
Depuis bientôt dix ans, MAPA Property opère dans l'ombre des plus belles cessions immobilières
luxembourgeoises et internationales. Nous sommes peu à le savoir. Et c'est très bien ainsi.

[Paragraphe 2 — L'origine]
Tout a commencé en 2018, dans les couloirs d'un environnement financier exigeant.
Julien Brebion y apprend une discipline : la précision, la discrétion, la lecture fine des intérêts.
Quand il fonde MAPA Property en 2020 à Luxembourg, ces trois mots deviennent une méthode.

[Paragraphe 3 — Le mandat de recherche, l'évidence américaine]
À l'image du buyer's agent américain qui défend l'acquéreur seul depuis des décennies,
nous croyons que le meilleur service immobilier se construit sur un mandat de recherche.
Pas un courtier qui sert deux maîtres. Un conseil qui ne défend qu'un intérêt à la fois.
Cette évidence outre-Atlantique, nous l'avons fait nôtre.

[Paragraphe 4 — Comment on travaille]
Nous travaillons avec les outils de notre époque. L'intelligence artificielle est notre alliée
quotidienne — pour analyser, structurer, anticiper. Mais elle ne remplace jamais l'œil d'un
conseiller dans une pièce. Notre métier, c'est la rencontre. Le reste n'est que technologie.

[Paragraphe 5 — La protection mutuelle]
Travailler ensemble est important. Protéger les intérêts de chacun par un cadre clair l'est davantage.
Mandat signé, missions définies, confidentialité contractuelle. C'est ainsi que nous tissons
les meilleurs partenariats. Et c'est ce qui explique notre efficacité.

[Paragraphe 6 — Discrétion]
Nous sommes là depuis bientôt dix ans. Nous avons accompagné plusieurs centaines de clients —
familles internationales, dirigeants, investisseurs institutionnels, family offices.
La plupart vous diraient qu'ils ne nous ont jamais vus à la lumière. C'est précisément le service
qu'ils sont venus chercher.

[Paragraphe 7 — Aujourd'hui]
MAPA Property est aujourd'hui une agence immobilière luxembourgeoise et un broker international.
Nous couvrons 24 communes au Grand-Duché et 28 villes premium dans le monde.
Nous opérons sous mandat, dans le cadre, et toujours dans l'intérêt exclusif de nos clients.

[CTA] Une conversation peut tout changer.
[Bouton or shimmer] Prendre rendez-vous →
```

À traduire en EN et DE avec le même registre — sobre, classe, efficace.

---

## 28. Marchés actifs — page complète

Page `/services/marches-actifs` :

**Section Luxembourg** (24 communes) :
Carte SVG du Luxembourg avec points cliquables (à intégrer plus tard, MVP = liste).
Liste cliquable : chaque commune → filtre `/biens?city=Belair`.

**Section International** (28 villes) :
Globe SVG ou carte du monde avec points (MVP = liste groupée par région).
Régions :
- France (Paris, Cannes, Nice, Saint-Tropez)
- Monaco
- Belgique (Bruxelles)
- Suisse (Genève, Zurich)
- Allemagne (Berlin, Munich)
- Italie (Milan, Rome)
- Espagne (Madrid, Barcelone, Marbella, Ibiza, Majorque, Baléares)
- Portugal (Lisbonne, Porto, Algarve)
- Émirats (Dubaï, Abu Dhabi)
- Amériques (New York, Miami, Cancún, Tulum)
- Océan Indien (Île Maurice)

**Texte d'introduction** : utiliser le **texte fondateur de la section 13** in extenso.

**Disclaimer** : "Cette liste reflète notre couverture régulière mais elle n'est pas restrictive : sous mandat, nous pouvons intervenir sur toute ville, région ou pays selon la nature de votre projet et la disponibilité de partenaires locaux qualifiés et de confiance."

---

## 29. Footer ultra pro

**Structure** : 4 colonnes desktop, 1 colonne mobile.

```
[LOGO grand]

[Colonne 1 — Services]                [Colonne 2 — L'agence]
- Vendre                              - Qui sommes-nous
- Acheter                             - Marchés actifs
- Louer                               - Mandats
- Off-Market                          - Honoraires
- Estimation                          - Blog
- Mandat de recherche                 - ARCOVA (bientôt)
- Simulateurs financiers

[Colonne 3 — Contact]                 [Colonne 4 — Légal]
- Appeler : +352 691 620 127          - Mentions légales
- Email : j.brebion@mapagroup.org     - CGU
- HQ : Luxembourg                      - CGV
- RDV : Luxembourg-Ville,             - RGPD
        sur site, à votre domicile,   - Honoraires PDF
        ou en visioconférence         - Politique cookies

[Séparateur or fin]

[Ligne base]
© 2025-2026 MAPA Property — MAPA Synergy Sàrl
agence immobilière au Luxembourg · broker international
                                              [LinkedIn] [Instagram] [Facebook] [TikTok]

[Petit texte ink-soft 11px tout en bas]
MAPA Property · Agence immobilière au Luxembourg · Broker (courtier) international ·
Contactez-nous pour toute prise de rendez-vous.
```

**JAMAIS dans le footer** : mention "Dudelange", numéros AE/RCS/TVA. Tout ça est dans Mentions légales uniquement.

---

## 30. Connexion Resend (à activer dès que clé dispo)

Quand `RESEND_API_KEY` est présente dans `.env.local` :

1. `npm install resend`
2. `lib/resend.ts` :
```typescript
import { Resend } from 'resend';
export const resend = new Resend(process.env.RESEND_API_KEY!);
```
3. Dans `/api/lead/route.ts`, après INSERT Supabase OK :
```typescript
await resend.emails.send({
  from: 'MAPA Property <noreply@mapaproperty.lu>',
  to: process.env.MAPA_NOTIFICATION_EMAIL!,
  subject: `Nouveau lead — ${type}`,
  html: emailTemplate(leadData),
  replyTo: leadData.email,
});
```
4. Templates HTML dans `lib/email-templates.ts` — design sobre, brand MAPA, en-tête doré.

**Setup Resend** (pour Julien) :
1. Créer compte sur resend.com
2. Vérifier domaine `mapaproperty.lu` (ajouter DNS records SPF, DKIM)
3. Créer API key, coller dans `.env.local` puis dans Vercel env vars

Tant que clé absente : INSERT Supabase only, pas de fallback mailto (lourd UX). Eléna chatbot peut prévenir "Votre demande a été enregistrée. Julien Brebion vous recontactera sous 24h."

---

## 31. Plan de livraison itératif

Claude Code travaillera **par étapes**. Ne pas tout faire d'un coup. Valider chaque étape avant de passer à la suivante.

**Étape 1 — Setup projet (30 min)**
```bash
npx create-next-app@latest mapa-property --typescript --tailwind --app --src-dir false
cd mapa-property
npm install @supabase/supabase-js next-intl next-themes
npm install -D @types/node
```
Configurer Tailwind avec les variables CSS de la section 5.
Mettre en place `next-intl` middleware.
Créer `.env.local` avec variables section 2.

**Étape 2 — Layout global (1h)**
- `app/[locale]/layout.tsx` avec ThemeProvider, IntlProvider, fonts
- Header complet (section 9)
- Footer complet (section 29)
- Mobile menu drawer
- Theme toggle fonctionnel
- Lang switcher fonctionnel

**Étape 3 — Home page (2h)**
- Hero avec vidéo Supabase + nouveau titre
- SearchBar (mode manuel desktop, IA mobile)
- Featured carousel (fetch live Supabase, max 6)
- Coverage grid hover-flip
- Services table
- Off-Market band
- Mandates grid hover-flip
- Markets section
- Stats band
- Process table
- Quote band
- Reviews carousel
- Blog teaser
- Contact CTA

**Étape 4 — Pages biens (2h)**
- `/biens` liste filtrable
- `/biens/[slug]` fiche complète plein écran
- Galerie + champ vidéo
- Boutons favori + télécharger PDF + imprimer
- Form de demande info

**Étape 5 — Pages off-market (1h)**
- `/off-market` liste
- `/off-market/[id]` fiche avec NDA form

**Étape 6 — Services + Mandats (2h)**
- 5 pages mandats (exclusif, semi, simple, autonome, recherche)
- Vendre, Acheter, Louer
- Estimer (multi-step section 16)
- Simulateurs (3 calculateurs section 17)
- Marchés actifs (section 28)

**Étape 7 — Pages contenu (2h)**
- Qui sommes-nous storytelling (section 27)
- Blog liste + article format livret (section 21)
- Contact form

**Étape 8 — Légal (3h)**
- Mentions légales
- CGU renforcées
- **CGV NEUVES** (rédaction complète section 12)
- RGPD renforcée
- Honoraires (avec PDF embedded)

**Étape 9 — Chatbot Eléna (3h)**
- ChatbotWidget visible permanent
- Panel d'ouverture
- Base de connaissance (~500 lignes)
- API route `/api/chatbot` avec Mistral + fallback Groq
- Trigger 10s + cookies dismiss

**Étape 10 — SEO + Sitemap + JSON-LD (2h)**
- Sitemap dynamique
- Robots.txt
- JSON-LD sur toutes pages
- Open Graph par page
- Hreflang

**Étape 11 — Sécurité (1h)**
- Cloudflare Turnstile sur tous forms
- Anti-scraping headers
- Watermark CSS sur photos

**Étape 12 — Polish + Audit (3h)**
- Audit contraste day/night sur chaque page
- Audit responsive mobile (320px → 1920px)
- Audit Lighthouse (cible 95+ partout)
- Tests de tous les forms
- Tests de tous les liens
- Vérification 3 langues complètes

**Étape 13 — Déploiement (1h)**
```bash
git init && git add . && git commit -m "Initial MAPA Property build"
gh repo create mapa-property --private
git push -u origin main
# Connecter à Vercel via dashboard, importer le repo
# Configurer env vars dans Vercel
# Déployer
```
Puis configurer DNS Cloudflare pour pointer `mapaproperty.lu` vers Vercel via CNAME proxified.

**Total estimé** : 23h de travail itératif avec Claude Code. Réalisable en 3-4 sessions de 6h.

---

## 32. Checklist finale avant pré-prod

- [ ] Toutes les pages existent dans les 3 langues
- [ ] Aucune string en dur (toutes via next-intl)
- [ ] Day/night : aucun problème de contraste sur aucune page
- [ ] Mobile 320px : aucun overflow horizontal
- [ ] Mobile 768px : aucun overflow horizontal
- [ ] Tablette 1024px : layout cohérent
- [ ] Desktop 1920px : layout cohérent
- [ ] Hero vidéo Supabase joue partout
- [ ] Photo Julien Supabase s'affiche
- [ ] 16 biens + 2 off-market remontent depuis Supabase
- [ ] Filtres /biens fonctionnent
- [ ] Fiche bien → galerie photos OK
- [ ] Bouton favori marche (localStorage)
- [ ] Téléchargement PDF marche
- [ ] Print CSS marche
- [ ] Form contact INSERT dans Supabase leads OK
- [ ] Form mandat recherche INSERT OK
- [ ] Form off-market NDA INSERT OK
- [ ] Estimateur calcule correctement
- [ ] Simulateurs marchent + taux BCL pré-rempli
- [ ] Chatbot Eléna : ouverture, conversation, fallback Groq
- [ ] Cloudflare Turnstile actif sur tous forms
- [ ] Sitemap.xml valide
- [ ] Robots.txt OK
- [ ] JSON-LD valide (tester via Schema.org validator)
- [ ] Open Graph affiché correctement (tester via opengraph.xyz)
- [ ] Hreflang présents
- [ ] Lighthouse Performance >90, SEO 100, Accessibility 100
- [ ] Vercel Analytics actif
- [ ] DNS Cloudflare configuré devant Vercel
- [ ] Mentions Dudelange uniquement dans légal
- [ ] Aucun emoji nulle part (uniquement SVG)
- [ ] URL toujours .lu jamais .com
- [ ] Texte fondateur (section 13) présent partout requis
- [ ] CGV nouvelles complètes avec disclaimer avocat

---

## 33. Notes critiques pour Claude Code

### À NE JAMAIS faire
- Inventer un nom de table Supabase qui n'existe pas (cf. section 3 pour la liste exhaustive)
- Mettre une string en dur sans passer par next-intl
- Utiliser une couleur hexa en dur (toujours via variables CSS)
- Mettre un emoji dans l'UI
- Écrire "Dudelange" hors pages légales
- Écrire "mapaproperty.com" — toujours `.lu`
- Écrire "BCL conforme" — utiliser le wording exact section 17
- Promettre une feature impossible à Julien
- Dire "TODO traduire" — toujours rédiger les 3 langues immédiatement

### À TOUJOURS faire
- Composants Server par défaut, Client uniquement si nécessaire (`'use client'` justifié)
- Images via `next/image`
- Liens via `next/link` avec `locale` correct
- Forms validés côté client ET côté serveur
- Try/catch sur tout fetch Supabase + fallback gracieux
- Console.log en dev pour debug, supprimer en prod
- Commit Git régulier avec messages clairs

### En cas de doute
- Tester en 3 langues avant validation
- Tester en day/night avant validation
- Tester en mobile avant validation
- Vérifier le contraste avec un outil (axe DevTools, Lighthouse)

---

## 34. Comptes à créer par Julien (en parallèle)

1. **GitHub** : créer repo privé `mapa-property` (pour versioning)
2. **Vercel** : compte Hobby gratuit, connecter au repo GitHub
3. **Cloudflare** : déjà existant. Activer Turnstile (Add Site → mapaproperty.lu) et récupérer site key + secret key
4. **Mistral AI** : créer compte sur console.mistral.ai (gratuit), créer API key
5. **Groq** : créer compte sur console.groq.com (gratuit), créer API key
6. **Resend** : créer compte sur resend.com, vérifier domaine mapaproperty.lu, créer API key (à finaliser plus tard)

Coller toutes les clés dans `.env.local` et dans Vercel env vars.

---

## 35. Évolutions futures (post-MVP)

À ne PAS faire dans cette première livraison, mais à prévoir :

- **Auth Supabase** : compte client avec favoris persistants, dashboard "mes recherches"
- **Tracking analytics custom** : table `analytics_events` + edge function
- **Carte interactive** Mapbox sur fiche bien
- **Module ARCOVA** (séparé)
- **Backoffice** dans `/admin` (déjà existant en v28, à brancher si besoin)
- **App mobile native** React Native si besoin
- **Notifications push** WebPush pour alertes nouveaux biens

---

## 36. Validation finale par Julien

Avant mise en pré-prod, faire valider à Julien :
- ✓ Couleurs dorées finales
- ✓ Logo (option C ou faire designer un vrai)
- ✓ CGV (avant de les considérer comme contractuelles, faire valider par avocat luxembourgeois)
- ✓ Storytelling Qui sommes-nous (ton, références US)
- ✓ Texte des disclaimers
- ✓ Réponses du chatbot Eléna (tester 20 questions types FR/EN/DE)

---

## FIN DU BRIEF

Bon courage. Ce site sera de très haut niveau si tu suis ce document méthodiquement. Ne saute pas d'étapes. Valide chaque section avant de passer à la suivante. En cas de doute sur une décision, **demande à Julien** plutôt que d'inventer.

— Brief préparé pour Claude Code, Mai 2026
