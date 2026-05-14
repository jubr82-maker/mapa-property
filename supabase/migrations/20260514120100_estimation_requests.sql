-- ============================================================================
-- MAPA Property — Estimation requests (Phase 4 prep)
-- 14 mai 2026
-- Persiste chaque demande d'estimation client avec inputs + outputs internes
-- (5 méthodes EVS + warnings + audit trail) pour le BO admin /admin/estimations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.estimation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Inputs client snapshot
  inputs JSONB NOT NULL,
  -- Coordonnées (post Phase 1 scission — Step 3 contact)
  contact_email TEXT,
  contact_phone TEXT,
  consent BOOLEAN DEFAULT FALSE,
  -- Output client public (low/mid/high + confidence)
  client_output JSONB NOT NULL,
  -- Output interne complet (5 méthodes + détails + warnings)
  internal_output JSONB NOT NULL,
  -- Moteur utilisé (evs_5_methods | hedonic_legacy)
  engine TEXT NOT NULL,
  -- Workflow BO
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'avis_sent', 'mandate_signed', 'closed')),
  notes TEXT,
  -- Audit
  session_id UUID,
  ip_hash TEXT,
  locale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS estimation_requests_status_idx ON public.estimation_requests (status);
CREATE INDEX IF NOT EXISTS estimation_requests_created_idx ON public.estimation_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS estimation_requests_email_idx ON public.estimation_requests (contact_email);

CREATE OR REPLACE FUNCTION public.estimation_requests_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS estimation_requests_touch_updated_at ON public.estimation_requests;
CREATE TRIGGER estimation_requests_touch_updated_at
  BEFORE UPDATE ON public.estimation_requests
  FOR EACH ROW EXECUTE FUNCTION public.estimation_requests_touch_updated_at();

ALTER TABLE public.estimation_requests ENABLE ROW LEVEL SECURITY;

-- INSERT ouvert au public (anon) : tunnel public doit pouvoir persister.
-- Anti-spam : rate limit + honeypot côté endpoint /api/estimate.
DROP POLICY IF EXISTS "estimation_requests_insert_anon" ON public.estimation_requests;
CREATE POLICY "estimation_requests_insert_anon"
  ON public.estimation_requests FOR INSERT
  WITH CHECK (TRUE);

-- SELECT/UPDATE réservé aux admins authentifiés (BO).
DROP POLICY IF EXISTS "estimation_requests_admin_read" ON public.estimation_requests;
CREATE POLICY "estimation_requests_admin_read"
  ON public.estimation_requests FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "estimation_requests_admin_update" ON public.estimation_requests;
CREATE POLICY "estimation_requests_admin_update"
  ON public.estimation_requests FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
