-- POL2-10 — Vidéo de présentation des biens.
--
-- Ajoute une colonne `video_url text` sur les biens standards ET
-- off-market. L'URL pointe vers un fichier hébergé dans le bucket
-- Supabase Storage public "property-videos" (cf.
-- docs/admin/VIDEO_UPLOAD_GUIDE.md) ou tout CDN public (webm/mp4/mov).
--
-- Idempotent. NON appliqué automatiquement — Julien l'exécute via la
-- console Supabase / CLI. Tant que la colonne n'existe pas, le code
-- public traite l'absence/undefined comme « pas de vidéo » (le composant
-- PropertyVideo ne rend rien) sans planter.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE properties_offmarket
  ADD COLUMN IF NOT EXISTS video_url text;
