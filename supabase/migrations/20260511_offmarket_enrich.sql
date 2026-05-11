-- ============================================================================
-- MAPA Property — Enrichissement offmarket (11 mai 2026, soir)
-- Types détaillés (sub_type) + champs surfaces/pieces/exterieurs/parking.
-- Idempotent.
-- ============================================================================

ALTER TABLE IF EXISTS public.properties_offmarket
  ADD COLUMN IF NOT EXISTS sub_type TEXT,
  ADD COLUMN IF NOT EXISTS surface_utile INT,
  ADD COLUMN IF NOT EXISTS surface_ponderee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS bureaux INT,
  ADD COLUMN IF NOT EXISTS wc INT,
  ADD COLUMN IF NOT EXISTS douches INT,
  ADD COLUMN IF NOT EXISTS cuisine BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cuisine_m2 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS locaux_stockage INT,
  ADD COLUMN IF NOT EXISTS buanderie BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dressing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terrasse_m2 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS balcon_m2 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS jardin_m2 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS has_piscine BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parking_exterieur INT,
  ADD COLUMN IF NOT EXISTS parking_interieur INT,
  ADD COLUMN IF NOT EXISTS box INT,
  ADD COLUMN IF NOT EXISTS garage INT;

-- features : JSONB générique pour stocker les flags non triviaux. La colonne
-- existe peut-être déjà depuis 20260511_admin_offmarket.sql.
ALTER TABLE IF EXISTS public.properties_offmarket
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- VIEW publique mise à jour pour exposer les nouveaux champs non-confidentiels.
-- Les valeurs précises ne sont remontées que si is_published=TRUE / published.
CREATE OR REPLACE VIEW public.properties_offmarket_public AS
SELECT
  id,
  reference,
  country,
  COALESCE(city_label, 'Confidentiel') AS city_anonymized,
  property_type,
  sub_type,
  COALESCE(surface_hab, 0)             AS surface_habitable,
  surface_utile,
  surface_ponderee,
  surface_terrain,
  bedrooms                              AS chambres,
  bureaux,
  bathrooms                             AS salles_de_bain,
  douches,
  wc,
  cuisine,
  cuisine_m2,
  locaux_stockage,
  buanderie,
  dressing,
  terrasse_m2,
  balcon_m2,
  jardin_m2,
  has_piscine,
  parking_exterieur,
  parking_interieur,
  box,
  garage,
  energy_class                          AS classe_energetique,
  COALESCE(price_label, price_display, 'Prix sur demande') AS price_label,
  title,
  COALESCE(short_pitch, '')             AS short_description,
  CASE WHEN photos_locked THEN NULL ELSE cover_image_url END AS cover_image_url,
  status,
  created_at,
  display_order
FROM public.properties_offmarket
WHERE is_published = TRUE AND status = 'published';
