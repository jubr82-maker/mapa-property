-- =====================================================================
-- 07 SAUVEGARDE PUIS EFFACEMENT DES STATISTIQUES INTERNES DE TEST
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- Decision de Julien : toutes ces donnees proviennent de ses tests.
-- Tables concernees, noms verifies dans le depot :
--   public.property_views   vues de biens
--                           (migration 20260512_property_views.sql,
--                           ecrite par app/api/track-view)
--   public.tracking_events  evenements de suivi, Y COMPRIS les recherches
--                           des visiteurs (event_type = 'search_query' :
--                           il n'existe pas de table de recherches separee)
--                           (migration 20260514120000_tracking_events.sql,
--                           ecrite par app/api/track)
--   public.chatbot_logs     journaux du chatbot
--                           (migration 20260930_chatbot_logs.sql,
--                           ecrite par app/api/chatbot)
-- AUCUNE autre table n'est touchee : ni leads, ni estimations, ni biens,
-- ni journaux de l'admin, ni tables du pilotage (06).
--
-- Fonctionnement, pour chaque table presente :
--   1. sauvegarde : copie de toutes ses lignes dans
--      public.<table>_sauvegarde_20261005 (creee si absente, RLS active,
--      aucun acces par l'API publique) ;
--   2. effacement de toutes les lignes de la table d'origine.
-- Les deux etapes sont dans la meme transaction : pas d'effacement sans
-- sauvegarde. Rejouable : une nouvelle execution ajoute a la sauvegarde
-- les lignes arrivees depuis, puis les efface.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle.
-- Retour arriere (restaurer les lignes) : en fin de fichier.
-- =====================================================================

DROP TABLE IF EXISTS pg_temp.effacement_resultat;
CREATE TEMP TABLE effacement_resultat (
  ordre int,
  table_name text,
  presente boolean,
  sauvegardees_ce_passage bigint,
  effacees bigint
);

BEGIN;

DO $$
DECLARE
  r record;
  sauvegarde text;
  n_copie bigint;
  n_effacees bigint;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES (1, 'property_views'), (2, 'tracking_events'), (3, 'chatbot_logs')) AS v(ordre, tbl)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      INSERT INTO effacement_resultat VALUES (r.ordre, r.tbl, false, NULL, NULL);
      CONTINUE;
    END IF;
    sauvegarde := r.tbl || '_sauvegarde_20261005';
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (LIKE public.%I INCLUDING DEFAULTS)', sauvegarde, r.tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', sauvegarde);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', sauvegarde);
    EXECUTE format('INSERT INTO public.%I SELECT * FROM public.%I', sauvegarde, r.tbl);
    GET DIAGNOSTICS n_copie = ROW_COUNT;
    EXECUTE format('DELETE FROM public.%I', r.tbl);
    GET DIAGNOSTICS n_effacees = ROW_COUNT;
    IF n_copie <> n_effacees THEN
      RAISE EXCEPTION 'Effacement annule : % lignes sauvegardees mais % a effacer dans %', n_copie, n_effacees, r.tbl;
    END IF;
    INSERT INTO effacement_resultat VALUES (r.ordre, r.tbl, true, n_copie, n_effacees);
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
SELECT ('public.' || e.table_name)::text AS objet,
       (CASE WHEN NOT e.presente THEN 'table absente' ELSE e.effacees::text END)::text AS lignes_effacees_ce_passage,
       (CASE WHEN NOT e.presente THEN ''
             ELSE (xpath('/row/n/text()', query_to_xml(format(
                    'SELECT count(*) AS n FROM public.%I', e.table_name || '_sauvegarde_20261005'), false, true, '')))[1]::text END)::text AS lignes_en_sauvegarde,
       (CASE WHEN NOT e.presente THEN ''
             ELSE (xpath('/row/n/text()', query_to_xml(format(
                    'SELECT count(*) AS n FROM public.%I', e.table_name), false, true, '')))[1]::text END)::text AS lignes_restantes,
       (CASE WHEN NOT e.presente THEN 'SANS OBJET'
             WHEN (xpath('/row/n/text()', query_to_xml(format(
                    'SELECT count(*) AS n FROM public.%I', e.table_name), false, true, '')))[1]::text = '0' THEN 'OK'
             ELSE 'A VERIFIER' END)::text AS resultat
FROM effacement_resultat e
ORDER BY e.ordre;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE : remet les lignes sauvegardees dans les tables
-- d'origine. Retirer les "-- " puis executer.
-- ---------------------------------------------------------------------
-- BEGIN;
-- INSERT INTO public.property_views SELECT * FROM public.property_views_sauvegarde_20261005 ON CONFLICT DO NOTHING;
-- INSERT INTO public.tracking_events SELECT * FROM public.tracking_events_sauvegarde_20261005 ON CONFLICT DO NOTHING;
-- INSERT INTO public.chatbot_logs SELECT * FROM public.chatbot_logs_sauvegarde_20261005 ON CONFLICT DO NOTHING;
-- COMMIT;
-- Suppression des sauvegardes, une fois l'effacement valide :
-- DROP TABLE IF EXISTS public.property_views_sauvegarde_20261005;
-- DROP TABLE IF EXISTS public.tracking_events_sauvegarde_20261005;
-- DROP TABLE IF EXISTS public.chatbot_logs_sauvegarde_20261005;
