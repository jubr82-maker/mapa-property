-- =====================================================================
-- 04 BLOC F : DUREES DE CONSERVATION (accord de Julien du 2026-10-05)
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- SUPPRESSION DEFINITIVE des lignes plus anciennes que :
--   public.admin_auth_log   colonne created_at  12 mois  (journal admin)
--   public.property_views   colonne viewed_at   13 mois  (statistiques)
--   public.tracking_events  colonne created_at  13 mois  (statistiques)
--   public.chatbot_logs     colonne created_at   6 mois  (chatbot)
-- Rien d'autre n'est touche : ni prospects, ni estimations, ni mandats,
-- ni demandes off-market. Une table ou colonne absente est ignoree.
-- Le nombre exact de lignes concernees est donne AVANT execution par
-- 01_audit.sql (categorie "conservation (apercu bloc F)").
--
-- Avant : faire une sauvegarde (aucun retour arriere possible ensuite).
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau (lignes supprimees, lignes encore
-- hors delai, attendu 0, lignes conservees). Rejouable : a relancer chaque
-- mois pour tenir les durees (une seconde execution supprime seulement
-- les lignes devenues trop anciennes depuis).
-- =====================================================================

DROP TABLE IF EXISTS pg_temp.purge_resultat;
CREATE TEMP TABLE purge_resultat (
  ordre int,
  table_name text,
  colonne text,
  delai text,
  supprimees bigint
);

BEGIN;

DO $$
DECLARE
  r record;
  n bigint;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      (1, 'admin_auth_log', 'created_at', '12 months'),
      (2, 'property_views', 'viewed_at', '13 months'),
      (3, 'tracking_events', 'created_at', '13 months'),
      (4, 'chatbot_logs', 'created_at', '6 months')
    ) AS v(ordre, tbl, col, delai)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col) THEN
      EXECUTE format('DELETE FROM public.%I WHERE %I < now() - %L::interval', r.tbl, r.col, r.delai);
      GET DIAGNOSTICS n = ROW_COUNT;
      INSERT INTO purge_resultat VALUES (r.ordre, r.tbl, r.col, r.delai, n);
    ELSE
      INSERT INTO purge_resultat VALUES (r.ordre, r.tbl, r.col, r.delai, NULL);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
SELECT ('public.' || p.table_name || ' (' || p.colonne || ')')::text AS objet,
       p.delai::text AS delai,
       coalesce(p.supprimees::text, 'table ou colonne absente') AS lignes_supprimees,
       (CASE WHEN p.supprimees IS NULL THEN ''
             ELSE (xpath('/row/n/text()', query_to_xml(format(
                    'SELECT count(*) AS n FROM public.%I WHERE %I < now() - %L::interval',
                    p.table_name, p.colonne, p.delai), false, true, '')))[1]::text END)::text AS restant_hors_delai,
       (CASE WHEN p.supprimees IS NULL THEN ''
             ELSE (xpath('/row/n/text()', query_to_xml(format(
                    'SELECT count(*) AS n FROM public.%I', p.table_name), false, true, '')))[1]::text END)::text AS lignes_conservees,
       (CASE WHEN p.supprimees IS NULL THEN 'SANS OBJET'
             WHEN (xpath('/row/n/text()', query_to_xml(format(
                    'SELECT count(*) AS n FROM public.%I WHERE %I < now() - %L::interval',
                    p.table_name, p.colonne, p.delai), false, true, '')))[1]::text = '0' THEN 'OK'
             ELSE 'A VERIFIER' END)::text AS resultat
FROM purge_resultat p
ORDER BY p.ordre;

-- RETOUR ARRIERE : aucun. Seule la restauration d'une sauvegarde prise
-- avant l'execution permet de retrouver les lignes supprimees.
