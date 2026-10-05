-- =====================================================================
-- 03 BLOC D : search_path FIXE SUR LES FONCTIONS DU DEPOT
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle. Rejouable sans
-- erreur ; une fonction absente est signalee SANS OBJET.
--
-- Effet : chaque fonction s'execute avec search_path = public, pg_temp
-- (alerte "function_search_path_mutable" du linter Supabase, OWASP ASVS
-- 14.2). Risque fonctionnel nul : les fonctions lisent le schema public
-- et des noms qualifies (auth.email(), auth.jwt()).
-- =====================================================================

BEGIN;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'bump_offmarket_requests_count', 'estimation_requests_touch_updated_at',
    'is_mapa_admin', 'lu_market_prices_touch_updated_at',
    'mapa_historical_sales_touch_updated_at', 'set_updated_at',
    'site_content_touch_updated_at', 'site_design_tokens_touch_updated_at'
  ] LOOP
    IF to_regprocedure('public.' || f || '()') IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public, pg_temp', f);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
SELECT ('public.' || a.nom || '()')::text AS fonction,
       (CASE WHEN p.oid IS NULL THEN 'absente'
             ELSE coalesce(array_to_string(p.proconfig, ','), 'aucun reglage') END)::text AS constate,
       (CASE WHEN p.oid IS NULL THEN 'SANS OBJET'
             WHEN array_to_string(p.proconfig, ',') ILIKE '%search_path=%public%pg_temp%' THEN 'OK'
             ELSE 'A FAIRE' END)::text AS resultat
FROM unnest(ARRAY[
  'bump_offmarket_requests_count', 'estimation_requests_touch_updated_at',
  'is_mapa_admin', 'lu_market_prices_touch_updated_at',
  'mapa_historical_sales_touch_updated_at', 'set_updated_at',
  'site_content_touch_updated_at', 'site_design_tokens_touch_updated_at'
]) AS a(nom)
LEFT JOIN pg_proc p ON p.oid = to_regprocedure('public.' || a.nom || '()')
ORDER BY a.nom;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE DU BLOC D (sans utilite fonctionnelle attendue).
-- Retirer les "-- " puis executer.
-- ---------------------------------------------------------------------
-- DO $$
-- DECLARE f text;
-- BEGIN
--   FOREACH f IN ARRAY ARRAY['bump_offmarket_requests_count', 'estimation_requests_touch_updated_at',
--     'is_mapa_admin', 'lu_market_prices_touch_updated_at', 'mapa_historical_sales_touch_updated_at',
--     'set_updated_at', 'site_content_touch_updated_at', 'site_design_tokens_touch_updated_at'] LOOP
--     IF to_regprocedure('public.' || f || '()') IS NOT NULL THEN
--       EXECUTE format('ALTER FUNCTION public.%I() RESET search_path', f);
--     END IF;
--   END LOOP;
-- END $$;
