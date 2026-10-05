-- =====================================================================
-- 02 BLOC A : FERMETURE COMPLETE DES REGLES D'ACCES
-- MAPA Property, prepare le 2026-10-05, reecrit apres le resultat reel de
-- 01_audit.sql en production. NON EXECUTE par Claude.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle (ordre, controle,
-- objet, constate, resultat), regle par regle. Rejouable sans erreur :
-- chaque objet est verifie avant d'etre modifie ; un objet absent est
-- signale SANS OBJET.
--
-- Effet (numeros de l'audit du 2026-10-05) :
--   A1 supprime properties_authenticated_update si elle existe encore.
--   A2 lu_market_prices_admin_write reservee a public.is_mapa_admin().
--   A3 (point 4) mapa_historical_sales : partners_read et partners_write
--      fondees sur une liste d'e-mails en dur -> public.is_mapa_admin().
--   A4 journal des connexions admin (admin_auth_log), lu par le serveur.
--   A5 (point 2) regles fondees sur agency_admins -> public.is_mapa_admin() :
--      arcova_waitlist/arcova_admin_full, properties_offmarket/
--      offmarket_authenticated_write, offmarket_audit_log/audit_admin_read,
--      puis toute autre regle du schema public citant agency_admins.
--      La table agency_admins n'est PAS supprimee.
--   A6 (point 5) ecritures directes par l'API publique.
--      SUPPRIMEES sur estimation_requests, estimations, offmarket_requests,
--      property_views, tracking_events : le site Next.js ecrit dans ces
--      tables par une route serveur avec la cle service_role
--      (lib/supabase-service.ts), qui ne depend d'aucune regle, et le site
--      v28 en production n'y ecrit pas. Droits INSERT, UPDATE, DELETE
--      retires a anon sur ces cinq tables.
--      CONSERVEES ET BORNEES sur leads et arcova_waitlist : le site v28
--      en production (mapaproperty.lu, meme base) y ecrit depuis le
--      navigateur avec la cle publique (js/app.js de la branche main :
--      formulaire de bien, demande de mandat, liste d'attente ARCOVA).
--      Les regles ouvertes (condition true) sont remplacees par une seule
--      regle INSERT pour anon, leads_insert_borne et
--      arcova_waitlist_insert_borne : e-mail obligatoire et au bon format,
--      longueur maximale de chaque champ texte envoye par le v28,
--      telephone et langue au bon format, statut limite a la valeur
--      initiale. Chaque condition n'est posee que si la colonne existe et
--      est de type texte. Droits de table inchanges sur ces deux tables.
--      A supprimer a la bascule (le site Next.js n'en a pas besoin).
--   A7 (point 3) stockage : toute ecriture, et toute lecture reservee aux
--      comptes connectes, passe par bucket_id = '<bucket>' AND
--      public.is_mapa_admin(), pour chaque bucket. Les lectures publiques
--      des buckets publics ne sont pas modifiees.
--   A8 (decision A) offmarket-photos : TOUTES ses regles sont supprimees,
--      lecture comprise ; le bucket reste prive et vide.
-- Hors de ce fichier : point 1 (is_mapa_admin, aal2 et search_path) par
-- 05_bloc_B.sql ; point 6 par 03_bloc_D.sql (fonctions) et 09_nettoyage.sql
-- (controle de la vue) ; point 8 par 09_nettoyage.sql.
--
-- Stockage : si Supabase refuse un droit (storage.objects appartient a
-- supabase_storage_admin), la ligne du tableau l'indique "refus de
-- droits : a faire dans Storage, Policies" et le reste du bloc s'applique.
-- Aucun risque de blocage : les deux comptes admin gardent l'acces, a
-- condition d'etre connectes avec leur second facteur apres le bloc B.
-- =====================================================================

DROP TABLE IF EXISTS pg_temp.bloc_a_actions;
CREATE TEMP TABLE bloc_a_actions (
  ordre int,
  controle text,
  objet text,
  action text
);

-- Remplace la condition d'une regle par l'exigence admin, selon sa
-- commande (USING, WITH CHECK ou les deux). Rattache la regle au role
-- authenticated. Un refus de droits est rendu, jamais leve.
CREATE OR REPLACE FUNCTION pg_temp.bloc_a_admin_only(p_schema text, p_table text, p_policy text, p_bucket text)
RETURNS text
LANGUAGE plpgsql
AS $f$
DECLARE
  v_cmd text;
  v_cond text;
BEGIN
  SELECT cmd INTO v_cmd FROM pg_policies
  WHERE schemaname = p_schema AND tablename = p_table AND policyname = p_policy;
  IF v_cmd IS NULL THEN
    RETURN 'absente';
  END IF;
  v_cond := CASE WHEN p_bucket IS NULL THEN 'public.is_mapa_admin()'
                 ELSE format('bucket_id = %L AND public.is_mapa_admin()', p_bucket) END;
  BEGIN
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', p_policy, p_schema, p_table)
         || CASE v_cmd
              WHEN 'INSERT' THEN format(' WITH CHECK (%s)', v_cond)
              WHEN 'SELECT' THEN format(' USING (%s)', v_cond)
              WHEN 'DELETE' THEN format(' USING (%s)', v_cond)
              ELSE format(' USING (%s) WITH CHECK (%s)', v_cond, v_cond)
            END;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN 'refus de droits';
  END;
  RETURN 'reservee a is_mapa_admin';
END
$f$;

CREATE OR REPLACE FUNCTION pg_temp.bloc_a_drop(p_schema text, p_table text, p_policy text)
RETURNS text
LANGUAGE plpgsql
AS $f$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = p_schema AND tablename = p_table AND policyname = p_policy) THEN
    RETURN 'absente';
  END IF;
  BEGIN
    EXECUTE format('DROP POLICY %I ON %I.%I', p_policy, p_schema, p_table);
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN 'refus de droits';
  END;
  RETURN 'supprimee';
END
$f$;

BEGIN;

DO $$
DECLARE
  r record;
  t text;
  cond text;
BEGIN
  IF to_regprocedure('public.is_mapa_admin()') IS NULL THEN
    RAISE EXCEPTION 'public.is_mapa_admin() absente : rien n''a ete modifie';
  END IF;

  -- A1
  INSERT INTO bloc_a_actions VALUES (10, 'A1 regle supprimee', 'public.properties / properties_authenticated_update',
    pg_temp.bloc_a_drop('public', 'properties', 'properties_authenticated_update'));

  -- A2
  INSERT INTO bloc_a_actions VALUES (20, 'A2 ecriture admin', 'public.lu_market_prices_by_commune / lu_market_prices_admin_write',
    pg_temp.bloc_a_admin_only('public', 'lu_market_prices_by_commune', 'lu_market_prices_admin_write', NULL));

  -- A3 : noms exacts inconnus a l'avance, reperes par leur suffixe.
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mapa_historical_sales'
      AND (policyname ILIKE '%partners_read%' OR policyname ILIKE '%partners_write%')
  LOOP
    INSERT INTO bloc_a_actions VALUES (30, 'A3 liste d''e-mails remplacee', 'public.mapa_historical_sales / ' || r.policyname,
      pg_temp.bloc_a_admin_only('public', 'mapa_historical_sales', r.policyname, NULL));
  END LOOP;
  -- Toute autre regle du schema public citant une adresse admin en dur.
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ILIKE '%@mapagroup.org%'
  LOOP
    INSERT INTO bloc_a_actions VALUES (31, 'A3 liste d''e-mails remplacee', 'public.' || r.tablename || ' / ' || r.policyname,
      pg_temp.bloc_a_admin_only('public', r.tablename, r.policyname, NULL));
  END LOOP;

  -- A5 : regles fondees sur agency_admins.
  INSERT INTO bloc_a_actions VALUES (50, 'A5 agency_admins remplacee', 'public.arcova_waitlist / arcova_admin_full',
    pg_temp.bloc_a_admin_only('public', 'arcova_waitlist', 'arcova_admin_full', NULL));
  INSERT INTO bloc_a_actions VALUES (50, 'A5 agency_admins remplacee', 'public.properties_offmarket / offmarket_authenticated_write',
    pg_temp.bloc_a_admin_only('public', 'properties_offmarket', 'offmarket_authenticated_write', NULL));
  INSERT INTO bloc_a_actions VALUES (50, 'A5 agency_admins remplacee', 'public.offmarket_audit_log / audit_admin_read',
    pg_temp.bloc_a_admin_only('public', 'offmarket_audit_log', 'audit_admin_read', NULL));
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ILIKE '%agency_admins%'
  LOOP
    INSERT INTO bloc_a_actions VALUES (51, 'A5 agency_admins remplacee', 'public.' || r.tablename || ' / ' || r.policyname,
      pg_temp.bloc_a_admin_only('public', r.tablename, r.policyname, NULL));
  END LOOP;

  -- A6 : ecritures directes. Noms releves par l'audit, puis toute autre
  -- regle INSERT sans is_mapa_admin sur ces sept tables (hors regles
  -- bornees de ce bloc).
  FOR r IN
    SELECT * FROM (VALUES
      ('leads', 'anon insert leads'),
      ('estimation_requests', 'estimation_requests_insert_anon'),
      ('estimations', 'anon insert estimations'),
      ('offmarket_requests', 'offmarket_requests_public_insert'),
      ('arcova_waitlist', 'anon insert arcova'),
      ('arcova_waitlist', 'arcova_public_insert'),
      ('property_views', 'pv_public_insert'),
      ('tracking_events', 'tracking_events_insert_anon')
    ) AS v(tbl, pol)
  LOOP
    INSERT INTO bloc_a_actions VALUES (60, 'A6 regle ouverte supprimee', 'public.' || r.tbl || ' / ' || r.pol,
      pg_temp.bloc_a_drop('public', r.tbl, r.pol));
  END LOOP;
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('leads', 'estimation_requests', 'estimations', 'offmarket_requests',
                        'arcova_waitlist', 'property_views', 'tracking_events')
      AND cmd = 'INSERT'
      AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) NOT ILIKE '%is_mapa_admin%'
      AND policyname NOT IN ('leads_insert_borne', 'arcova_waitlist_insert_borne')
  LOOP
    INSERT INTO bloc_a_actions VALUES (61, 'A6 regle ouverte supprimee', 'public.' || r.tablename || ' / ' || r.policyname,
      pg_temp.bloc_a_drop('public', r.tablename, r.policyname));
  END LOOP;
  FOREACH t IN ARRAY ARRAY['estimation_requests', 'estimations', 'offmarket_requests',
                           'property_views', 'tracking_events'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
    END IF;
  END LOOP;

  -- A6 bis : insertion bornee pour le site v28 (leads, arcova_waitlist).
  FOR r IN
    SELECT * FROM (VALUES ('leads', 'leads_insert_borne', 'new'),
                          ('arcova_waitlist', 'arcova_waitlist_insert_borne', NULL)) AS v(tbl, pol, statut_envoye)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      INSERT INTO bloc_a_actions VALUES (62, 'A6 insertion bornee (site v28)', 'public.' || r.tbl, 'absente');
      CONTINUE;
    END IF;
    SELECT string_agg(clause, ' AND ' ORDER BY ordre) INTO cond
    FROM (
      -- e-mail : obligatoire, format, longueur
      SELECT 0 AS ordre, 'email IS NOT NULL' AS clause
      WHERE EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'email')
      UNION ALL
      SELECT b.ordre,
             format('(%1$I IS NULL OR (char_length(%1$I) <= %2$s%3$s))', b.col, b.maxlen,
                    CASE WHEN b.motif IS NULL THEN '' ELSE format(' AND %I ~ %L', b.col, b.motif) END)
      FROM (VALUES
        (1, 'email', 254, '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
        (2, 'first_name', 100, NULL),
        (3, 'last_name', 100, NULL),
        (4, 'full_name', 200, NULL),
        (5, 'phone', 40, '^[0-9+ ()./-]*$'),
        (6, 'message', 5000, NULL),
        (7, 'type', 40, NULL),
        (8, 'property_ref', 100, NULL),
        (9, 'source', 120, NULL),
        (10, 'lang', 5, '^[a-z]{2}$'),
        (11, 'country', 100, NULL),
        (12, 'city', 100, NULL),
        (13, 'company', 200, NULL),
        (14, 'role', 60, NULL),
        (15, 'reason', 2000, NULL)
      ) AS b(ordre, col, maxlen, motif)
      JOIN information_schema.columns ic
        ON ic.table_schema = 'public' AND ic.table_name = r.tbl AND ic.column_name = b.col
       AND ic.data_type IN ('text', 'character varying')
      UNION ALL
      -- statut : valeur envoyee par le v28 ou valeur par defaut de la colonne
      SELECT 20,
             format('(status IS NULL OR status::text = ANY (%L::text[]))',
                    ARRAY_REMOVE(ARRAY[r.statut_envoye, substring(ic.column_default FROM '^''([^'']*)''')], NULL)::text)
      FROM information_schema.columns ic
      WHERE ic.table_schema = 'public' AND ic.table_name = r.tbl AND ic.column_name = 'status'
        AND cardinality(ARRAY_REMOVE(ARRAY[r.statut_envoye, substring(ic.column_default FROM '^''([^'']*)''')], NULL)) > 0
    ) c;
    IF cond IS NULL OR cond NOT LIKE 'email IS NOT NULL%' THEN
      INSERT INTO bloc_a_actions VALUES (62, 'A6 insertion bornee (site v28)', 'public.' || r.tbl || ' / ' || r.pol,
        'colonne email absente : non creee');
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon WITH CHECK (%s)', r.pol, r.tbl, cond);
    INSERT INTO bloc_a_actions VALUES (62, 'A6 insertion bornee (site v28)', 'public.' || r.tbl || ' / ' || r.pol,
      'creee : ' || cond);
  END LOOP;
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

-- A7 et A8. Stockage : un refus de droits n'annule pas le reste du bloc.
DO $$
DECLARE
  r record;
  b text;
  nb_buckets int;
BEGIN
  -- A8 : offmarket-photos, noms releves puis toute regle citant ce bucket.
  INSERT INTO bloc_a_actions VALUES (80, 'A8 offmarket-photos : regle supprimee', 'storage.objects / offmarket_photos_admin_write',
    pg_temp.bloc_a_drop('storage', 'objects', 'offmarket_photos_admin_write'));
  INSERT INTO bloc_a_actions VALUES (80, 'A8 offmarket-photos : regle supprimee', 'storage.objects / offmarket_photos_public_read',
    pg_temp.bloc_a_drop('storage', 'objects', 'offmarket_photos_public_read'));
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) LIKE '%''offmarket-photos''%'
  LOOP
    INSERT INTO bloc_a_actions VALUES (81, 'A8 offmarket-photos : regle supprimee', 'storage.objects / ' || r.policyname,
      pg_temp.bloc_a_drop('storage', 'objects', r.policyname));
  END LOOP;
  BEGIN
    UPDATE storage.buckets SET public = false WHERE id = 'offmarket-photos' AND public;
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO bloc_a_actions VALUES (82, 'A8 offmarket-photos : bucket prive', 'storage.buckets / offmarket-photos', 'refus de droits');
  END;

  -- A7 : chaque regle d'un seul bucket ; ecriture, ou lecture reservee
  -- aux comptes connectes, -> bucket_id = '<bucket>' AND is_mapa_admin().
  FOR r IN
    SELECT policyname, cmd, roles, coalesce(qual, '') || ' ' || coalesce(with_check, '') AS cond
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    SELECT count(*), min(sb.id) INTO nb_buckets, b
    FROM storage.buckets sb
    WHERE r.cond LIKE '%' || quote_literal(sb.id) || '%';
    CONTINUE WHEN b = 'offmarket-photos';
    CONTINUE WHEN r.cmd = 'SELECT'
              AND NOT (r.roles = ARRAY['authenticated']::name[] OR r.cond ILIKE '%auth.%');
    IF r.cond ILIKE '%is_mapa_admin%' AND r.roles = ARRAY['authenticated']::name[] THEN
      INSERT INTO bloc_a_actions VALUES (70, 'A7 stockage admin', 'storage.objects / ' || r.policyname, 'deja reservee a is_mapa_admin');
    ELSIF nb_buckets = 1 THEN
      INSERT INTO bloc_a_actions VALUES (70, 'A7 stockage admin', 'storage.objects / ' || r.policyname,
        pg_temp.bloc_a_admin_only('storage', 'objects', r.policyname, b));
    ELSE
      INSERT INTO bloc_a_actions VALUES (71, 'A7 stockage admin', 'storage.objects / ' || r.policyname,
        CASE WHEN nb_buckets = 0 THEN 'aucun bucket identifie' ELSE 'plusieurs buckets' END || ' : non modifiee');
    END IF;
  END LOOP;
END $$;

COMMIT;

DROP FUNCTION IF EXISTS pg_temp.bloc_a_admin_only(text, text, text, text);
DROP FUNCTION IF EXISTS pg_temp.bloc_a_drop(text, text, text);

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche) : etat final, regle par regle.
--   OK          conforme
--   A FAIRE     non conforme, a corriger
--   A FAIRE dans Storage, Policies : Supabase a refuse le droit
--   SANS OBJET  objet absent
--   A VERIFIER  lecture reservee aux comptes connectes sans is_mapa_admin
--               (hors audit : non modifiee, a confirmer)
--   INFO        lecture publique voulue, non modifiee
-- ---------------------------------------------------------------------
WITH
pol AS (
  SELECT schemaname, tablename, policyname, cmd, roles,
         array_to_string(roles, ',') AS roles_txt,
         coalesce(qual, '') || ' ' || coalesce(with_check, '') AS cond
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
),
doit_etre_absente (schema_name, table_name, policy_name) AS (
  VALUES ('public', 'properties', 'properties_authenticated_update'),
         ('public', 'leads', 'anon insert leads'),
         ('public', 'estimation_requests', 'estimation_requests_insert_anon'),
         ('public', 'estimations', 'anon insert estimations'),
         ('public', 'offmarket_requests', 'offmarket_requests_public_insert'),
         ('public', 'arcova_waitlist', 'anon insert arcova'),
         ('public', 'arcova_waitlist', 'arcova_public_insert'),
         ('public', 'property_views', 'pv_public_insert'),
         ('public', 'tracking_events', 'tracking_events_insert_anon'),
         ('storage', 'objects', 'offmarket_photos_admin_write'),
         ('storage', 'objects', 'offmarket_photos_public_read')
),
tables_ecriture_directe (tbl) AS (
  VALUES ('estimation_requests'), ('estimations'), ('offmarket_requests'),
         ('property_views'), ('tracking_events')
),
regles_bornees (tbl, pol) AS (
  VALUES ('leads', 'leads_insert_borne'), ('arcova_waitlist', 'arcova_waitlist_insert_borne')
),
lignes AS (
  -- 1. Actions realisees par ce passage
  SELECT ordre, controle, objet, 'action : ' || action AS constate,
         CASE WHEN action LIKE 'colonne email absente%' THEN 'A VERIFIER'
              WHEN action = 'refus de droits' AND objet LIKE 'storage.%' THEN 'A FAIRE dans Storage, Policies'
              WHEN action = 'refus de droits' THEN 'A FAIRE'
              WHEN action = 'absente' THEN 'SANS OBJET'
              WHEN action LIKE '%non modifiee' THEN 'A FAIRE'
              ELSE 'OK' END AS resultat
  FROM bloc_a_actions

  UNION ALL
  -- 2. Regles qui doivent avoir disparu
  SELECT 100, 'regle absente attendue', d.schema_name || '.' || d.table_name || ' / ' || d.policy_name,
         CASE WHEN p.policyname IS NULL THEN 'absente' ELSE 'encore presente' END,
         CASE WHEN p.policyname IS NULL THEN 'OK'
              WHEN d.schema_name = 'storage' THEN 'A FAIRE dans Storage, Policies'
              ELSE 'A FAIRE' END
  FROM doit_etre_absente d
  LEFT JOIN pol p ON p.schemaname = d.schema_name AND p.tablename = d.table_name AND p.policyname = d.policy_name

  UNION ALL
  -- 3. Etat final de CHAQUE regle des schemas public et storage
  SELECT 200, 'etat final ' || p.cmd || ' pour ' || p.roles_txt,
         p.schemaname || '.' || p.tablename || ' / ' || p.policyname,
         left(p.cond, 200),
         CASE
           WHEN p.schemaname = 'public' AND p.policyname IN ('leads_insert_borne', 'arcova_waitlist_insert_borne')
                AND p.cmd = 'INSERT' AND p.roles = ARRAY['anon']::name[] AND p.cond ILIKE '%char_length(email)%'
             THEN 'OK (bornee, site v28)'
           WHEN p.cond ILIKE '%agency_admins%' THEN 'A FAIRE'
           WHEN p.cond ILIKE '%@mapagroup.org%' THEN 'A FAIRE'
           WHEN p.schemaname = 'storage' AND p.cond LIKE '%''offmarket-photos''%' THEN 'A FAIRE dans Storage, Policies'
           WHEN p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
                AND p.roles && ARRAY['anon', 'authenticated', 'public']::name[]
                AND p.cond NOT ILIKE '%is_mapa_admin%'
             THEN CASE WHEN p.schemaname = 'storage' THEN 'A FAIRE dans Storage, Policies' ELSE 'A FAIRE' END
           WHEN p.cmd = 'SELECT' AND p.schemaname = 'storage'
                AND (p.roles = ARRAY['authenticated']::name[] OR p.cond ILIKE '%auth.%')
                AND p.cond NOT ILIKE '%is_mapa_admin%'
             THEN 'A FAIRE dans Storage, Policies'
           WHEN p.cond ILIKE '%is_mapa_admin%' THEN 'OK'
           WHEN p.cmd = 'SELECT' AND p.roles = ARRAY['authenticated']::name[] THEN 'A VERIFIER'
           WHEN p.cmd = 'SELECT' THEN 'INFO'
           ELSE 'OK'
         END
  FROM pol p

  UNION ALL
  -- 4. Droits d'ecriture directe de anon sur les sept tables
  SELECT 300, 'droit d''ecriture anon retire', 'public.' || t.tbl,
         CASE WHEN to_regclass('public.' || t.tbl) IS NULL THEN 'table absente'
              ELSE 'INSERT ' || CASE WHEN has_table_privilege('anon', to_regclass('public.' || t.tbl), 'INSERT') THEN 'oui' ELSE 'non' END
                   || ', UPDATE ' || CASE WHEN has_table_privilege('anon', to_regclass('public.' || t.tbl), 'UPDATE') THEN 'oui' ELSE 'non' END
                   || ', DELETE ' || CASE WHEN has_table_privilege('anon', to_regclass('public.' || t.tbl), 'DELETE') THEN 'oui' ELSE 'non' END END,
         CASE WHEN to_regclass('public.' || t.tbl) IS NULL THEN 'SANS OBJET'
              WHEN has_table_privilege('anon', to_regclass('public.' || t.tbl), 'INSERT')
                OR has_table_privilege('anon', to_regclass('public.' || t.tbl), 'UPDATE')
                OR has_table_privilege('anon', to_regclass('public.' || t.tbl), 'DELETE') THEN 'A FAIRE'
              ELSE 'OK' END
  FROM tables_ecriture_directe t

  UNION ALL
  -- 4 bis. Insertion bornee conservee pour le site v28
  SELECT 310, 'insertion bornee (site v28)', 'public.' || g.tbl || ' / ' || g.pol,
         CASE WHEN to_regclass('public.' || g.tbl) IS NULL THEN 'table absente'
              WHEN p.policyname IS NULL THEN 'regle absente'
              ELSE 'INSERT pour ' || p.roles_txt || ', droit INSERT de anon : '
                   || CASE WHEN has_table_privilege('anon', to_regclass('public.' || g.tbl), 'INSERT') THEN 'oui' ELSE 'non' END END,
         CASE WHEN to_regclass('public.' || g.tbl) IS NULL THEN 'SANS OBJET'
              WHEN p.policyname IS NULL THEN 'A VERIFIER'
              WHEN NOT has_table_privilege('anon', to_regclass('public.' || g.tbl), 'INSERT')
                THEN 'A VERIFIER : formulaires v28 deja bloques par les droits'
              ELSE 'OK' END
  FROM regles_bornees g
  LEFT JOIN pol p ON p.schemaname = 'public' AND p.tablename = g.tbl AND p.policyname = g.pol

  UNION ALL
  -- 5. Bucket offmarket-photos : prive, sans aucune regle
  SELECT 400, 'offmarket-photos prive et sans regle', 'storage.buckets / offmarket-photos',
         CASE WHEN b.id IS NULL THEN 'bucket absent'
              ELSE CASE WHEN b.public THEN 'public' ELSE 'prive' END
                   || ', regles : ' || (SELECT count(*) FROM pol p WHERE p.schemaname = 'storage'
                                         AND p.cond LIKE '%''offmarket-photos''%')::text END,
         CASE WHEN b.id IS NULL THEN 'SANS OBJET'
              WHEN NOT b.public AND NOT EXISTS (SELECT 1 FROM pol p WHERE p.schemaname = 'storage'
                                                AND p.cond LIKE '%''offmarket-photos''%') THEN 'OK'
              ELSE 'A FAIRE dans Storage, Policies' END
  FROM (SELECT 1) x
  LEFT JOIN storage.buckets b ON b.id = 'offmarket-photos'

  UNION ALL
  -- 6. Journal des connexions admin
  SELECT 500, 'A4 journal des connexions', 'public.admin_auth_log',
         CASE WHEN c.oid IS NULL THEN 'table absente'
              ELSE 'RLS ' || CASE WHEN c.relrowsecurity THEN 'active' ELSE 'desactivee' END
                   || ', lecture anon : ' || CASE WHEN has_table_privilege('anon', c.oid, 'SELECT') THEN 'oui' ELSE 'non' END
                   || ', lecture authenticated : ' || CASE WHEN has_table_privilege('authenticated', c.oid, 'SELECT') THEN 'oui' ELSE 'non' END END,
         CASE WHEN c.oid IS NOT NULL AND c.relrowsecurity
                   AND NOT has_table_privilege('anon', c.oid, 'SELECT')
                   AND NOT has_table_privilege('authenticated', c.oid, 'SELECT') THEN 'OK' ELSE 'A FAIRE' END
  FROM (SELECT 1) x
  LEFT JOIN pg_class c ON c.oid = to_regclass('public.admin_auth_log')

  UNION ALL
  -- 7. Point 1, traite par 05_bloc_B.sql (affiche ici pour suivi)
  SELECT 600, 'is_mapa_admin : aal2 et search_path (05_bloc_B)', 'public.is_mapa_admin()',
         'aal2 : ' || CASE WHEN pg_get_functiondef(f.oid) ILIKE '%aal2%' THEN 'oui' ELSE 'non' END
         || ', search_path : ' || coalesce(array_to_string(f.proconfig, ','), 'non fixe'),
         CASE WHEN pg_get_functiondef(f.oid) ILIKE '%aal2%'
                   AND array_to_string(f.proconfig, ',') ILIKE '%search_path=%public%pg_temp%' THEN 'OK'
              ELSE 'A FAIRE : executer 05_bloc_B.sql' END
  FROM pg_proc f
  WHERE f.oid = to_regprocedure('public.is_mapa_admin()')
)
SELECT controle::text, objet::text, constate::text, resultat::text
FROM lignes
ORDER BY ordre, objet;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE DU BLOC A (a n'utiliser que sur decision : il rouvre
-- l'ecriture directe par l'API publique sans aucune borne). Les anciennes conditions
-- fondees sur agency_admins et sur la liste d'e-mails ne sont pas
-- restaurees : is_mapa_admin() couvre les deux comptes admin. Retirer
-- les "-- " puis executer.
-- ---------------------------------------------------------------------
-- BEGIN;
-- DROP POLICY IF EXISTS "leads_insert_borne" ON public.leads;
-- DROP POLICY IF EXISTS "arcova_waitlist_insert_borne" ON public.arcova_waitlist;
-- CREATE POLICY "anon insert leads" ON public.leads FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "estimation_requests_insert_anon" ON public.estimation_requests FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "anon insert estimations" ON public.estimations FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "offmarket_requests_public_insert" ON public.offmarket_requests FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "arcova_public_insert" ON public.arcova_waitlist FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "pv_public_insert" ON public.property_views FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "tracking_events_insert_anon" ON public.tracking_events FOR INSERT TO anon WITH CHECK (true);
-- GRANT INSERT ON public.estimation_requests, public.estimations, public.offmarket_requests,
--   public.property_views, public.tracking_events TO anon;
-- COMMIT;
