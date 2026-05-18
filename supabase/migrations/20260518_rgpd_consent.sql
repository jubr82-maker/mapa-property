-- 20260518_rgpd_consent.sql — BUG 7 (consentement RGPD explicite)
--
-- ⚠️ À APPLIQUER MANUELLEMENT par Julien dans Supabase Studio
-- (règle inviolable : aucune migration auto). Idempotent & non
-- destructif. Le code est résilient : tant que cette migration n'est
-- PAS appliquée, les formulaires continuent de fonctionner et le
-- consentement reste tracé dans `message` (leads) / l'audit trail
-- (estimation_requests). Après application, la colonne dédiée est
-- renseignée et remonte dans l'admin (liste leads + détail estimation).
--
-- NB : la table d'estimations réelle est `estimation_requests`
-- (le brief mentionnait `estimations` — table inexistante ici).

ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS rgpd_consent_at timestamptz;

ALTER TABLE IF EXISTS public.estimation_requests
  ADD COLUMN IF NOT EXISTS rgpd_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent boolean DEFAULT false;

COMMENT ON COLUMN public.leads.rgpd_consent_at IS
  'Horodatage du consentement RGPD explicite (case cochée formulaire public). NULL = non obtenu.';
COMMENT ON COLUMN public.estimation_requests.rgpd_consent_at IS
  'Horodatage du consentement RGPD explicite. NULL = non obtenu.';
