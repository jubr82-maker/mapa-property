-- ============================================================================
-- MAPA Property — CMS éditable : table site_content
-- 13 mai 2026. Stocke les textes UI (titres, accroches, descriptions) par
-- locale, éditables depuis le BO admin. Permet de dépasser les fichiers
-- next-intl figés et donner la main à l'éditeur.
--
-- À appliquer manuellement via Supabase Dashboard → SQL Editor.
-- Idempotent : peut être rejoué.
--
-- ----------------------------------------------------------------------------
-- Pattern RLS admin retenu
-- ----------------------------------------------------------------------------
-- Cohérent avec les migrations existantes (20260511_admin_rls_properties.sql,
-- 20260511_admin_offmarket.sql, 20260512_admin_workflow_*.sql) :
--   USING (auth.role() = 'authenticated')
--
-- Justification : le BO /admin est protégé en amont par la session Supabase
-- Auth (cf. middleware/proxy + layout admin). Toute connexion authentifiée
-- est de facto un admin MAPA — aucune table `admin_users` ni claim custom
-- `app_metadata.role` n'a été introduit jusqu'ici. Conserver le même pattern
-- évite la dérive de modèle de sécurité (un seul endroit à durcir le jour où
-- on introduit un vrai claim admin).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,                       -- ex: "home.hero.title"
  locale TEXT NOT NULL CHECK (locale IN ('fr','en','de')),
  content TEXT NOT NULL,                   -- texte ou HTML court
  content_type TEXT NOT NULL DEFAULT 'text'
    CHECK (content_type IN ('text','html','markdown')),
  section TEXT,                            -- ex: "home", "footer", "header"
  description TEXT,                        -- aide pour l'admin
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (key, locale)
);

CREATE INDEX IF NOT EXISTS site_content_section_idx
  ON public.site_content (section);

CREATE INDEX IF NOT EXISTS site_content_key_locale_idx
  ON public.site_content (key, locale);

-- ----------------------------------------------------------------------------
-- Trigger updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.site_content_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS site_content_touch_updated_at ON public.site_content;
CREATE TRIGGER site_content_touch_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.site_content_touch_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — lecture publique, écriture authentifiée (= admin BO)
-- ----------------------------------------------------------------------------
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_content_public_read" ON public.site_content;
CREATE POLICY "site_content_public_read"
  ON public.site_content
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "site_content_admin_write" ON public.site_content;
CREATE POLICY "site_content_admin_write"
  ON public.site_content
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
