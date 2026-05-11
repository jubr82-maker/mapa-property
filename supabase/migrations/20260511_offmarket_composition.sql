-- ============================================================================
-- MAPA Property — Composition immeuble + mode prix + coup de cœur off-market
-- 11 mai 2026, soir (V2 brief). Idempotent.
-- ============================================================================

-- Composition immeuble : 3 arrays JSONB
ALTER TABLE IF EXISTS public.properties_offmarket
  ADD COLUMN IF NOT EXISTS composition_commerces JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS composition_bureaux JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS composition_logements JSONB DEFAULT '[]'::jsonb;

-- Mode prix : 'exact' | 'range' | 'custom' | 'on_request'
ALTER TABLE IF EXISTS public.properties_offmarket
  ADD COLUMN IF NOT EXISTS price_mode TEXT DEFAULT 'on_request',
  ADD COLUMN IF NOT EXISTS price_min NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS price_max NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS price_custom_text TEXT;

-- Coup de cœur off-market (équivalent is_featured pour Apimo)
ALTER TABLE IF EXISTS public.properties_offmarket
  ADD COLUMN IF NOT EXISTS is_coup_de_coeur BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_properties_offmarket_coup_de_coeur
  ON public.properties_offmarket (is_coup_de_coeur)
  WHERE is_coup_de_coeur = TRUE;

-- VIEW publique mise à jour
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
  price_mode,
  COALESCE(price_label, price_display, 'Prix sur demande') AS price_label,
  title,
  COALESCE(short_pitch, '')             AS short_description,
  CASE WHEN photos_locked THEN NULL ELSE cover_image_url END AS cover_image_url,
  status,
  created_at,
  display_order,
  is_coup_de_coeur,
  -- Composition immeuble : exposée en publique uniquement pour permettre
  -- l'agrégation des totaux (les détails confidentiels restent en JSONB,
  -- l'UI publique masquera tant que NDA pas signé).
  composition_commerces,
  composition_bureaux,
  composition_logements
FROM public.properties_offmarket
WHERE is_published = TRUE AND status = 'published';
