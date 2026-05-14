-- ============================================================================
-- MAPA Property — Tracking events unifié (Phase 6)
-- 14 mai 2026
-- Stocke tous les événements comportementaux user pour funnel analysis BO.
-- RGPD : ip_hash uniquement (pas d'IP brute), pas de PII.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view',
    'cta_click',
    'form_step_complete',
    'form_submit',
    'contact_reveal',
    'property_view',
    'property_favorite',
    'estimation_compute',
    'emprunt_simulate',
    'rendement_simulate',
    'search_query',
    'scroll_depth_75',
    'exit_intent',
    'bounce'
  )),
  event_data JSONB,
  page TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  locale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tracking_events_session_idx ON public.tracking_events (session_id);
CREATE INDEX IF NOT EXISTS tracking_events_type_idx ON public.tracking_events (event_type);
CREATE INDEX IF NOT EXISTS tracking_events_created_idx ON public.tracking_events (created_at DESC);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- INSERT ouvert au public (anon) — endpoint /api/track gère le rate limiting côté serveur.
DROP POLICY IF EXISTS "tracking_events_insert_anon" ON public.tracking_events;
CREATE POLICY "tracking_events_insert_anon"
  ON public.tracking_events FOR INSERT
  WITH CHECK (TRUE);

-- SELECT réservé aux admins authentifiés (BO).
DROP POLICY IF EXISTS "tracking_events_select_admin" ON public.tracking_events;
CREATE POLICY "tracking_events_select_admin"
  ON public.tracking_events FOR SELECT
  USING (auth.role() = 'authenticated');
