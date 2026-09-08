-- ============================================================================
-- MAPA Property — Off-market : distinction Vente / Location
-- 8 septembre 2026. Idempotent.
--
-- CONTEXTE : properties_offmarket n'a aujourd'hui aucun champ transaction
-- (vente/location) — cf. diagnostic session du 2026-09-08. La table
-- classique `properties` porte déjà `transaction TEXT` avec les valeurs
-- 'sale' | 'rent' | 'offmarket' (cf. lib/types.ts). On aligne la colonne
-- off-market sur les mêmes valeurs 'sale'/'rent' pour réutiliser telles
-- quelles les clés i18n tx_sale / tx_rent déjà en place.
--
-- Défaut 'sale' : backfill implicite des lignes existantes en "Vente" —
-- à corriger manuellement en BO pour les biens réellement en location.
--
-- A APPLIQUER MANUELLEMENT dans Supabase Studio (SQL Editor), après
-- sauvegarde. Non exécutée par Claude Code.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colonne transaction sur properties_offmarket
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.properties_offmarket
  ADD COLUMN IF NOT EXISTS transaction TEXT NOT NULL DEFAULT 'sale';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_offmarket_transaction_check'
  ) THEN
    ALTER TABLE public.properties_offmarket
      ADD CONSTRAINT properties_offmarket_transaction_check
      CHECK (transaction IN ('sale', 'rent'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. VIEW publique — ajout de `transaction` en fin de SELECT.
--    CREATE OR REPLACE VIEW suffit ici (ajout de colonne en queue, pas de
--    réordonnancement) : pas besoin de DROP + CREATE contrairement à la
--    migration 20260701e qui insérait des colonnes au milieu.
-- ----------------------------------------------------------------------------
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

  title,
  title_en,
  title_de,
  COALESCE(short_pitch, '')             AS short_description,
  short_pitch_en,
  short_pitch_de,
  description,
  description_en,
  description_de,
  highlights,
  highlights_en,
  highlights_de,

  price_mode,
  COALESCE(price_label, price_display, 'Prix sur demande') AS price_label,
  price_display,
  price_custom_text,
  price_on_demand,
  CASE WHEN price_on_demand THEN NULL ELSE price_estimate END AS price_estimate,
  CASE WHEN price_on_demand THEN NULL ELSE price_min END      AS price_min,
  CASE WHEN price_on_demand THEN NULL ELSE price_max END      AS price_max,

  CASE WHEN photos_locked THEN NULL ELSE cover_image_url END AS cover_image_url,
  CASE WHEN photos_locked THEN NULL ELSE gallery_urls END    AS gallery_urls,
  CASE WHEN photos_locked THEN NULL ELSE video_url END       AS video_url,

  status,
  created_at,
  display_order,
  is_coup_de_coeur,
  composition_commerces,
  composition_bureaux,
  composition_logements,

  -- AJOUT 2026-09-08 : distinction Vente / Location.
  transaction
FROM public.properties_offmarket
WHERE is_published = TRUE AND status = 'published';

-- ── Vérifications post-migration ──
-- 1) Colonne présente sur la table de base :
--    SELECT column_name, data_type, is_nullable, column_default
--    FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'properties_offmarket'
--      AND column_name = 'transaction';
-- 2) Colonne exposée par la vue publique :
--    SELECT id, reference, transaction FROM public.properties_offmarket_public LIMIT 5;
