-- =====================================================================
-- 06 TABLES DU PILOTAGE DE L'ADMIN
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- Cree (si absentes) les tables du suivi de l'admin et ajoute les colonnes
-- d'origine des leads. Aucune donnee existante n'est modifiee ni effacee.
--   public.form_events          compteurs des formulaires (aucune donnee
--                               personnelle : formulaire, resultat, statut)
--   public.email_log            e-mails envoyes par le site : destinataire
--                               MASQUE, type, succes, code d'echec ; jamais
--                               le sujet ni le contenu
--   public.seo_positions        positions Google hebdomadaires des requetes
--                               cibles (Search Console)
--   public.psi_runs             mesures PageSpeed Insights datees
--   public.estimation_refusals  estimations refusees hors couverture : lieu
--                               ou pays saisi, type de bien, langue ; aucun
--                               nom, e-mail ni telephone
--   public.cron_runs            executions de la tache planifiee quotidienne
--   public.bo_audit_log         journal des actions de l'admin, colonnes
--                               IDENTIQUES a la migration 20260510_night_run
--                               (cree seulement s'il n'existe pas)
--   public.leads                + origin_channel, referrer_host, utm_source,
--                               utm_medium, utm_campaign (si la table existe)
-- Acces : RLS active, aucune ecriture par l'API publique (le serveur ecrit
-- avec la cle service_role), lecture reservee a public.is_mapa_admin().
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle. Rejouable sans erreur.
-- Retour arriere : en fin de fichier, en commentaire.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.form_events (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  form        TEXT NOT NULL,
  outcome     TEXT NOT NULL,
  http_status INTEGER
);
CREATE INDEX IF NOT EXISTS idx_form_events_created_at ON public.form_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_log (
  id               BIGSERIAL PRIMARY KEY,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_masked TEXT,
  kind             TEXT NOT NULL,
  success          BOOLEAN NOT NULL,
  failure_reason   TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON public.email_log (created_at DESC);

CREATE TABLE IF NOT EXISTS public.seo_positions (
  id          BIGSERIAL PRIMARY KEY,
  week_start  DATE NOT NULL,
  query       TEXT NOT NULL,
  clicks      INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr         NUMERIC,
  position    NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_start, query)
);

CREATE TABLE IF NOT EXISTS public.psi_runs (
  id             BIGSERIAL PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger        TEXT NOT NULL,
  url            TEXT NOT NULL,
  strategy       TEXT NOT NULL,
  performance    INTEGER,
  accessibility  INTEGER,
  seo            INTEGER,
  best_practices INTEGER,
  lcp_ms         NUMERIC,
  cls            NUMERIC,
  tbt_ms         NUMERIC,
  fcp_ms         NUMERIC,
  ttfb_ms        NUMERIC,
  field_lcp_ms   NUMERIC,
  field_inp_ms   NUMERIC,
  field_cls      NUMERIC,
  error          TEXT
);
CREATE INDEX IF NOT EXISTS idx_psi_runs_created_at ON public.psi_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.estimation_refusals (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason        TEXT NOT NULL,
  country       TEXT,
  place         TEXT,
  property_type TEXT,
  locale        TEXT
);
CREATE INDEX IF NOT EXISTS idx_estimation_refusals_created_at ON public.estimation_refusals (created_at DESC);

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  task       TEXT NOT NULL,
  ok         BOOLEAN NOT NULL,
  detail     TEXT
);
CREATE INDEX IF NOT EXISTS idx_cron_runs_task_created ON public.cron_runs (task, created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_bo_audit_log_created_at ON public.bo_audit_log (created_at DESC);

-- Origine reelle des leads (partie B). Ajout seulement si la table existe.
DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    ALTER TABLE public.leads
      ADD COLUMN IF NOT EXISTS origin_channel TEXT,
      ADD COLUMN IF NOT EXISTS referrer_host TEXT,
      ADD COLUMN IF NOT EXISTS utm_source TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
  END IF;
END $$;

-- Acces : RLS, aucune ecriture publique, lecture admin.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['form_events', 'email_log', 'seo_positions', 'psi_runs',
                           'estimation_refusals', 'cron_runs', 'bo_audit_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated', t || '_id_seq');
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
  VALUES (1, 'form_events'), (2, 'email_log'), (3, 'seo_positions'), (4, 'psi_runs'),
         (5, 'estimation_refusals'), (6, 'cron_runs'), (7, 'bo_audit_log')
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
  SELECT 8, 'public.leads (colonnes d''origine)',
         CASE WHEN to_regclass('public.leads') IS NULL THEN 'table absente'
              ELSE (SELECT count(*)::text FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'leads'
                      AND column_name IN ('origin_channel', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign'))
                   || ' colonne(s) sur 5' END,
         CASE WHEN (SELECT count(*) FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'leads'
                      AND column_name IN ('origin_channel', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign')) = 5
              THEN 'OK' ELSE 'A VERIFIER' END
) t
ORDER BY ordre;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE (supprime les tables du pilotage et leurs donnees).
-- bo_audit_log n'y figure pas : elle peut exister depuis la migration
-- 20260510_night_run ; ne la supprimer que si elle a ete creee ici et
-- qu'elle est vide. Retirer les "-- " puis executer.
-- ---------------------------------------------------------------------
-- BEGIN;
-- DROP TABLE IF EXISTS public.form_events;
-- DROP TABLE IF EXISTS public.email_log;
-- DROP TABLE IF EXISTS public.seo_positions;
-- DROP TABLE IF EXISTS public.psi_runs;
-- DROP TABLE IF EXISTS public.estimation_refusals;
-- DROP TABLE IF EXISTS public.cron_runs;
-- ALTER TABLE IF EXISTS public.leads
--   DROP COLUMN IF EXISTS origin_channel,
--   DROP COLUMN IF EXISTS referrer_host,
--   DROP COLUMN IF EXISTS utm_source,
--   DROP COLUMN IF EXISTS utm_medium,
--   DROP COLUMN IF EXISTS utm_campaign;
-- COMMIT;
