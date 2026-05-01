# MAPA Property V28 FINAL11 — Changelog

**Date :** 22 avril 2026
**Cache-buster :** `?v=final11`

---

## 🎯 Objectif de cette release

Refonte complète des **4 mandats de vente** inspirée du site Horus Immobilier, avec adaptation à l'image prestige MAPA (pas de TikTok/athome, canaux premium uniquement). Ajout d'un système de **demande de mandat par mailto** avec modale de contact dédiée et texte pré-rempli adapté au type de mandat.

---

## ✅ Tous les correctifs demandés

### 1. Orphelin "exclusif" (À Propos)
- `&nbsp;` inséré entre "plus" et "exclusifs" en FR/EN/DE
- `text-wrap:pretty` et `hyphens:none` en CSS pour sécurité
- Résultat : le mot "exclusifs" remonte à la ligne précédente

### 2. ACHETER — retrait off-market & Location
- Texte "Consulter nos biens disponibles" : retrait de "off-market" et "location"
  - FR : "Vous pouvez aussi parcourir ci-dessous nos biens actuellement en vente."
  - EN/DE traductions alignées
- Onglet "Location" masqué (`display:none`) — reste le défaut "Vente" uniquement

### 3. Carte du Luxembourg améliorée
- Nouveau tracé SVG avec orientation nord-sud plus fidèle
- ViewBox réduit (400×560 au lieu de 500×700) pour plus de netteté
- Pins repositionnés selon la topographie réelle :
  - Diekirch au nord (108)
  - Mersch au centre
  - Hobscheid/Saeul/Kaerjeng/Koerich/Steinfort à l'ouest
  - Luxembourg-Ville emphase navy au centre-sud
  - Dudelange/Bettembourg au sud
  - Mondorf à l'est (Moselle)
- Tronçon frontière est accentué (dashed copper, opacity .4)

### 4. Refonte des 4 mandats de vente

Chaque mandat a maintenant :
- **Bandeau commission + durée** (grille 2 colonnes navy/copper)
- **Introduction** (2-3 paragraphes expliquant le principe)
- **Liste détaillée "en détail"** (style checkmarks copper)
- **Spécificités** (engagements, règles rémunération, etc.)
- **Note Pack Média** (optionnel, italique, encart copper)
- **Bouton CTA mailto** pleine largeur gold

#### Mandat Autonome — 1% + TVA
- 12 inclusions (découverte, estimation, passeport énergétique, conseil prix, AML, compromis, notaire, clés, pack média option)
- 6 exclusions explicites (photos pro, publication, pub RS, visites, négociation)
- Bouton : "✦ Demander un Mandat de vente Autonome →"

#### Mandat Exclusif — 3% + TVA
- 18 inclusions (tout ce qui était dans Autonome + photos pro + publication + pub réseaux + visites + négociation + pack média)
- Section "Pourquoi choisir l'exclusif ?" (4 arguments)
- Bouton : "✦ Demander un Mandat de vente Exclusif →"

#### Mandat Semi-Exclusif — 4% + TVA
- 19 inclusions (identique à Exclusif + la liberté de vendre en privé)
- Engagements du Mandant (2 points)
- Règle de rémunération
- Bouton : "✦ Demander un Mandat de vente Semi-Exclusif →"

#### Mandat Simple — 5% + TVA
- 12 inclusions (version plus légère : pas d'énergétique offert, pas d'envoi dossier notaire, etc.)
- Règle de rémunération
- À prendre en compte (moins de mobilisation)
- Bouton : "✦ Demander un Mandat de vente Simple →"

### 5. Système "Demander un mandat" (mailto)

Nouvelle modale `m-mandat-request` (compact 640px) avec :
- Hero + eyebrow "Demande de mandat de vente"
- Champs : Prénom, Nom, Email, Téléphone (préfixes internationaux via select `phone-pfx`)
- Encart récap du mandat choisi (nom + commission)
- Case RGPD obligatoire
- Bouton "✦ Envoyer ma demande" (gold) + "Annuler" (line)

Comportement `submitMandatRequest()` :
1. Valide tous les champs (nom/prénom/email/tel/RGPD)
2. Construit le mailto :
   - `to` : j.brebion@mapagroup.org, admin@mapagroup.org
   - `cc` : email du client
   - `subject` : "Demande de Mandat de vente [Type] — [Prénom Nom]"
   - `body` : texte adapté au type :
     ```
     Bonjour,
     Je suis intéressé par votre Mandat de vente [Type] (commission X% + TVA).
     Pourriez-vous me contacter afin d'en discuter ?
     
     Mes coordonnées :
     • Nom : ...
     • Prénom : ...
     • E-mail : ...
     • Téléphone : ...
     
     Merci.
     ```
3. **Bonus** : si table `mandat_requests` existe dans Supabase, tracking automatique du lead en parallèle (mailto reste la méthode principale)

### 6. CSS mandats (250 lignes ajoutées)

Nouvelles classes :
- `.mand-price-box` / `.mpb-row` / `.mpb-ey` / `.mpb-val` / `.mpb-tva` / `.mpb-dur-val` / `.mpb-note` — bandeau commission
- `.mand-incl-list` / `.mand-opt` / `.opt-ast` — liste inclusions (grid auto-fill, checkmarks copper)
- `.mand-excl-list` — liste exclusions (croix grise)
- `.mand-pack-note` — note italique pack média
- `.mpage-compact` — modale mandat-request 640px
- `.mreq-recap` / `.mreq-rgpd` / `.mreq-note` — formulaire demande
- Responsive mobile (<720px) : grids passent en 1 colonne

### 7. i18n FR/EN/DE
- 157 nouvelles clés × 3 langues = **471 traductions ajoutées**
- Toutes les inclusions, exclusions, commissions, CTAs, modale request

---

## 📋 Tests recommandés

### Desktop

1. Ouvre VENDRE → clique sur chacun des 4 mandats
2. Chaque modale doit afficher :
   - Bandeau commission correct (1% / 3% / 4% / 5%)
   - Liste des inclusions avec checkmarks copper
   - Bouton "Demander un Mandat de vente X"
3. Clique sur "Demander un Mandat de vente Autonome"
4. La modale `m-mandat-request` s'ouvre avec récap "Mandat Autonome · Commission 1% + TVA"
5. Remplis : Prénom "Julien", Nom "Test", Email "test@test.lu", Tel "+352 691 111 111", coche RGPD
6. Clique "Envoyer ma demande"
7. Ton client mail (Mail.app / Outlook / Gmail) s'ouvre avec :
   - À : j.brebion@mapagroup.org, admin@mapagroup.org
   - Cc : test@test.lu
   - Objet : "Demande de Mandat de vente Autonome — Julien Test"
   - Corps : texte pré-rempli avec les coordonnées
8. Sur la page À Propos, le mot "exclusifs" ne tombe plus orphelin
9. Sur ACHETER, il n'y a plus d'onglet Location (juste les biens Vente)

### Mobile (via --bind 0.0.0.0)

1. Mandats : bandeau commission passe en 1 colonne
2. Listes inclusions : 1 colonne
3. Modale mandat-request : formulaire lisible, select préfixes fonctionnel
4. Clavier tél : affiche le pavé numérique
5. Mailto : ouvre Mail.app sur iPhone

---

## ⚠️ Points d'attention

### Tracking Supabase (optionnel, pour plus tard)

Si tu veux tracker les demandes de mandats, crée cette table dans ton SQL Editor Supabase :

```sql
CREATE TABLE IF NOT EXISTS mandat_requests (
  id BIGSERIAL PRIMARY KEY,
  mandat_type TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  lang TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE mandat_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert" ON mandat_requests
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Admin read" ON mandat_requests
FOR SELECT TO authenticated USING (true);
```

**Sans cette table, le mailto fonctionne quand même** — le code JS gère l'erreur silencieusement (try/catch). Tu as donc le choix : créer la table pour tracker les leads, ou juste utiliser le mailto.

### Pack Média
Le "Pack Média" est mentionné en option pour les Mandats 2/3/4 (style Horus) mais **n'est pas encore détaillé** dans une modale dédiée. Si tu veux, on peut créer une modale `m-pack-media` en FINAL12.

### Carte Luxembourg
La carte reste une **silhouette stylisée** — pas un tracé cartographique 100% exact. Si tu veux une carte parfaite avec les 102 communes réelles et frontières précises, il faudrait intégrer un SVG officiel (je peux le faire en FINAL12 avec un tracé Wikimedia CC0).

---

## 📂 Structure ZIP

```
mapa-v28-FINAL11/
├── index.html                      (2306 lignes, +220 depuis FINAL10)
├── css/styles.css                  (2089 lignes, +226)
├── js/
│   ├── app.js                      (3252 lignes, +118)
│   ├── i18n.js                     (3094 lignes, +333 pour 471 clés)
│   └── supabase.js
├── sitemap.xml                     (15 URLs)
├── robots.txt
├── _redirects                      (Netlify)
├── AUDIT-SEO-2026.md
├── CONFORMITE-RGPD-AML-2026.md
├── CHANGELOG-FINAL9.md
├── CHANGELOG-FINAL11.md            (ce fichier)
└── README.md
```

*Build Claude Opus 4.7 — 22 avril 2026*
