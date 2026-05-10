-- ============================================================================
-- MAPA Property — Migration nuit du 10 → 11 mai 2026
-- À appliquer manuellement via Supabase Dashboard SQL Editor (le projet n'est
-- pas encore lié à `supabase` CLI). Pose toutes les tables P0/P1/P2 manquantes,
-- les RLS, et les colonnes ajoutées.
--
-- Idempotent : utilise IF NOT EXISTS + DO blocks pour pouvoir être rejoué.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. properties.is_featured (pour Coups de cœur — P1-H)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.properties
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_properties_is_featured
  ON public.properties (is_featured)
  WHERE is_featured = TRUE;

-- ----------------------------------------------------------------------------
-- 2. nda_requests — formulaire NDA off-market (P0-F)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nda_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  civility TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  capacity_range TEXT,
  property_types TEXT[],
  zones TEXT,
  timeline TEXT,
  nda_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  source_ip TEXT,
  user_agent TEXT,
  lang TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.nda_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nda_requests_insert_public ON public.nda_requests;
CREATE POLICY nda_requests_insert_public
  ON public.nda_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- Pas de SELECT public : seul Julien (via service_role) lira la table.

-- ----------------------------------------------------------------------------
-- 3. arcova_waitlist — invitations ARCOVA (P0 ARCOVA placeholder)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arcova_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email TEXT NOT NULL,
  full_name TEXT,
  reason TEXT,
  source_ip TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.arcova_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arcova_waitlist_insert_public ON public.arcova_waitlist;
CREATE POLICY arcova_waitlist_insert_public
  ON public.arcova_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- ----------------------------------------------------------------------------
-- 4. leads_notifications — fallback notifications quand RESEND_API_KEY absent
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lead_id UUID,
  channel TEXT NOT NULL DEFAULT 'email_pending',
  payload JSONB,
  delivered_at TIMESTAMPTZ
);

ALTER TABLE public.leads_notifications ENABLE ROW LEVEL SECURITY;

-- Aucune policy publique : table interne, lecture/écriture uniquement via service_role.

-- ----------------------------------------------------------------------------
-- 5. mandate_requests — formulaires de demande de mandat
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mandate_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mandate_type TEXT NOT NULL,
  civility TEXT,
  first_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  property_type TEXT,
  property_city TEXT,
  property_country TEXT,
  surface NUMERIC,
  estimated_price NUMERIC,
  message TEXT,
  source_ip TEXT,
  lang TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.mandate_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mandate_requests_insert_public ON public.mandate_requests;
CREATE POLICY mandate_requests_insert_public
  ON public.mandate_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- ----------------------------------------------------------------------------
-- 6. interest_rates — schéma garanti (cron BCL P1-D)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interest_rates (
  id BIGSERIAL PRIMARY KEY,
  observed_month DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'BCL',
  variable_rate NUMERIC,
  fixed_5y_rate NUMERIC,
  fixed_10y_rate NUMERIC,
  fixed_20y_rate NUMERIC,
  fixed_25y_rate NUMERIC,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interest_rates_month_source_uk UNIQUE (observed_month, source)
);

ALTER TABLE public.interest_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interest_rates_select_public ON public.interest_rates;
CREATE POLICY interest_rates_select_public
  ON public.interest_rates
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- ----------------------------------------------------------------------------
-- 7. bo_audit_log — journal des actions BO admin (P0-G/H/I)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bo_audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  diff JSONB,
  ip TEXT,
  user_agent TEXT
);

ALTER TABLE public.bo_audit_log ENABLE ROW LEVEL SECURITY;

-- Aucune policy publique : lecture via service_role uniquement.

-- ============================================================================
-- FIN DE MIGRATION
-- ============================================================================
