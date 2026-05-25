-- Sprint C10 — separation prenom / nom dans le formulaire estimation
-- (components/forms/EstimateForm.tsx Step 3). Ajoute 2 colonnes a
-- estimation_requests, en complement de contact_name qui reste pour
-- back-compat (auto-rempli a l'INSERT via concat firstName + ' ' + lastName
-- cote applicatif, cf. app/api/estimate/route.ts).
--
-- public.leads (utilisee par ContactForm via /api/lead) a deja les 2
-- colonnes depuis la migration 20260510_night_run.sql : pas de modif ici.
--
-- IDEMPOTENT : ADD COLUMN IF NOT EXISTS pour permettre des replays.

ALTER TABLE public.estimation_requests
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

COMMENT ON COLUMN public.estimation_requests.first_name IS
  'Sprint C10 - prenom du contact (Step 3 EstimateForm). contact_name reste rempli (concat).';
COMMENT ON COLUMN public.estimation_requests.last_name IS
  'Sprint C10 - nom du contact (Step 3 EstimateForm). contact_name reste rempli (concat).';
