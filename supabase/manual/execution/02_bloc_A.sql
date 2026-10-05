-- =====================================================================
-- 02 BLOC A : ECRITURES RESERVEES AUX ADMINS + JOURNAL DES CONNEXIONS
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle (controle, objet,
-- constate, resultat). Rejouable sans erreur : chaque objet est verifie
-- avant d'etre modifie ; un objet absent est signale SANS OBJET.
--
-- Effet :
--   A1 supprime la regle properties_authenticated_update (UPDATE pour tout
--      compte connecte) si elle existe encore ;
--   A2 et A3 reservent l'ecriture des prix de marche et des ventes
--      historiques a public.is_mapa_admin() ;
--   A4 cree le journal des connexions admin (RLS sans regle : seul le
--      serveur y accede) ;
--   A5 reserve l'ecriture des buckets documents et offmarket-photos a
--      public.is_mapa_admin(). Si Supabase refuse (proprietaire de
--      storage.objects), le tableau l'indique : faire alors la meme
--      modification dans Storage, Policies.
-- Aucun risque de blocage : les comptes de la liste admin gardent l'acces.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.is_mapa_admin()') IS NULL THEN
    RAISE EXCEPTION 'public.is_mapa_admin() absente : rien n''a ete modifie';
  END IF;

  -- A1
  IF to_regclass('public.properties') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "properties_authenticated_update" ON public.properties';
  END IF;

  -- A2
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
             AND tablename = 'lu_market_prices_by_commune' AND policyname = 'lu_market_prices_admin_write') THEN
    EXECUTE 'ALTER POLICY "lu_market_prices_admin_write" ON public.lu_market_prices_by_commune '
         || 'USING (public.is_mapa_admin()) WITH CHECK (public.is_mapa_admin())';
  END IF;

  -- A3
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
             AND tablename = 'mapa_historical_sales' AND policyname = 'mapa_historical_sales_partners_write') THEN
    EXECUTE 'ALTER POLICY "mapa_historical_sales_partners_write" ON public.mapa_historical_sales '
         || 'USING (public.is_mapa_admin()) WITH CHECK (public.is_mapa_admin())';
  END IF;
END $$;

-- A4. Journal des connexions admin : jamais de mot de passe ni de code.
CREATE TABLE IF NOT EXISTS public.admin_auth_log (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  event       TEXT NOT NULL,
  email       TEXT,
  success     BOOLEAN NOT NULL,
  reason      TEXT,
  ip          TEXT,
  user_agent  TEXT
);
ALTER TABLE public.admin_auth_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_auth_log FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.admin_auth_log_id_seq FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_admin_auth_log_created_at ON public.admin_auth_log (created_at DESC);

-- A5. Stockage : un refus de droits n'annule pas le reste du bloc.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage'
             AND tablename = 'objects' AND policyname = 'documents_storage_admin_write') THEN
    BEGIN
      EXECUTE 'ALTER POLICY "documents_storage_admin_write" ON storage.objects '
           || 'USING (bucket_id = ''documents'' AND public.is_mapa_admin()) '
           || 'WITH CHECK (bucket_id = ''documents'' AND public.is_mapa_admin())';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'documents_storage_admin_write : droits insuffisants, a faire dans Storage, Policies';
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage'
             AND tablename = 'objects' AND policyname = 'offmarket_photos_admin_write') THEN
    BEGIN
      EXECUTE 'ALTER POLICY "offmarket_photos_admin_write" ON storage.objects '
           || 'USING (bucket_id = ''offmarket-photos'' AND public.is_mapa_admin()) '
           || 'WITH CHECK (bucket_id = ''offmarket-photos'' AND public.is_mapa_admin())';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'offmarket_photos_admin_write : droits insuffisants, a faire dans Storage, Policies';
    END;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
WITH attendu (ordre, schema_name, table_name, policy_name) AS (
  VALUES (2, 'public', 'lu_market_prices_by_commune', 'lu_market_prices_admin_write'),
         (3, 'public', 'mapa_historical_sales', 'mapa_historical_sales_partners_write'),
         (5, 'storage', 'objects', 'documents_storage_admin_write'),
         (6, 'storage', 'objects', 'offmarket_photos_admin_write')
),
regles AS (
  SELECT a.ordre, a.schema_name || '.' || a.table_name || ' / ' || a.policy_name AS objet,
         p.policyname IS NOT NULL AS existe,
         coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') AS conditions
  FROM attendu a
  LEFT JOIN pg_policies p
    ON p.schemaname = a.schema_name AND p.tablename = a.table_name AND p.policyname = a.policy_name
),
journal AS (
  SELECT to_regclass('public.admin_auth_log') AS oid_journal
)
SELECT controle::text, objet::text, constate::text, resultat::text FROM (
  SELECT 1 AS ordre, 'A1 regle supprimee' AS controle,
         'public.properties / properties_authenticated_update' AS objet,
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties'
                           AND policyname = 'properties_authenticated_update') THEN 'encore presente' ELSE 'absente' END AS constate,
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties'
                           AND policyname = 'properties_authenticated_update') THEN 'A FAIRE' ELSE 'OK' END AS resultat
  UNION ALL
  SELECT r.ordre,
         CASE r.ordre WHEN 2 THEN 'A2 ecriture admin' WHEN 3 THEN 'A3 ecriture admin'
                      WHEN 5 THEN 'A5 stockage admin' ELSE 'A5 stockage admin' END,
         r.objet,
         CASE WHEN NOT r.existe THEN 'regle absente' ELSE left(r.conditions, 200) END,
         CASE WHEN NOT r.existe THEN 'SANS OBJET'
              WHEN r.conditions ILIKE '%is_mapa_admin%' THEN 'OK'
              WHEN r.ordre >= 5 THEN 'A FAIRE dans Storage, Policies'
              ELSE 'A FAIRE' END
  FROM regles r
  UNION ALL
  SELECT 4, 'A4 journal des connexions', 'public.admin_auth_log',
         CASE WHEN j.oid_journal IS NULL THEN 'table absente'
              ELSE 'RLS ' || CASE WHEN c.relrowsecurity THEN 'active' ELSE 'desactivee' END
                   || ', lecture anon : ' || CASE WHEN has_table_privilege('anon', j.oid_journal, 'SELECT') THEN 'oui' ELSE 'non' END
                   || ', lecture authenticated : ' || CASE WHEN has_table_privilege('authenticated', j.oid_journal, 'SELECT') THEN 'oui' ELSE 'non' END
         END,
         CASE WHEN j.oid_journal IS NOT NULL AND c.relrowsecurity
                   AND NOT has_table_privilege('anon', j.oid_journal, 'SELECT')
                   AND NOT has_table_privilege('authenticated', j.oid_journal, 'SELECT') THEN 'OK' ELSE 'A FAIRE' END
  FROM journal j
  LEFT JOIN pg_class c ON c.oid = j.oid_journal
) t
ORDER BY ordre;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE DU BLOC A (a n'utiliser que sur decision : il rouvre
-- l'ecriture a tout compte connecte). Retirer les "-- " puis executer.
-- ---------------------------------------------------------------------
-- ALTER POLICY "lu_market_prices_admin_write" ON public.lu_market_prices_by_commune
--   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- ALTER POLICY "documents_storage_admin_write" ON storage.objects
--   USING (bucket_id = 'documents' AND auth.role() = 'authenticated')
--   WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
-- ALTER POLICY "offmarket_photos_admin_write" ON storage.objects
--   USING (bucket_id = 'offmarket-photos' AND auth.role() = 'authenticated')
--   WITH CHECK (bucket_id = 'offmarket-photos' AND auth.role() = 'authenticated');
