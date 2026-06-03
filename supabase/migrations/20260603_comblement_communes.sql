-- Comblage Sprint 2 : rendement + loyer des 68 communes sans donnee reelle
-- Schema Julien : couronne proche LU-Ville = 3.00% ; reste (national) = 3.13%
-- Loyer = prix_median_m2 * rendement / 12 / 100 (loyer reste colle au prix local).
-- Met a jour UNIQUEMENT les rows ou rendement_locatif IS NULL (ne touche pas les 48 reels).

UPDATE lu_market_prices_by_commune AS t SET
  rendement_locatif = v.rdt,
  loyer_median_m2_mensuel = v.loyer
FROM (VALUES
  ('Walferdange', 3.0::numeric, 24::numeric),
  ('Niederanven', 3.0::numeric, 23::numeric),
  ('Schuttrange', 3.0::numeric, 22::numeric),
  ('Moutfort', 3.0::numeric, 22::numeric),
  ('Lintgen', 3.0::numeric, 22::numeric),
  ('Itzig', 3.0::numeric, 22::numeric),
  ('Leudelange', 3.0::numeric, 22::numeric),
  ('Fentange', 3.0::numeric, 22::numeric),
  ('Hagen', 3.0::numeric, 21::numeric),
  ('Steinfort', 3.0::numeric, 21::numeric),
  ('Heisdorf', 3.0::numeric, 21::numeric),
  ('Nospelt', 3.0::numeric, 20::numeric),
  ('Capellen', 3.0::numeric, 20::numeric),
  ('Kleinbettingen', 3.0::numeric, 20::numeric),
  ('Bascharage', 3.0::numeric, 20::numeric),
  ('Olm', 3.0::numeric, 19::numeric),
  ('Oetrange', 3.0::numeric, 19::numeric),
  ('Frisange', 3.0::numeric, 19::numeric),
  ('Dippach', 3.0::numeric, 19::numeric),
  ('Hellange', 3.0::numeric, 19::numeric),
  ('Hautcharage', 3.0::numeric, 18::numeric),
  ('Garnich', 3.0::numeric, 18::numeric),
  ('Junglinster', 3.13::numeric, 22::numeric),
  ('Heffingen', 3.13::numeric, 21::numeric),
  ('Gonderange', 3.13::numeric, 21::numeric),
  ('Rollingen', 3.13::numeric, 19::numeric),
  ('Filsdorf', 3.13::numeric, 19::numeric),
  ('Erpeldange-sur-Sure', 3.13::numeric, 19::numeric),
  ('Bettembourg', 3.13::numeric, 19::numeric),
  ('Mertert', 3.13::numeric, 19::numeric),
  ('Schieren', 3.13::numeric, 19::numeric),
  ('Peppange', 3.13::numeric, 18::numeric),
  ('Aspelt', 3.13::numeric, 18::numeric),
  ('Kayl', 3.13::numeric, 18::numeric),
  ('Echternach', 3.13::numeric, 17::numeric),
  ('Bissen', 3.13::numeric, 17::numeric),
  ('Soleuvre', 3.13::numeric, 17::numeric),
  ('Tetange', 3.13::numeric, 17::numeric),
  ('Dalheim', 3.13::numeric, 17::numeric),
  ('Lallange', 3.13::numeric, 17::numeric),
  ('Beaufort', 3.13::numeric, 17::numeric),
  ('Mondercange', 3.13::numeric, 17::numeric),
  ('Oberkorn', 3.13::numeric, 17::numeric),
  ('Sanem', 3.13::numeric, 17::numeric),
  ('Niederkorn', 3.13::numeric, 17::numeric),
  ('Rodange', 3.13::numeric, 17::numeric),
  ('Belvaux', 3.13::numeric, 17::numeric),
  ('Redange', 3.13::numeric, 16::numeric),
  ('Colmar-Berg', 3.13::numeric, 16::numeric),
  ('Clemency', 3.13::numeric, 16::numeric),
  ('Larochette', 3.13::numeric, 16::numeric),
  ('Consdorf', 3.13::numeric, 16::numeric),
  ('Bettendorf', 3.13::numeric, 16::numeric),
  ('Grosbous', 3.13::numeric, 16::numeric),
  ('Warken', 3.13::numeric, 16::numeric),
  ('Eischen', 3.13::numeric, 16::numeric),
  ('Hobscheid', 3.13::numeric, 15::numeric),
  ('Rumelange', 3.13::numeric, 15::numeric),
  ('Weiswampach', 3.13::numeric, 15::numeric),
  ('Burmerange', 3.13::numeric, 15::numeric),
  ('Mertzig', 3.13::numeric, 15::numeric),
  ('Medernach', 3.13::numeric, 15::numeric),
  ('Wiltz', 3.13::numeric, 13::numeric),
  ('Vianden', 3.13::numeric, 13::numeric),
  ('Folschette', 3.13::numeric, 12::numeric),
  ('Clervaux', 3.13::numeric, 12::numeric),
  ('Rambrouch', 3.13::numeric, 12::numeric),
  ('Stegen', 3.13::numeric, 10::numeric)
) AS v(commune, rdt, loyer)
WHERE t.commune = v.commune
  AND t.segment = 'global'
  AND t.rendement_locatif IS NULL;

-- VERIF (lance apres apply_migration) :
-- SELECT count(*) FROM lu_market_prices_by_commune WHERE rendement_locatif IS NOT NULL;  -- attendu 116
-- SELECT count(*) FROM lu_market_prices_by_commune WHERE rendement_locatif IS NULL;       -- attendu 0
-- SELECT commune, prix_median_m2, rendement_locatif, loyer_median_m2_mensuel
--   FROM lu_market_prices_by_commune WHERE commune IN ('Walferdange','Wiltz','Merl');
-- (Merl doit rester 4.07/40 = preuve que les 48 reels n'ont pas bouge)
