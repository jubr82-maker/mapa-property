-- =====================================================================
-- 39 CONTROLE QUOTIDIEN : SITE + GOOGLE
-- MAPA Property, prepare le 2026-11-13. NON EXECUTE par Claude.
--
-- Cree (si absentes) les tables du controle quotidien (page admin
-- "Controle Google", taches /api/cron/controle-site et controle-google) :
--   public.controle_runs           passages de controle (site ou google) :
--                                  debut, fin, etat, compteurs, point de
--                                  reprise, resume (garde 1 an)
--   public.controle_results        resultats par page : passage, adresse,
--                                  categorie, explication en francais,
--                                  details techniques (gardes 90 jours)
--   public.controle_google_quota   compteur quotidien des inspections
--                                  d'URL Google (limite 2 000 par jour)
--   public.controle_lock           verrou : un seul controle a la fois
--   public.seo_positions_daily     positions QUOTIDIENNES des recherches
--                                  cibles (la table seo_positions garde
--                                  son releve hebdomadaire et son
--                                  historique, sans changement)
-- Fonctions (appelees par le serveur avec la cle service_role) :
--   public.controle_try_lock, public.controle_release_lock,
--   public.controle_google_quota_take
-- Acces : RLS active, aucune ecriture par l'API publique, lecture
-- reservee a public.is_mapa_admin() (meme modele que le fichier 06).
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle. Rejouable sans erreur.
-- Retour arriere : en fin de fichier, en commentaire.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.controle_runs (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('site', 'google')),
  trigger     TEXT NOT NULL DEFAULT 'cron',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  state       TEXT NOT NULL DEFAULT 'running'
              CHECK (state IN ('running', 'paused', 'done', 'failed', 'no_key', 'quota')),
  counters    JSONB NOT NULL DEFAULT '{}'::jsonb,
  cursor      JSONB,
  summary     JSONB,
  detail      TEXT
);
CREATE INDEX IF NOT EXISTS idx_controle_runs_kind_started ON public.controle_runs (kind, started_at DESC);

CREATE TABLE IF NOT EXISTS public.controle_results (
  id          BIGSERIAL PRIMARY KEY,
  run_id      BIGINT NOT NULL REFERENCES public.controle_runs (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  url         TEXT NOT NULL,
  check_key   TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('a_corriger', 'attente_google', 'normal')),
  explanation TEXT NOT NULL,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_controle_results_run ON public.controle_results (run_id);
CREATE INDEX IF NOT EXISTS idx_controle_results_created_at ON public.controle_results (created_at DESC);

CREATE TABLE IF NOT EXISTS public.controle_google_quota (
  day        DATE PRIMARY KEY,
  used       INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.controle_lock (
  name         TEXT PRIMARY KEY,
  holder       TEXT NOT NULL,
  locked_until TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.seo_positions_daily (
  id          BIGSERIAL PRIMARY KEY,
  day         DATE NOT NULL,
  query       TEXT NOT NULL,
  clicks      INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr         NUMERIC,
  position    NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day, query)
);

-- Verrou : pris si libre ou expire (un controle arrete net ne bloque
-- jamais plus de p_seconds secondes). Renvoie true si le verrou est pris.
CREATE OR REPLACE FUNCTION public.controle_try_lock(p_name TEXT, p_holder TEXT, p_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  got BOOLEAN;
BEGIN
  INSERT INTO public.controle_lock AS l (name, holder, locked_until)
  VALUES (p_name, p_holder, now() + make_interval(secs => p_seconds))
  ON CONFLICT (name) DO UPDATE
    SET holder = EXCLUDED.holder, locked_until = EXCLUDED.locked_until
    WHERE l.locked_until < now() OR l.holder = EXCLUDED.holder
  RETURNING true INTO got;
  RETURN COALESCE(got, false);
END $$;

CREATE OR REPLACE FUNCTION public.controle_release_lock(p_name TEXT, p_holder TEXT)
RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.controle_lock WHERE name = p_name AND holder = p_holder;
$$;

-- Compteur Google : reserve jusqu'a p_want inspections sans depasser
-- p_limit pour le jour p_day. Renvoie le nombre accorde (0 = limite
-- atteinte). Atomique (verrou de ligne).
CREATE OR REPLACE FUNCTION public.controle_google_quota_take(p_day DATE, p_want INTEGER, p_limit INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cur INTEGER;
  granted INTEGER;
BEGIN
  INSERT INTO public.controle_google_quota (day, used) VALUES (p_day, 0) ON CONFLICT (day) DO NOTHING;
  SELECT used INTO cur FROM public.controle_google_quota WHERE day = p_day FOR UPDATE;
  granted := GREATEST(0, LEAST(p_want, p_limit - cur));
  UPDATE public.controle_google_quota SET used = used + granted, updated_at = now() WHERE day = p_day;
  RETURN granted;
END $$;

REVOKE ALL ON FUNCTION public.controle_try_lock(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.controle_release_lock(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.controle_google_quota_take(DATE, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.controle_try_lock(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.controle_release_lock(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.controle_google_quota_take(DATE, INTEGER, INTEGER) TO service_role;

-- Acces : RLS, aucune ecriture publique, lecture admin.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['controle_runs', 'controle_results', 'controle_google_quota',
                           'controle_lock', 'seo_positions_daily'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    IF to_regclass('public.' || t || '_id_seq') IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated', t || '_id_seq');
    END IF;
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_read', t);
    IF to_regprocedure('public.is_mapa_admin()') IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_mapa_admin())',
                     t || '_admin_read', t);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
WITH attendu (ordre, nom) AS (
  VALUES (1, 'controle_runs'), (2, 'controle_results'), (3, 'controle_google_quota'),
         (4, 'controle_lock'), (5, 'seo_positions_daily')
),
etat AS (
  SELECT a.ordre, a.nom, to_regclass('public.' || a.nom) AS oid_table
  FROM attendu a
)
SELECT objet::text, constate::text, resultat::text FROM (
  SELECT e.ordre,
         'public.' || e.nom AS objet,
         CASE WHEN e.oid_table IS NULL THEN 'table absente'
              ELSE 'RLS ' || CASE WHEN c.relrowsecurity THEN 'active' ELSE 'desactivee' END
                   || ', lecture admin : ' || CASE WHEN EXISTS (
                        SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = e.nom
                          AND p.policyname = e.nom || '_admin_read' AND p.qual ILIKE '%is_mapa_admin%') THEN 'oui' ELSE 'non' END
                   || ', ecriture anon : ' || CASE WHEN has_table_privilege('anon', e.oid_table, 'INSERT') THEN 'oui' ELSE 'non' END
                   || ', ecriture authenticated : ' || CASE WHEN has_table_privilege('authenticated', e.oid_table, 'INSERT') THEN 'oui' ELSE 'non' END
         END AS constate,
         CASE WHEN e.oid_table IS NOT NULL AND c.relrowsecurity
                   AND EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = e.nom
                               AND p.policyname = e.nom || '_admin_read')
                   AND NOT has_table_privilege('anon', e.oid_table, 'INSERT')
                   AND NOT has_table_privilege('authenticated', e.oid_table, 'INSERT') THEN 'OK'
              ELSE 'A VERIFIER' END AS resultat
  FROM etat e
  LEFT JOIN pg_class c ON c.oid = e.oid_table
  UNION ALL
  SELECT 6, 'fonctions controle_*',
         (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname IN ('controle_try_lock', 'controle_release_lock', 'controle_google_quota_take'))
           || ' fonction(s) sur 3, execution anon : '
           || CASE WHEN to_regprocedure('public.controle_try_lock(text,text,integer)') IS NOT NULL
                        AND has_function_privilege('anon', 'public.controle_try_lock(text,text,integer)', 'EXECUTE') THEN 'oui' ELSE 'non' END,
         CASE WHEN (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public' AND p.proname IN ('controle_try_lock', 'controle_release_lock', 'controle_google_quota_take')) = 3
                   AND NOT has_function_privilege('anon', 'public.controle_try_lock(text,text,integer)', 'EXECUTE')
              THEN 'OK' ELSE 'A VERIFIER' END
) t
ORDER BY ordre;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE (supprime les tables du controle et leurs donnees).
-- Retirer les "-- " puis executer.
-- ---------------------------------------------------------------------
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.controle_try_lock(TEXT, TEXT, INTEGER);
-- DROP FUNCTION IF EXISTS public.controle_release_lock(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.controle_google_quota_take(DATE, INTEGER, INTEGER);
-- DROP TABLE IF EXISTS public.controle_results;
-- DROP TABLE IF EXISTS public.controle_runs;
-- DROP TABLE IF EXISTS public.controle_google_quota;
-- DROP TABLE IF EXISTS public.controle_lock;
-- DROP TABLE IF EXISTS public.seo_positions_daily;
-- COMMIT;
