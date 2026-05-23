-- MAPA Property — Sprint B3 (rendement locatif par commune)
--
-- Etend lu_market_prices_by_commune (cree par 20260524) avec une colonne
-- rendement_locatif. Le loyer_median_m2_mensuel existait deja (anticipe
-- en B2), il manquait juste le rendement brut observe.
--
-- Format : pourcentage (ex : 2.96 pour 2,96%). NULLABLE — la majorite
-- des communes n'ont pas de rendement observe disponible (faible volume
-- locatif, biens haut de gamme).
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio.

ALTER TABLE public.lu_market_prices_by_commune
  ADD COLUMN IF NOT EXISTS rendement_locatif NUMERIC;

-- Verification post-migration (optionnel) :
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'lu_market_prices_by_commune'
--     AND column_name IN ('loyer_median_m2_mensuel', 'rendement_locatif');
