# MAPA Property V28 FINAL13 — SESSION 13b (hotfix)

**Cache-buster :** `?v=final13s13b`
**Scope :** Hotfix images blog + correction texte Off Market

---

## 🐛 Corrections Session 13b

### 1. Images de couverture remplacées

Les 3 images génériques (voiture moderne pour article Vendre, salon anonyme pour Off Market, château européen pour Vivre) étaient hors-sujet pour un site immobilier luxembourgeois.

**Nouvelles images (photos authentiques Luxembourg Unsplash) :**

| Article | Image | Description |
|---|---|---|
| **Article 1** · Vendre au Luxembourg | [photo-1588336899284-950764f07147](https://images.unsplash.com/photo-1588336899284-950764f07147?w=1600&q=85) | Vue aérienne Luxembourg City (Cedric Letsch) |
| **Article 2** · Off Market | [photo-1681300011982-5f01aca8b5d6](https://images.unsplash.com/photo-1681300011982-5f01aca8b5d6?w=1600&q=85) | Rue Ville-Haute avec église (Tom Podmore) |
| **Article 3** · Vivre au Luxembourg | [photo-1662239936406-522b4f82546a](https://images.unsplash.com/photo-1662239936406-522b4f82546a?w=1600&q=85) | Alzette qui traverse le Grund (Alena Praslova) |

Toutes sous licence Unsplash (usage commercial libre, sans attribution requise).

### 2. Correction article 2 Off Market

**Avant** (FR) : "l'intermédiaire qui tentait de lui racheter son propre bien"
**Après** (FR) : "l'intermédiaire qui tentait de lui **faire racheter** son propre bien"

Corrections équivalentes appliquées :
- **EN** : "trying to buy back their own" → "trying to **make them buy back** their own"
- **DE** : "versuchte, sein eigenes Objekt **zurückzukaufen**" → "der **ihm sein eigenes Objekt zurückverkaufen wollte**"

### 3. Fichiers mis à jour

- `content/article-2-fr.html` (inchangé, déjà correct)
- `content/article-2-en.html` (corrigé)
- `content/article-2-de.html` (corrigé)
- `sql/02-insert-blog-posts.sql` (régénéré avec corrections + nouvelles images)

---

## 🚀 Déploiement

**Tu n'as qu'à réexécuter `sql/02-insert-blog-posts.sql`** dans le SQL Editor Supabase. Il commence par un `DELETE FROM` idempotent puis réinsère les 3 articles avec les bonnes versions. **Le `01-alter-blog-posts.sql` ne doit PAS être réexécuté** (les colonnes existent déjà).

Pour le site, drag & drop le dossier `mapa-v28-FINAL13-session13b/` dans Netlify.

---

## 📂 Delta vs Session 13

| Fichier | Change |
|---|---|
| `content/article-2-en.html` | 1 phrase corrigée |
| `content/article-2-de.html` | 1 phrase corrigée |
| `sql/02-insert-blog-posts.sql` | Régénéré (textes + 3 nouvelles images) |
| `index.html` | cache-buster `?v=final13s13b` |
| `js/app.js` | version console Session 13b |

---

*Build Claude Opus 4.7 — Session 13b — 24 avril 2026*
