# Guide — Vidéo de présentation des biens (POL2-10)

Ce document décrit l'infrastructure vidéo des fiches biens (standards et
off-market) et la procédure manuelle d'upload, en attendant l'upload
drag-and-drop natif (différé — voir « Suite »).

## 1. Colonne base de données

Migration : `supabase/migrations/20260519_properties_video_url.sql`
(idempotente, **NON appliquée automatiquement** — Julien l'exécute via
la console Supabase ou la CLI).

```sql
ALTER TABLE properties            ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE properties_offmarket  ADD COLUMN IF NOT EXISTS video_url text;
```

Tant que la colonne n'existe pas, le code public traite l'absence comme
« pas de vidéo » : le composant `PropertyVideo` ne rend rien, aucune
fiche ne plante.

## 2. Bucket Supabase Storage `property-videos`

**À créer manuellement dans la console Supabase** (Storage → New bucket).
Ne PAS créer le bucket par script / migration.

| Paramètre            | Valeur                                                     |
| -------------------- | ---------------------------------------------------------- |
| Nom du bucket        | `property-videos`                                          |
| Visibilité           | **Public** (lecture anonyme — vidéos servies sur les fiches)|
| Convention de nommage| `property-videos/{property_id}/{uuid}.{ext}`               |
| Formats acceptés     | `webm`, `mp4`, `mov`                                        |
| Taille max par fichier | **100 MB**                                               |

`{property_id}` = l'`id` UUID du bien (table `properties` ou
`properties_offmarket`). `{uuid}` = un UUID v4 généré par fichier (évite
les collisions / cache busting). `{ext}` = extension réelle du fichier.

Exemple d'URL publique finale (à coller dans le champ admin) :

```
https://<projet>.supabase.co/storage/v1/object/public/property-videos/<property_id>/<uuid>.mp4
```

## 3. Procédure d'upload (manuelle, Phase actuelle)

1. Console Supabase → Storage → bucket `property-videos`.
2. Créer (si absent) un dossier nommé avec l'`id` UUID du bien.
3. Uploader le fichier vidéo (≤ 100 MB, webm/mp4/mov), renommé en UUID.
4. Copier l'**URL publique** du fichier.
5. Back-office :
   - **Bien standard** : `/admin/properties/{id}` → section « Vidéo de
     présentation » → coller l'URL → Enregistrer.
   - **Bien off-market** : édition de la fiche → onglet « 3 · Contenu &
     Visuel » → section « Vidéo de présentation » → coller l'URL →
     Enregistrer.
6. Vérifier le rendu via « Aperçu public ↗ » : la vidéo apparaît dans la
   galerie (vignette + bouton lecture), clic → lightbox plein écran avec
   contrôles natifs.

> **Cas Steinfort** : l'upload de la vidéo du bien Steinfort est une
> étape manuelle de Julien post-déploiement. Tant que `video_url` est
> `null`, la fiche affiche la galerie photo normale, sans placeholder
> cassé.

## 4. Comportement du composant `PropertyVideo`

`components/property/PropertyVideo.tsx` :

- Affiché dans la galerie (≈ 480 px desktop / pleine largeur mobile, 16:9).
- Bouton lecture au survol ; clic → lightbox modale plein écran avec
  contrôles natifs.
- Lazy : monté via `IntersectionObserver` (la balise `<video>` n'est
  chargée qu'à l'entrée dans le viewport).
- `preload="metadata"`, `playsInline`, `controls`, **pas** d'autoplay.
- `poster` si une image de couverture est fournie.
- `video_url` `null`/absent ⇒ le composant **ne rend rien** (aucun
  placeholder cassé).

## 5. Suite (différé — Phase B)

L'upload drag-and-drop natif (sélection fichier dans le back-office →
upload direct vers le bucket Storage + génération automatique de l'URL
publique + barre de progression) est documenté comme **follow-up Phase
B**. La passe POL2-10 livre le champ **URL à coller** (addition de
formulaire minimale et sûre) côté biens standards ET off-market. Voir
`docs/admin/PHASE_B_BACKLOG_2026-05-18.md`.
