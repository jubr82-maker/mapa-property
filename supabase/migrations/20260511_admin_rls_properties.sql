-- ============================================================================
-- MAPA Property — RLS admin sur properties & property_images
-- 11 mai 2026 (V3). Permet à un utilisateur authentifié (admin connecté)
-- de lire tous les biens (incluant les is_published = false).
-- Idempotent.
-- ============================================================================

ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;

-- Si une policy publique restrictive existe déjà, on la préserve.
-- On ajoute uniquement une policy "authenticated_read_all" pour le BO admin.

DROP POLICY IF EXISTS "properties_authenticated_read_all" ON public.properties;
CREATE POLICY "properties_authenticated_read_all"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "properties_authenticated_update" ON public.properties;
CREATE POLICY "properties_authenticated_update"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

ALTER TABLE IF EXISTS public.property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_images_authenticated_read_all" ON public.property_images;
CREATE POLICY "property_images_authenticated_read_all"
  ON public.property_images
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Indexes utiles pour le BO
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured_partial
  ON public.properties (is_featured)
  WHERE is_featured = TRUE;
