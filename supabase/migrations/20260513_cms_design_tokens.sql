-- ============================================================================
-- MAPA Property — CMS éditable : table site_design_tokens
-- 13 mai 2026. Stocke les design tokens (polices, couleurs, spacing, radius)
-- éditables depuis le BO admin. Permet à l'éditeur de tester des variations
-- typographiques / chromatiques sans toucher Tailwind v4.
--
-- À appliquer manuellement via Supabase Dashboard → SQL Editor.
-- Idempotent : peut être rejoué.
--
-- ----------------------------------------------------------------------------
-- Pattern RLS admin retenu
-- ----------------------------------------------------------------------------
-- Identique à 20260513_cms_site_content.sql et aux autres migrations admin :
--   USING (auth.role() = 'authenticated')
--
-- Cf. note détaillée en tête de 20260513_cms_site_content.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_design_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL
    CHECK (category IN ('font','color','spacing','radius')),
  token_key TEXT NOT NULL,                 -- ex: "font.display", "color.gold"
  token_value TEXT NOT NULL,               -- ex: "Big Shoulders", "#B8865A"
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (category, token_key)
);

CREATE INDEX IF NOT EXISTS site_design_tokens_category_idx
  ON public.site_design_tokens (category);

-- ----------------------------------------------------------------------------
-- Trigger updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.site_design_tokens_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS site_design_tokens_touch_updated_at ON public.site_design_tokens;
CREATE TRIGGER site_design_tokens_touch_updated_at
  BEFORE UPDATE ON public.site_design_tokens
  FOR EACH ROW EXECUTE FUNCTION public.site_design_tokens_touch_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — lecture publique, écriture authentifiée (= admin BO)
-- ----------------------------------------------------------------------------
ALTER TABLE public.site_design_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_design_tokens_public_read" ON public.site_design_tokens;
CREATE POLICY "site_design_tokens_public_read"
  ON public.site_design_tokens
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "site_design_tokens_admin_write" ON public.site_design_tokens;
CREATE POLICY "site_design_tokens_admin_write"
  ON public.site_design_tokens
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Seed initial tokens (font + color) — aligné sur Tailwind v4 actuel
-- ----------------------------------------------------------------------------
INSERT INTO public.site_design_tokens (category, token_key, token_value, description) VALUES
  ('font',  'display', 'Big Shoulders',     'Police titres (Google Fonts, consolidée en Next 16)'),
  ('font',  'sans',    'Archivo',           'Police texte courant'),
  ('font',  'mono',    'JetBrains Mono',    'Police monospace'),
  ('color', 'gold',    '#B8865A',           'Copper MAPA — accent principal'),
  ('color', 'ink',     '#1A1F2A',           'Texte principal'),
  ('color', 'bg',      '#F5EFE1',           'Background crème')
ON CONFLICT (category, token_key) DO NOTHING;
