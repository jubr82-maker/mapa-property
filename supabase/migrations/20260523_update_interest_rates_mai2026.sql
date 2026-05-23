-- MAPA Property — HOTFIX SLIDER TAUX (sprint mai 2026)
--
-- Cause : la table interest_rates contenait encore une ligne 2026-01 avec
-- fixed_25 = 3.57. Le simulateur lit cette valeur via fetchLatestInterestRates()
-- → le fallback codé 3.82 (commit 7c03595) n'est jamais activé tant que la DB
-- contient une ligne plus récente.
--
-- Pattern projet récurrent (cf. 20260522_clear_hero_line_3.sql) : CMS Supabase
-- override les fallbacks codés. Solution : insérer la grille mai 2026.
--
-- Taux courtiers Luxembourg mai 2026 (source : grille consolidée BCL janvier
-- 2026 + courtiers agréés mai 2026) :
--   fixed_5  = 3.40 %  (5 ans)
--   fixed_10 = 3.69 %  (10 ans)
--   fixed_15 = 3.76 %  (interpolation)
--   fixed_20 = 3.79 %  (interpolation)
--   fixed_25 = 3.82 %  (interpolation)
--   fixed_30 = 3.90 %  (30 ans)
--   variable = 2.85 %
--
-- À APPLIQUER MANUELLEMENT par Julien dans Supabase Studio (SQL Editor).
-- Aucune écriture DB automatique côté code (règle projet).
--
-- Schema rappel : public.interest_rates (id UUID, rates JSONB,
-- reference_month TEXT format "YYYY-MM", source TEXT).

INSERT INTO public.interest_rates (rates, reference_month, source)
VALUES (
  '{
    "fixed_5": 3.40,
    "fixed_10": 3.69,
    "fixed_15": 3.76,
    "fixed_20": 3.79,
    "fixed_25": 3.82,
    "fixed_30": 3.90,
    "variable": 2.85
  }'::jsonb,
  '2026-05',
  'BCL et courtiers Luxembourg agréés'
);

-- Vérification post-insert (optionnel) :
-- SELECT id, rates, reference_month, source
-- FROM public.interest_rates
-- ORDER BY reference_month DESC
-- LIMIT 3;
