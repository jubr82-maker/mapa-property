-- =====================================================================
-- 41 TAUX PAR DUREE (STATISTIQUES BCE)
-- MAPA Property, prepare le 2026-11-17. NON EXECUTE par Claude.
--
-- La veille quotidienne (lib/pilotage/bce.ts) enregistre une ligne par mois
-- publie dans public.interest_rates :
--   reference_month  TEXT   'AAAA-MM' (periode publiee par la BCE)
--   source           TEXT   'Statistiques BCE'
--   rates            JSONB  8 valeurs officielles + cles du simulateur
--   rate             NUMERIC moyenne toutes durees (compatibilite)
--   series, captured_at     facultatives (trace de la requete)
-- Les colonnes sont celles du schema documente ; la base n'a pas pu etre
-- lue pendant le chantier, ce fichier les AJOUTE seulement si elles
-- manquent (aucune modification, aucune suppression). Le code fonctionne
-- deja sans ce fichier (series et captured_at sont alors omises).
-- Ajoute aussi un index unique partiel : un seul enregistrement BCE par
-- mois, meme si deux taches tournent en meme temps (aucune ligne
-- existante n'a la source 'Statistiques BCE', l'index se cree sans
-- conflit).
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle. Rejouable sans erreur.
-- Retour arriere : en fin de fichier, en commentaire.
-- =====================================================================

BEGIN;

ALTER TABLE public.interest_rates ADD COLUMN IF NOT EXISTS reference_month TEXT;
ALTER TABLE public.interest_rates ADD COLUMN IF NOT EXISTS source          TEXT;
ALTER TABLE public.interest_rates ADD COLUMN IF NOT EXISTS rates           JSONB;
ALTER TABLE public.interest_rates ADD COLUMN IF NOT EXISTS rate            NUMERIC;
ALTER TABLE public.interest_rates ADD COLUMN IF NOT EXISTS series          TEXT;
ALTER TABLE public.interest_rates ADD COLUMN IF NOT EXISTS captured_at     TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS interest_rates_bce_month_uk
  ON public.interest_rates (reference_month)
  WHERE source = 'Statistiques BCE';

COMMIT;

-- Tableau de controle : chaque ligne doit afficher OK. Une ligne
-- "colonne obligatoire non remplie par la veille" signale une colonne
-- NOT NULL sans valeur par defaut qui bloquerait l'enregistrement.
SELECT controle, etat FROM (
  SELECT 1 AS ordre, 'colonne ' || c.col AS controle,
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'interest_rates' AND column_name = c.col
         ) THEN 'OK' ELSE 'MANQUANTE' END AS etat
  FROM (VALUES ('reference_month'), ('source'), ('rates'), ('rate'), ('series'), ('captured_at')) AS c(col)
  UNION ALL
  SELECT 1, 'type de reference_month (texte attendu, format AAAA-MM)',
         COALESCE((
           SELECT CASE WHEN data_type = 'text' OR data_type = 'character varying' THEN 'OK'
                       ELSE 'TYPE ' || upper(data_type) || ' : la veille ne pourra pas ecrire, prevenir Claude' END
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'interest_rates' AND column_name = 'reference_month'
         ), 'MANQUANTE')
  UNION ALL
  SELECT 2, 'index unique un mois BCE',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE schemaname = 'public' AND tablename = 'interest_rates' AND indexname = 'interest_rates_bce_month_uk'
         ) THEN 'OK' ELSE 'ABSENT' END
  UNION ALL
  SELECT 3, 'colonne obligatoire non remplie par la veille',
         COALESCE((
           SELECT string_agg(column_name, ', ')
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'interest_rates'
             AND is_nullable = 'NO' AND column_default IS NULL AND is_identity = 'NO'
             AND column_name NOT IN ('reference_month', 'source', 'rates', 'rate', 'series', 'captured_at')
         ), 'OK')
  UNION ALL
  SELECT 4, 'lignes BCE enregistrees',
         (SELECT count(*)::text || ' (dernier mois : ' || COALESCE(max(reference_month), 'aucun') || ')'
          FROM public.interest_rates WHERE source = 'Statistiques BCE')
) t ORDER BY ordre, controle;

-- Retour arriere (a executer seulement si necessaire) :
-- DROP INDEX IF EXISTS public.interest_rates_bce_month_uk;
-- Les colonnes ajoutees peuvent rester : elles ne gênent aucun code.
