-- MAPA Property — Correctif allowlist RLS mapa_historical_sales
-- 1er juillet 2026.
--
-- CONTEXTE : le formulaire /admin/ventes-realisees renvoyait 403 puis aurait
-- renvoye 500 (RLS) car l'allowlist (applicative + RLS) autorisait
-- 'j.brebion@mapagroup.org' + un 2e compte fantome jamais cree en auth. Or :
--   - Julien se connecte avec 'admin@mapagroup.org' (compte reel) — absent des listes.
--   - le 2e compte de l'ancienne allowlist n'existe PAS en auth (entree morte).
--
-- CORRECTIF (decision Julien, option A) : autoriser les 2 comptes REELS
-- (admin@mapagroup.org + j.brebion@mapagroup.org) et retirer le compte fantome.
-- Le pendant applicatif est corrige dans app/api/admin/ventes-realisees/route.ts.
--
-- Cette migration NE TOUCHE PAS aux donnees (0 ligne) — seulement les 2
-- policies RLS. Idempotente : DROP IF EXISTS + CREATE.
--
-- A APPLIQUER MANUELLEMENT dans Supabase Studio (SQL Editor) OU via
-- `supabase db push` (cf. procedure en fin de fichier). Tant que cette
-- migration n'est pas appliquee en base, l'INSERT echoue en 500 (RLS).

-- SELECT : uniquement admin@ et j.brebion@ via auth.email(). service_role bypasse RLS.
DROP POLICY IF EXISTS "mapa_historical_sales_partners_read"
  ON public.mapa_historical_sales;
CREATE POLICY "mapa_historical_sales_partners_read"
  ON public.mapa_historical_sales FOR SELECT
  USING (
    auth.email() IN (
      'admin@mapagroup.org',
      'j.brebion@mapagroup.org'
    )
  );

-- INSERT/UPDATE/DELETE : meme restriction stricte.
DROP POLICY IF EXISTS "mapa_historical_sales_partners_write"
  ON public.mapa_historical_sales;
CREATE POLICY "mapa_historical_sales_partners_write"
  ON public.mapa_historical_sales FOR ALL
  USING (
    auth.email() IN (
      'admin@mapagroup.org',
      'j.brebion@mapagroup.org'
    )
  )
  WITH CHECK (
    auth.email() IN (
      'admin@mapagroup.org',
      'j.brebion@mapagroup.org'
    )
  );

-- Verification post-migration (optionnel) :
-- SELECT polname, polcmd, polqual::text, polwithcheck::text
--   FROM pg_policy WHERE polrelid = 'public.mapa_historical_sales'::regclass;
-- (doit montrer 'admin@mapagroup.org' + 'j.brebion@mapagroup.org', plus de compte fantome)
