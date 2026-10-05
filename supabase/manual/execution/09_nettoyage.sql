-- =====================================================================
-- 09 NETTOYAGE : TABLE RESIDUELLE, BUCKETS PUBLICS, VUE OFF-MARKET
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle (partie, objet,
-- constate, resultat). Rejouable sans erreur.
--
-- Partie 1 (point 8) : public.tmp_property_images_import.
--   Aucun code du site ne la lit ni ne l'ecrit : son nom n'apparait que
--   dans deux migrations (20260918_rls_admin_allowlist.sql et son retour
--   arriere). Elle est d'abord COPIEE dans
--   public.tmp_property_images_import_sauvegarde_20261005 (RLS active,
--   aucun acces par l'API publique), puis supprimee, dans la meme
--   transaction. Si un objet de la base en depend, rien n'est supprime et
--   le tableau l'indique. Retour arriere : en fin de fichier.
--
-- Partie 2 : buckets publics que le code n'utilise plus. LECTURE SEULE,
--   aucun bucket ni fichier n'est supprime. Pour chaque bucket public :
--   reference dans le code (releve au 2026-10-05, ecrit ci-dessous, du
--   site Next.js ET du site v28 en production, branche main du depot,
--   tant que la bascule n'est pas faite), nombre de fichiers, nombre de
--   valeurs en base qui
--   contiennent son adresse publique (toutes les colonnes texte, json et
--   tableaux du schema public).
--
-- Partie 3 (decision D) : la vue publique properties_offmarket_public ne
--   doit exposer ni adresse, ni coordonnees, ni reference cadastrale, ni
--   nom de proprietaire. LECTURE SEULE.
-- =====================================================================

DROP TABLE IF EXISTS pg_temp.nettoyage_resultat;
CREATE TEMP TABLE nettoyage_resultat (
  ordre int,
  partie text,
  objet text,
  constate text,
  resultat text
);

BEGIN;

-- Partie 1
DO $$
DECLARE
  n_source bigint;
  n_copie bigint;
BEGIN
  IF to_regclass('public.tmp_property_images_import') IS NULL THEN
    INSERT INTO nettoyage_resultat VALUES (10, '1 table residuelle', 'public.tmp_property_images_import',
      'absente' || CASE WHEN to_regclass('public.tmp_property_images_import_sauvegarde_20261005') IS NOT NULL
                        THEN ', sauvegarde presente' ELSE '' END, 'OK');
    RETURN;
  END IF;
  CREATE TABLE IF NOT EXISTS public.tmp_property_images_import_sauvegarde_20261005
    (LIKE public.tmp_property_images_import INCLUDING ALL);
  ALTER TABLE public.tmp_property_images_import_sauvegarde_20261005 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.tmp_property_images_import_sauvegarde_20261005 FROM anon, authenticated;
  TRUNCATE public.tmp_property_images_import_sauvegarde_20261005;
  INSERT INTO public.tmp_property_images_import_sauvegarde_20261005
    SELECT * FROM public.tmp_property_images_import;
  GET DIAGNOSTICS n_copie = ROW_COUNT;
  SELECT count(*) INTO n_source FROM public.tmp_property_images_import;
  IF n_copie <> n_source THEN
    RAISE EXCEPTION 'Nettoyage annule : % lignes copiees sur %', n_copie, n_source;
  END IF;
  BEGIN
    DROP TABLE public.tmp_property_images_import;
    INSERT INTO nettoyage_resultat VALUES (10, '1 table residuelle', 'public.tmp_property_images_import',
      'supprimee, ' || n_copie || ' ligne(s) en sauvegarde', 'OK');
  EXCEPTION WHEN dependent_objects_still_exist THEN
    INSERT INTO nettoyage_resultat VALUES (10, '1 table residuelle', 'public.tmp_property_images_import',
      'non supprimee : un objet de la base en depend', 'A VERIFIER');
  END;
END $$;

-- Partie 2
DO $$
DECLARE
  b record;
  c record;
  n bigint;
  n_base bigint;
  n_fichiers text;
BEGIN
  FOR b IN
    SELECT sb.id, coalesce(k.usage, '') AS usage
    FROM storage.buckets sb
    LEFT JOIN (VALUES
      ('Documents', 'Next.js components/legal/LegalLayout.tsx et v28 index.html'),
      ('Logo', 'v28 index.html et js/app.js'),
      ('Videos', 'v28 index.html'),
      ('photos', 'v28 index.html, js/app.js et js/i18n.js'),
      ('blog-covers', 'v28 admin/admin.js (envoi des couvertures du blog)'),
      ('property-images', 'Next.js app/admin/properties (envoi et suppression des photos)')
    ) AS k(id, usage) ON k.id = sb.id
    WHERE sb.public
    ORDER BY sb.id
  LOOP
    n_base := 0;
    FOR c IN
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text', 'character varying', 'json', 'jsonb', 'ARRAY')
        AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I::text LIKE %L',
                     c.table_name, c.column_name, '%/object/public/' || b.id || '/%')
        INTO n;
      n_base := n_base + n;
    END LOOP;
    BEGIN
      SELECT count(*)::text INTO n_fichiers FROM storage.objects o WHERE o.bucket_id = b.id;
    EXCEPTION WHEN insufficient_privilege THEN
      n_fichiers := 'non lisible';
    END;
    INSERT INTO nettoyage_resultat VALUES (20, '2 bucket public', b.id,
      CASE WHEN b.usage <> '' THEN 'utilise par le code : ' || b.usage
           ELSE 'aucune reference dans le code' END
      || ', fichiers : ' || n_fichiers || ', adresses en base : ' || n_base,
      CASE WHEN b.usage <> '' THEN 'CONSERVER'
           WHEN n_base > 0 THEN 'CONSERVER (adresses en base)'
           ELSE 'INUTILISE : suppression sur decision' END);
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
SELECT partie::text, objet::text, constate::text, resultat::text FROM (
  SELECT ordre, partie, objet, constate, resultat FROM nettoyage_resultat
  UNION ALL
  -- Partie 3 : colonnes de la vue publique off-market
  SELECT 30, '3 vue publique off-market', 'public.properties_offmarket_public',
         CASE WHEN to_regclass('public.properties_offmarket_public') IS NULL THEN 'vue absente'
              ELSE coalesce('colonnes sensibles : ' || (
                     SELECT string_agg(column_name, ', ' ORDER BY column_name)
                     FROM information_schema.columns
                     WHERE table_schema = 'public' AND table_name = 'properties_offmarket_public'
                       AND column_name ~* '(^|_)(adresse|address|street|rue|numero|postal|zip|lat|latitude|lng|lon|longitude|coord|coords|coordinates|geom|geo|gps|cadastre|cadastral|parcel|parcelle|owner|proprietaire|vendeur|seller|mandant|city_real|district|district_label)(_|$)'),
                   'aucune colonne d''adresse, de coordonnees, de cadastre ni de proprietaire')
                   || ' ; ' || (SELECT count(*) FROM information_schema.columns
                                WHERE table_schema = 'public' AND table_name = 'properties_offmarket_public')::text
                   || ' colonnes au total' END,
         CASE WHEN to_regclass('public.properties_offmarket_public') IS NULL THEN 'SANS OBJET'
              WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = 'public' AND table_name = 'properties_offmarket_public'
                             AND column_name ~* '(^|_)(adresse|address|street|rue|numero|postal|zip|lat|latitude|lng|lon|longitude|coord|coords|coordinates|geom|geo|gps|cadastre|cadastral|parcel|parcelle|owner|proprietaire|vendeur|seller|mandant|city_real|district|district_label)(_|$)')
                THEN 'A VERIFIER' ELSE 'OK' END
  UNION ALL
  SELECT 31, '3 vue publique off-market', 'filtre de publication',
         CASE WHEN to_regclass('public.properties_offmarket_public') IS NULL THEN 'vue absente'
              WHEN pg_get_viewdef('public.properties_offmarket_public'::regclass, true) ~* 'is_published\s*=\s*true'
                   AND pg_get_viewdef('public.properties_offmarket_public'::regclass, true) ~* 'status\s*=\s*''published'''
                THEN 'seuls les biens publies sont exposes' ELSE 'filtre de publication non trouve' END,
         CASE WHEN to_regclass('public.properties_offmarket_public') IS NULL THEN 'SANS OBJET'
              WHEN pg_get_viewdef('public.properties_offmarket_public'::regclass, true) ~* 'is_published\s*=\s*true'
                   AND pg_get_viewdef('public.properties_offmarket_public'::regclass, true) ~* 'status\s*=\s*''published'''
                THEN 'OK' ELSE 'A VERIFIER' END
) t
ORDER BY ordre, objet;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE DE LA PARTIE 1 : recree la table a partir de la
-- sauvegarde, avec la regle d'acces admin de la migration
-- 20260918_rls_admin_allowlist.sql. Retirer les "-- " puis executer.
-- ---------------------------------------------------------------------
-- BEGIN;
-- CREATE TABLE public.tmp_property_images_import
--   (LIKE public.tmp_property_images_import_sauvegarde_20261005 INCLUDING ALL);
-- INSERT INTO public.tmp_property_images_import
--   SELECT * FROM public.tmp_property_images_import_sauvegarde_20261005;
-- ALTER TABLE public.tmp_property_images_import ENABLE ROW LEVEL SECURITY;
-- REVOKE ALL ON public.tmp_property_images_import FROM anon;
-- CREATE POLICY "authenticated all tmp" ON public.tmp_property_images_import
--   FOR ALL TO authenticated USING (public.is_mapa_admin()) WITH CHECK (public.is_mapa_admin());
-- COMMIT;
-- Suppression de la sauvegarde, une fois le nettoyage valide :
-- DROP TABLE IF EXISTS public.tmp_property_images_import_sauvegarde_20261005;
