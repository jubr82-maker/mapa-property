-- 20260518_clean_e2e_leads.sql — BUG T7 (purge leads/estimations E2E)
--
-- ⚠️ À APPLIQUER MANUELLEMENT par Julien dans Supabase Studio.
-- Supprime les enregistrements de test générés par les preuves
-- Playwright. Idempotent (re-exécutable sans effet de bord).
--
-- Conseillé : exécuter d'abord les SELECT de contrôle, vérifier le
-- volume, puis les DELETE.

-- Contrôle (compter avant) :
-- SELECT count(*) FROM public.leads
--   WHERE email ILIKE '%@example.%' OR email ILIKE 'e2e.%' OR email ILIKE 'scan.%';
-- SELECT count(*) FROM public.estimation_requests
--   WHERE contact_email ILIKE '%@example.%' OR contact_email ILIKE 'e2e.%' OR contact_email ILIKE 'scan.%';

DELETE FROM public.leads
WHERE email ILIKE '%@example.%'
   OR email ILIKE 'e2e.%'
   OR email ILIKE 'scan.%';

DELETE FROM public.estimation_requests
WHERE contact_email ILIKE '%@example.%'
   OR contact_email ILIKE 'e2e.%'
   OR contact_email ILIKE 'scan.%';

-- Prévention : le code (lib/test-email.ts) bloque désormais ces
-- emails en PROD sur /api/lead, /api/nda-request, /api/contact,
-- /api/estimate (en dev, autorisé pour les preuves). Cette purge ne
-- devrait donc avoir à être lancée qu'une fois.
