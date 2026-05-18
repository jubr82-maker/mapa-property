-- 20260518_estimation_status_deleted.sql — BUG 6 (soft delete admin)
--
-- ⚠️ REQUISE pour que la suppression (soft delete) fonctionne.
-- À appliquer MANUELLEMENT par Julien dans Supabase Studio.
--
-- estimation_requests.status a un CHECK :
--   status IN ('new','in_progress','avis_sent','mandate_signed','closed')
-- (cf. 20260514120100_estimation_requests.sql). La valeur 'deleted'
-- est donc REJETÉE tant que cette migration n'est pas appliquée
-- → l'endpoint DELETE renvoie une erreur explicite jusque-là
-- (la liste filtre déjà neq status='deleted', donc aucun effet de bord).
--
-- La création manuelle (status='new') fonctionne SANS cette migration.
-- Idempotent / non destructif (aucune ligne modifiée).

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.estimation_requests'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.estimation_requests DROP CONSTRAINT %I',
      cname
    );
  END IF;
END $$;

ALTER TABLE public.estimation_requests
  ADD CONSTRAINT estimation_requests_status_check
  CHECK (
    status IN (
      'new', 'in_progress', 'avis_sent',
      'mandate_signed', 'closed', 'deleted'
    )
  );
