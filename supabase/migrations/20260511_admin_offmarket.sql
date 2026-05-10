-- ============================================================================
-- MAPA Property — Migration 11 mai 2026
-- BO Admin Off-Market : enrichissement du schéma + table de requests + RLS
--
-- À appliquer manuellement via Supabase Dashboard → SQL Editor.
-- Idempotent : peut être rejoué.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extension de properties_offmarket
--    Conserve les colonnes existantes (internal_ref, city_label, surface_hab,
--    energy_class, price_display, short_pitch, description, highlights,
--    gallery_urls, display_order) — ajoute les champs métier du brief.
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.properties_offmarket
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS city_real TEXT,
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS surface_terrain_ares NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_estimate NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS price_label TEXT DEFAULT 'Prix sur demande',
  ADD COLUMN IF NOT EXISTS prestations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS features JSONB,
  ADD COLUMN IF NOT EXISTS photos_locked BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS exclusive_until DATE,
  ADD COLUMN IF NOT EXISTS signed_mandate_url TEXT,
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requests_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_request_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Backfill reference depuis internal_ref (si fournie) ou OM-<8 hex>
UPDATE public.properties_offmarket
SET reference = COALESCE(reference, internal_ref, 'OM-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8)))
WHERE reference IS NULL;

ALTER TABLE public.properties_offmarket
  ALTER COLUMN reference SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_offmarket_reference
  ON public.properties_offmarket (reference);

CREATE INDEX IF NOT EXISTS idx_properties_offmarket_status
  ON public.properties_offmarket (status);

-- ----------------------------------------------------------------------------
-- 2. Trigger updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_offmarket_updated_at ON public.properties_offmarket;
CREATE TRIGGER trg_properties_offmarket_updated_at
  BEFORE UPDATE ON public.properties_offmarket
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. VIEW publique — uniquement les biens publiés, champs non-confidentiels
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.properties_offmarket_public AS
SELECT
  id,
  reference,
  country,
  COALESCE(city_label, 'Confidentiel') AS city_anonymized,
  property_type,
  COALESCE(surface_hab, 0)             AS surface_habitable,
  surface_terrain,
  bedrooms                              AS chambres,
  bathrooms                             AS salles_de_bain,
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

-- ----------------------------------------------------------------------------
-- 4. Table offmarket_requests — workflow demandes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offmarket_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties_offmarket(id) ON DELETE CASCADE,
  lead_id UUID,

  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  pays_recherche TEXT,
  ville_quartier TEXT,
  budget_max_eur NUMERIC(15,2),
  surface_souhaitee_m2 INT,
  criteres_precis TEXT,

  status TEXT NOT NULL DEFAULT 'pending',
  nda_url TEXT,
  notes_admin TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offmarket_requests_property_id
  ON public.offmarket_requests (property_id);

CREATE INDEX IF NOT EXISTS idx_offmarket_requests_status
  ON public.offmarket_requests (status);

CREATE INDEX IF NOT EXISTS idx_offmarket_requests_created_at
  ON public.offmarket_requests (created_at DESC);

DROP TRIGGER IF EXISTS trg_offmarket_requests_updated_at ON public.offmarket_requests;
CREATE TRIGGER trg_offmarket_requests_updated_at
  BEFORE UPDATE ON public.offmarket_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Compteur requests_count + last_request_at sur properties_offmarket
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bump_offmarket_requests_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.properties_offmarket
  SET requests_count = COALESCE(requests_count, 0) + 1,
      last_request_at = NOW()
  WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offmarket_requests_bump ON public.offmarket_requests;
CREATE TRIGGER trg_offmarket_requests_bump
  AFTER INSERT ON public.offmarket_requests
  FOR EACH ROW EXECUTE FUNCTION public.bump_offmarket_requests_count();

-- ----------------------------------------------------------------------------
-- 6. RLS — properties_offmarket
-- ----------------------------------------------------------------------------
ALTER TABLE public.properties_offmarket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offmarket_public_read" ON public.properties_offmarket;
CREATE POLICY "offmarket_public_read"
  ON public.properties_offmarket
  FOR SELECT
  USING (is_published = TRUE AND status = 'published');

DROP POLICY IF EXISTS "offmarket_admin_all" ON public.properties_offmarket;
CREATE POLICY "offmarket_admin_all"
  ON public.properties_offmarket
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 7. RLS — offmarket_requests
-- ----------------------------------------------------------------------------
ALTER TABLE public.offmarket_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offmarket_requests_public_insert" ON public.offmarket_requests;
CREATE POLICY "offmarket_requests_public_insert"
  ON public.offmarket_requests
  FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "offmarket_requests_admin_all" ON public.offmarket_requests;
CREATE POLICY "offmarket_requests_admin_all"
  ON public.offmarket_requests
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 8. Bucket Supabase Storage offmarket-photos (privé)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('offmarket-photos', 'offmarket-photos', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique pour les fichiers du bucket (seul l'admin uploade,
-- mais le site public a besoin de lire les cover_image_url des biens
-- non verrouillés via la VIEW publique).
-- NB : si on souhaite garder le bucket strictement privé, retirer ces
-- policies et utiliser des signed URLs côté serveur.
DROP POLICY IF EXISTS "offmarket_photos_public_read" ON storage.objects;
CREATE POLICY "offmarket_photos_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'offmarket-photos');

DROP POLICY IF EXISTS "offmarket_photos_admin_write" ON storage.objects;
CREATE POLICY "offmarket_photos_admin_write"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'offmarket-photos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'offmarket-photos' AND auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 9. Table offmarket_audit_log (audit minimal)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offmarket_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties_offmarket(id) ON DELETE SET NULL,
  request_id UUID REFERENCES public.offmarket_requests(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offmarket_audit_property_id
  ON public.offmarket_audit_log (property_id);

CREATE INDEX IF NOT EXISTS idx_offmarket_audit_created_at
  ON public.offmarket_audit_log (created_at DESC);

ALTER TABLE public.offmarket_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offmarket_audit_admin_all" ON public.offmarket_audit_log;
CREATE POLICY "offmarket_audit_admin_all"
  ON public.offmarket_audit_log
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
