-- MAPA Property — Sprint B3 (seed donnees marche Luxembourg mai 2026)
--
-- Seed les 100 communes du Luxembourg dans lu_market_prices_by_commune
-- pour le trimestre T2-2026 (snapshot mai 2026). Permettra plus tard a
-- l'engine EVS (sprint B4) d'activer methodStatecReference + 
-- methodIncomeCapitalization en lecture base au lieu des fallbacks codes.
--
-- Format de chaque ligne :
--   commune | prix_median_m2 | loyer_median_m2_mensuel | rendement_locatif
--
--   - 100 communes au total
--   - 26 disposent d'un loyer + rendement observe (Top vendeurs + bassins
--     d'agglomeration Esch/Differdange/Diekirch)
--   - 74 ont loyer + rendement NULL (volume locatif insuffisant ou
--     biens hors marche locatif standard)
--   - Tous : segment='all', trimestre='T2-2026', source generique
--     'Donnees marche Luxembourg, mai 2026' (wording strict — JAMAIS
--     citer une source nominale comme atHome, Immotop, etc.)
--
-- Idempotence : ON CONFLICT (commune, segment, trimestre) DO UPDATE
-- permet de re-jouer le seed si correction necessaire.
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio.

INSERT INTO public.lu_market_prices_by_commune
  (commune, segment, trimestre, prix_median_m2, loyer_median_m2_mensuel, rendement_locatif, source)
VALUES
  ('Luxembourg', 'all', 'T2-2026', 11210, 32, 2.96, 'Donnees marche Luxembourg, mai 2026'),
  ('Strassen', 'all', 'T2-2026', 10455, 31, 3.00, 'Donnees marche Luxembourg, mai 2026'),
  ('Bereldange', 'all', 'T2-2026', 10178, 24, 2.87, 'Donnees marche Luxembourg, mai 2026'),
  ('Bertrange', 'all', 'T2-2026', 9916, 28, 2.91, 'Donnees marche Luxembourg, mai 2026'),
  ('Walferdange', 'all', 'T2-2026', 9723, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Steinsel', 'all', 'T2-2026', 9577, 29, 3.20, 'Donnees marche Luxembourg, mai 2026'),
  ('Mamer', 'all', 'T2-2026', 9471, 25, 2.55, 'Donnees marche Luxembourg, mai 2026'),
  ('Howald', 'all', 'T2-2026', 9462, 25, 3.06, 'Donnees marche Luxembourg, mai 2026'),
  ('Helmsange', 'all', 'T2-2026', 9333, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Schuttrange', 'all', 'T2-2026', 9283, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Alzingen', 'all', 'T2-2026', 9227, 26, 3.31, 'Donnees marche Luxembourg, mai 2026'),
  ('Kehlen', 'all', 'T2-2026', 8999, 26, 3.09, 'Donnees marche Luxembourg, mai 2026'),
  ('Itzig', 'all', 'T2-2026', 8808, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Moutfort', 'all', 'T2-2026', 8787, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Fentange', 'all', 'T2-2026', 8775, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Grevenmacher', 'all', 'T2-2026', 8756, 21, 2.83, 'Donnees marche Luxembourg, mai 2026'),
  ('Leudelange', 'all', 'T2-2026', 8685, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Hesperange', 'all', 'T2-2026', 8671, 28, 3.11, 'Donnees marche Luxembourg, mai 2026'),
  ('Bridel', 'all', 'T2-2026', 8636, 25, 3.01, 'Donnees marche Luxembourg, mai 2026'),
  ('Junglinster', 'all', 'T2-2026', 8599, 24, 2.83, 'Donnees marche Luxembourg, mai 2026'),
  ('Contern', 'all', 'T2-2026', 8593, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Belval', 'all', 'T2-2026', 8556, 26, 3.44, 'Donnees marche Luxembourg, mai 2026'),
  ('Hagen', 'all', 'T2-2026', 8488, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Lorentzweiler', 'all', 'T2-2026', 8422, 27, 3.02, 'Donnees marche Luxembourg, mai 2026'),
  ('Steinfort', 'all', 'T2-2026', 8357, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Pontpierre', 'all', 'T2-2026', 8336, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Heisdorf', 'all', 'T2-2026', 8331, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Capellen', 'all', 'T2-2026', 8315, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Nospelt', 'all', 'T2-2026', 8265, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Mersch', 'all', 'T2-2026', 8249, 24, 2.45, 'Donnees marche Luxembourg, mai 2026'),
  ('Lintgen', 'all', 'T2-2026', 8167, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Sandweiler', 'all', 'T2-2026', 8117, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Kleinbettingen', 'all', 'T2-2026', 8064, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Roeser', 'all', 'T2-2026', 7983, 25, 3.29, 'Donnees marche Luxembourg, mai 2026'),
  ('Gonderange', 'all', 'T2-2026', 7897, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Bascharage', 'all', 'T2-2026', 7858, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Hellange', 'all', 'T2-2026', 7804, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Olm', 'all', 'T2-2026', 7783, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Mondorf-Les-Bains', 'all', 'T2-2026', 7764, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Dippach', 'all', 'T2-2026', 7737, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Rollingen', 'all', 'T2-2026', 7687, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Frisange', 'all', 'T2-2026', 7671, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Erpeldange-sur-Sûre', 'all', 'T2-2026', 7653, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Oetrange', 'all', 'T2-2026', 7601, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Heffingen', 'all', 'T2-2026', 7597, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Beidweiler', 'all', 'T2-2026', 7548, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Filsdorf', 'all', 'T2-2026', 7450, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Schieren', 'all', 'T2-2026', 7431, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Hautcharage', 'all', 'T2-2026', 7313, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Bettembourg', 'all', 'T2-2026', 7224, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Schifflange', 'all', 'T2-2026', 7203, 27, 3.03, 'Donnees marche Luxembourg, mai 2026'),
  ('Garnich', 'all', 'T2-2026', 7182, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Diekirch', 'all', 'T2-2026', 7112, 23, 3.28, 'Donnees marche Luxembourg, mai 2026'),
  ('Mertert', 'all', 'T2-2026', 7064, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Remich', 'all', 'T2-2026', 6950, 24, 2.06, 'Donnees marche Luxembourg, mai 2026'),
  ('Aspelt', 'all', 'T2-2026', 6927, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Beaufort', 'all', 'T2-2026', 6765, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Dudelange', 'all', 'T2-2026', 6736, 23, 3.05, 'Donnees marche Luxembourg, mai 2026'),
  ('Tetange', 'all', 'T2-2026', 6667, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Pétange', 'all', 'T2-2026', 6649, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Peppange', 'all', 'T2-2026', 6632, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Wasserbillig', 'all', 'T2-2026', 6614, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Esch-sur-Alzette', 'all', 'T2-2026', 6557, 25, 3.65, 'Donnees marche Luxembourg, mai 2026'),
  ('Echternach', 'all', 'T2-2026', 6544, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Kayl', 'all', 'T2-2026', 6530, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Oberkorn', 'all', 'T2-2026', 6481, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Colmar-Berg', 'all', 'T2-2026', 6479, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Differdange', 'all', 'T2-2026', 6466, 26, 3.44, 'Donnees marche Luxembourg, mai 2026'),
  ('Mondercange', 'all', 'T2-2026', 6454, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Niederkorn', 'all', 'T2-2026', 6450, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Belvaux', 'all', 'T2-2026', 6444, 21, 3.60, 'Donnees marche Luxembourg, mai 2026'),
  ('Sanem', 'all', 'T2-2026', 6434, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Bissen', 'all', 'T2-2026', 6430, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Rodange', 'all', 'T2-2026', 6430, 20, 3.73, 'Donnees marche Luxembourg, mai 2026'),
  ('Soleuvre', 'all', 'T2-2026', 6422, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Bettendorf', 'all', 'T2-2026', 6414, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Eischen', 'all', 'T2-2026', 6408, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Mertzig', 'all', 'T2-2026', 6137, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Rumelange', 'all', 'T2-2026', 6133, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Clemency', 'all', 'T2-2026', 6097, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Redange', 'all', 'T2-2026', 6039, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Weiswampach', 'all', 'T2-2026', 6037, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Grosbous', 'all', 'T2-2026', 5985, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Warken', 'all', 'T2-2026', 5974, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Consdorf', 'all', 'T2-2026', 5966, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Ettelbruck', 'all', 'T2-2026', 5926, 20, 3.13, 'Donnees marche Luxembourg, mai 2026'),
  ('Larochette', 'all', 'T2-2026', 5887, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Hobscheid', 'all', 'T2-2026', 5851, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Lamadelaine', 'all', 'T2-2026', 5830, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Burmerange', 'all', 'T2-2026', 5742, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Boevange-sur-Attert', 'all', 'T2-2026', 5627, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Medernach', 'all', 'T2-2026', 5610, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Pissange', 'all', 'T2-2026', 5447, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Blaschette', 'all', 'T2-2026', 5087, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Wiltz', 'all', 'T2-2026', 4963, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Vianden', 'all', 'T2-2026', 4781, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Beckerich', 'all', 'T2-2026', 4749, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Clervaux', 'all', 'T2-2026', 4649, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Folschette', 'all', 'T2-2026', 4588, NULL, NULL, 'Donnees marche Luxembourg, mai 2026'),
  ('Stegen', 'all', 'T2-2026', 4022, NULL, NULL, 'Donnees marche Luxembourg, mai 2026');

ON CONFLICT (commune, segment, trimestre) DO UPDATE SET
  prix_median_m2 = EXCLUDED.prix_median_m2,
  loyer_median_m2_mensuel = EXCLUDED.loyer_median_m2_mensuel,
  rendement_locatif = EXCLUDED.rendement_locatif,
  source = EXCLUDED.source,
  updated_at = NOW();

-- Verifications post-seed (optionnel) :
-- SELECT COUNT(*) FROM public.lu_market_prices_by_commune
--   WHERE trimestre = 'T2-2026';                                  -- 100 attendu
-- SELECT COUNT(*) FROM public.lu_market_prices_by_commune
--   WHERE trimestre = 'T2-2026' AND loyer_median_m2_mensuel IS NOT NULL; -- 26 attendu
-- SELECT MIN(prix_median_m2), MAX(prix_median_m2) FROM public.lu_market_prices_by_commune
--   WHERE trimestre = 'T2-2026';                                  -- 4022 / 11210
