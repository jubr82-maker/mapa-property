-- ============================================================================
-- MAPA Property — Migration 12 mai 2026
-- Tracking anonymisé des vues biens (dashboard analytics).
--
-- À APPLIQUER MANUELLEMENT dans Supabase SQL Editor (Julien).
-- Idempotent : peut être rejoué.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.property_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  locale TEXT,
  referer TEXT
);

CREATE INDEX IF NOT EXISTS idx_property_views_property_id
  ON public.property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_viewed_at
  ON public.property_views(viewed_at);

-- Anti-doublon : 1 vue / visitor_hash / property_id / jour
CREATE UNIQUE INDEX IF NOT EXISTS uq_property_views_daily
  ON public.property_views(property_id, visitor_hash, (viewed_at::date));

ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- Insert via anon (clé publique) autorisé pour permettre le tracking
DROP POLICY IF EXISTS pv_public_insert ON public.property_views;
CREATE POLICY pv_public_insert
  ON public.property_views
  FOR INSERT
  WITH CHECK (TRUE);

-- Lecture réservée aux admins authentifiés
DROP POLICY IF EXISTS pv_admin_read ON public.property_views;
CREATE POLICY pv_admin_read
  ON public.property_views
  FOR SELECT
  TO authenticated
  USING (TRUE);
