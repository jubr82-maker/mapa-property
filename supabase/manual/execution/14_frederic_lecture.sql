-- =====================================================================
-- 14 NOM DE FREDERIC DANS LA BASE : LECTURE SEULE
-- MAPA Property, prepare le 2026-10-06. Ne modifie AUCUNE table du site
-- (lectures seules ; une table temporaire de session recoit le resultat).
--
-- Cherche "Frederic" (avec ou sans accents), "Mannis" et l'ancienne
-- adresse f.mannis@ dans TOUTES les colonnes texte (text, varchar, json,
-- jsonb) de toutes les tables du schema public, sauvegardes comprises
-- (signalees comme telles). Le tableau donne, par table et colonne, le
-- nombre de lignes concernees et un exemple court.
-- Attendu : rien hors des sauvegardes, une fois 13_ventes_agent_julien.sql
-- execute. Le texte des mentions legales, des CGV et de la politique RGPD
-- n'est pas en base (fichiers lib/legal/ du site).
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

DROP TABLE IF EXISTS pg_temp.frederic_resultat;
CREATE TEMP TABLE frederic_resultat (tab text, colonne text, lignes bigint, exemple text);

DO $$
DECLARE
  c record;
  n bigint;
  ex text;
  motif text := '(fr[eé]d[eé]ric|mannis)';
BEGIN
  FOR c IN
    SELECT col.table_name, col.column_name
    FROM information_schema.columns col
    JOIN pg_tables t ON t.schemaname = col.table_schema AND t.tablename = col.table_name
    WHERE col.table_schema = 'public'
      AND col.data_type IN ('text', 'character varying', 'json', 'jsonb')
    ORDER BY col.table_name, col.ordinal_position
  LOOP
    EXECUTE format('SELECT count(*), min(left(%2$I::text, 120)) FROM public.%1$I WHERE %2$I::text ~* %3$L',
                   c.table_name, c.column_name, motif)
      INTO n, ex;
    IF n > 0 THEN
      INSERT INTO frederic_resultat VALUES (c.table_name, c.column_name, n, ex);
    END IF;
  END LOOP;
END $$;

SELECT (CASE WHEN tab LIKE '%sauvegarde%' THEN tab || ' (sauvegarde)' ELSE tab END)::text AS table_concernee,
       colonne::text,
       lignes::text,
       coalesce(exemple, '')::text AS exemple
FROM frederic_resultat
UNION ALL
SELECT 'aucune occurrence'::text, ''::text, '0'::text, ''::text
WHERE NOT EXISTS (SELECT 1 FROM frederic_resultat)
ORDER BY 1, 2;
