-- ============================================================================
-- MAPA Property — Référentiel prix immobilier Luxembourg
-- Source : Observatoire de l'Habitat / Ministère du Logement (data.public.lu, CC0)
-- Données année 2025 (publication mars 2026). À régénérer trimestriellement.
-- À appliquer manuellement via Supabase SQL Editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.commune_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune TEXT NOT NULL,
  real_existing_count INTEGER,
  real_existing_avg_m2 NUMERIC,
  real_existing_range TEXT,
  real_vefa_count INTEGER,
  real_vefa_avg_m2 NUMERIC,
  real_vefa_range TEXT,
  announced_appart_count INTEGER,
  announced_appart_avg_m2 NUMERIC,
  estimated_appart_m2_from_ann NUMERIC,
  announced_maison_count INTEGER,
  announced_maison_avg_m2 NUMERIC,
  estimated_maison_m2_from_ann NUMERIC,
  as_of TEXT NOT NULL DEFAULT '2025 (Q4)',
  source TEXT NOT NULL DEFAULT 'Observatoire Habitat / data.public.lu (CC0)',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (commune, as_of)
);
CREATE INDEX IF NOT EXISTS commune_baseline_commune_idx ON public.commune_baseline (commune);

ALTER TABLE public.commune_baseline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commune_baseline_public_read" ON public.commune_baseline;
CREATE POLICY "commune_baseline_public_read" ON public.commune_baseline FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "commune_baseline_admin_write" ON public.commune_baseline;
CREATE POLICY "commune_baseline_admin_write" ON public.commune_baseline FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.vdl_quartier_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quartier TEXT NOT NULL,
  announced_appart_count INTEGER,
  announced_appart_avg_m2 NUMERIC,
  estimated_appart_m2_from_ann NUMERIC,
  announced_maison_count INTEGER,
  announced_maison_avg_m2 NUMERIC,
  estimated_maison_m2_from_ann NUMERIC,
  as_of TEXT NOT NULL DEFAULT '2025 (Q4)',
  source TEXT NOT NULL DEFAULT 'Observatoire Habitat / data.public.lu (CC0)',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quartier, as_of)
);
ALTER TABLE public.vdl_quartier_baseline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vdl_public_read" ON public.vdl_quartier_baseline;
CREATE POLICY "vdl_public_read" ON public.vdl_quartier_baseline FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "vdl_admin_write" ON public.vdl_quartier_baseline;
CREATE POLICY "vdl_admin_write" ON public.vdl_quartier_baseline FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- SEED communes (101 lignes)
-- ============================================================================
INSERT INTO public.commune_baseline (commune, real_existing_count, real_existing_avg_m2, real_existing_range, real_vefa_count, real_vefa_avg_m2, real_vefa_range, announced_appart_count, announced_appart_avg_m2, estimated_appart_m2_from_ann, announced_maison_count, announced_maison_avg_m2, estimated_maison_m2_from_ann) VALUES
  ('Beaufort', 4, NULL, '*', 4, NULL, '*', 32, 7284.52, 6647, 35, 5351.984, 4884),
  ('Bech', 1, NULL, '*', NULL, NULL, '*', 8, NULL, NULL, 26, NULL, NULL),
  ('Beckerich', 5, NULL, '*', NULL, NULL, '*', 30, 6614.201, 6035, 95, 4983.419, 4547),
  ('Berdorf', 8, NULL, '*', NULL, NULL, '*', 15, NULL, NULL, 14, NULL, NULL),
  ('Bertrange', 47, 9991.416, '7240 € - 12975 €', 16, 12360.54, '10302 € - 14948 €', 406, 11331.49, 10340, 384, 8350.165, 7620),
  ('Bettembourg', 46, 7121.654, '5104 € - 9115 €', NULL, NULL, '*', 218, 7522.348, 6864, 128, 6296.808, 5746),
  ('Bettendorf', 8, NULL, '*', NULL, NULL, '*', 24, NULL, NULL, 175, 5566.074, 5079),
  ('Betzdorf', 2, NULL, '*', NULL, NULL, '*', 6, NULL, NULL, 90, 6014.865, 5489),
  ('Bissen', 18, 6747.349, '3773 € - 10179 €', 2, NULL, '*', 46, 7664.87, 6994, 52, 5969.118, 5447),
  ('Biwer', 1, NULL, '*', NULL, NULL, '*', 6, NULL, NULL, 27, NULL, NULL),
  ('Boulaide', NULL, NULL, '*', NULL, NULL, '*', 7, NULL, NULL, 29, NULL, NULL),
  ('Bourscheid', 6, NULL, '*', NULL, NULL, '*', 21, NULL, NULL, 22, NULL, NULL),
  ('Bous-Waldbredimus', 6, NULL, '*', NULL, NULL, '*', 35, 8037.701, 7334, 54, 5916.055, 5398),
  ('Clervaux', 29, 5943.802, '4601 € - 7964 €', 3, NULL, '*', 122, 5898.5, 5382, 224, 5123.036, 4675),
  ('Colmar-Berg', 23, 6583.087, '5407 € - 7641 €', NULL, NULL, '*', 50, 6927.78, 6322, 44, 5424.762, 4950),
  ('Consdorf', 4, NULL, '*', NULL, NULL, '*', 26, NULL, NULL, 44, 5485.946, 5006),
  ('Contern', 27, 8570.014, '6168 € - 11016 €', 9, NULL, '*', 246, 9496.161, 8665, 67, 6328.366, 5775),
  ('Dalheim', 9, NULL, '*', NULL, NULL, '*', 65, 7051.553, 6435, 459, 6901.406, 6298),
  ('Diekirch', 39, 6806.282, '4821 € - 9207 €', NULL, NULL, '*', 126, 7489.602, 6834, 51, 5232.472, 4775),
  ('Differdange', 233, 6790.91, '4675 € - 9103 €', 10, 7063.751, '6323 € - 8051 €', 1035, 7220.824, 6589, 370, 5026.02, 4586),
  ('Dippach', 23, 7670.97, '5850 € - 9687 €', 2, NULL, '*', 98, 8480.572, 7739, 241, 5995.771, 5471),
  ('Dudelange', 146, 6390.285, '4462 € - 8732 €', 15, 8748.523, '7009 € - 10420 €', 710, 7139.192, 6515, 358, 5489.796, 5009),
  ('Echternach', 31, 6083.979, '4056 € - 8657 €', 1, NULL, '*', 74, 6555.484, 5982, 77, 5257.337, 4797),
  ('Ell', 12, 7123.3, '5110 € - 9461 €', NULL, NULL, '*', 18, NULL, NULL, 64, 5380.54, 4910),
  ('Erpeldange', NULL, NULL, NULL, NULL, NULL, NULL, 10, NULL, NULL, 12, NULL, NULL),
  ('Erpeldange-sur-Sûre', 10, 6934.209, '4410 € - 9536 €', 11, 9039.224, '7034 € - 10326 €', NULL, NULL, NULL, NULL, NULL, NULL),
  ('Esch-sur-Alzette', 269, 6365.475, '4147 € - 8881 €', 30, 8971.585, '7929 € - 10573 €', 1752, 7391.681, 6745, 436, 5135.175, 4686),
  ('Esch-sur-Sûre', 7, NULL, '*', 4, NULL, '*', 35, 5683.518, 5186, 52, 4310.81, 3934),
  ('Ettelbruck', 70, 6739.703, '4023 € - 8957 €', 1, NULL, '*', 157, 6854.177, 6254, 170, 4865.235, 4440),
  ('Feulen', 2, NULL, '*', NULL, NULL, '*', 18, NULL, NULL, 46, 4901.569, 4473),
  ('Fischbach', 4, NULL, '*', NULL, NULL, '*', 9, NULL, NULL, 1, NULL, NULL),
  ('Flaxweiler', NULL, NULL, '*', NULL, NULL, '*', 4, NULL, NULL, 50, 5495.506, 5015),
  ('Frisange', 33, 7391.674, '5937 € - 9108 €', 6, NULL, '*', 142, 7661.378, 6991, 193, 6242.726, 5696),
  ('Garnich', 4, NULL, '*', 1, NULL, '*', 17, NULL, NULL, 75, 6873.719, 6272),
  ('Goesdorf', 7, NULL, '*', NULL, NULL, '*', 30, 6151.176, 5613, 35, 4545.672, 4148),
  ('Grevenmacher', 42, 6130.562, '4584 € - 7724 €', 5, NULL, '*', 367, 8554.264, 7806, 38, 5646.952, 5153),
  ('Groussbus-Wal', 12, 6692.453, '4339 € - 8894 €', 8, NULL, '*', 14, NULL, NULL, 245, 4212.025, 3843),
  ('Habscht', 16, 6835.006, '4129 € - 9933 €', 2, NULL, '*', 153, 7313.451, 6674, 135, 5358.353, 4889),
  ('Heffingen', 4, NULL, '*', NULL, NULL, '*', 60, 8311.34, 7584, 35, 5370.1, 4900),
  ('Helperknapp', 27, 7204.03, '3327 € - 9633 €', 3, NULL, '*', 65, 7366.098, 6722, 70, 5268.189, 4807),
  ('Hesperange', 102, 8423.363, '5874 € - 11034 €', 22, 12805.36, '11651 € - 13933 €', 866, 10039.64, 9161, 279, 7863.955, 7176),
  ('Junglinster', 23, 8185.113, '6096 € - 9931 €', 18, 9654.185, '8051 € - 11230 €', 103, 8801.918, 8032, 244, 7553.857, 6893),
  ('Kayl', 66, 7223.277, '5398 € - 8893 €', 3, NULL, '*', 277, 6963.505, 6354, 131, 5138.584, 4689),
  ('Kehlen', 23, 8558.188, '6930 € - 10141 €', 12, 8162.009, '6405 € - 10857 €', 215, 8256.026, 7534, 330, 5952.723, 5432),
  ('Kiischpelt', NULL, NULL, '*', NULL, NULL, '*', 3, NULL, NULL, 14, NULL, NULL),
  ('Koerich', 7, NULL, '*', 2, NULL, '*', 197, 6924.573, 6319, 35, 6403.819, 5843),
  ('Kopstal', 19, 9771.457, '5738 € - 12739 €', 4, NULL, '*', 77, 8935.269, 8153, 92, 8558.628, 7810),
  ('Käerjeng', 50, 7042.496, '5532 € - 9145 €', 7, NULL, '*', 1358, 8728.515, 7965, 776, 6051.063, 5522),
  ('Lac de la Haute-Sûre', 8, NULL, '*', NULL, NULL, '*', 19, NULL, NULL, 27, NULL, NULL),
  ('Larochette', 12, 5714.908, '3942 € - 7471 €', NULL, NULL, '*', 34, 6792.424, 6198, 24, NULL, NULL),
  ('Lenningen', 4, NULL, '*', NULL, NULL, '*', 4, NULL, NULL, 35, 5496.232, 5015),
  ('Leudelange', 5, NULL, '*', 15, 8849.33, '7836 € - 11932 €', 161, 8759.538, 7993, 48, 7696.914, 7023),
  ('Lintgen', 21, 7410.135, '5323 € - 9145 €', NULL, NULL, '*', 70, 9228.819, 8421, 44, 6124.392, 5589),
  ('Lorentzweiler', 23, 8099.51, '6623 € - 10013 €', 5, NULL, '*', 168, 9542.926, 8708, 185, 5432.159, 4957),
  ('Luxembourg', NULL, NULL, NULL, NULL, NULL, NULL, 6863, 12362.33, 11281, 818, 8668.662, 7910),
  ('Luxembourg-Ville', 672, 10269.64, '6958 € - 14075 €', 182, 11990.01, '8960 € - 15137 €', NULL, NULL, NULL, NULL, NULL, NULL),
  ('Mamer', 40, 8608.471, '6144 € - 10526 €', 21, 9919.137, '8687 € - 12547 €', 721, 9766.282, 8912, 291, 7702.215, 7028),
  ('Manternach', 2, NULL, '*', NULL, NULL, '*', 1, NULL, NULL, 20, NULL, NULL),
  ('Mersch', 47, 7364.382, '4745 € - 9429 €', 12, 10225.77, '7687 € - 12983 €', 927, 9557.733, 8721, 397, 6265.377, 5717),
  ('Mertert', 36, 7395.4, '4573 € - 9685 €', 11, 8751.346, '6887 € - 10095 €', 159, 7141.64, 6517, 57, 5618.957, 5127),
  ('Mertzig', 3, NULL, '*', NULL, NULL, '*', 20, NULL, NULL, 60, 5770.799, 5266),
  ('Mondercange', 39, 7224.16, '5081 € - 9478 €', 4, NULL, '*', 181, 7225.58, 6593, 327, 6556.665, 5983),
  ('Mondorf-les-Bains', 46, 7057.24, '4607 € - 10215 €', 2, NULL, '*', 145, 7830.405, 7145, 79, 6170.447, 5631),
  ('Moyenne nationale', NULL, 7773.465, '4710 € - 12031 €', NULL, 10179.38, '6941 € - 14106 €', NULL, 9463.98, 8636, NULL, 6058.961, 5529),
  ('Niederanven', 9, NULL, '*', NULL, NULL, '*', 75, 10326.85, 9423, 150, 7564.372, 6902),
  ('Nommern', 3, NULL, '*', 1, NULL, '*', 3, NULL, NULL, 16, NULL, NULL),
  ('Parc Hosingen', 14, 5844.435, '3859 € - 7479 €', 1, NULL, '*', 31, 5916.751, 5399, 41, 4763.413, 4347),
  ('Petange', 153, 6531.358, '4465 € - 8423 €', NULL, NULL, '*', NULL, NULL, NULL, NULL, NULL, NULL),
  ('Preizerdaul', 5, NULL, '*', NULL, NULL, '*', NULL, NULL, NULL, NULL, NULL, NULL),
  ('Préizerdaul', NULL, NULL, NULL, NULL, NULL, NULL, 15, NULL, NULL, 25, NULL, NULL),
  ('Putscheid', 1, NULL, '*', NULL, NULL, '*', 15, NULL, NULL, 26, NULL, NULL),
  ('Pétange', NULL, NULL, NULL, NULL, NULL, NULL, 654, 7040.645, 6425, 461, 5037.115, 4596),
  ('Rambrouch', 5, NULL, '*', 1, NULL, '*', 22, NULL, NULL, 215, 4608.852, 4206),
  ('Reckange-sur-Mess', 6, NULL, '*', 19, 8871.951, '7838 € - 9625 €', 51, 8787.806, 8019, 80, 5739.013, 5237),
  ('Redange', 11, 6482.286, '4719 € - 8113 €', 8, NULL, '*', NULL, NULL, NULL, NULL, NULL, NULL),
  ('Redange-sur-Attert', NULL, NULL, NULL, NULL, NULL, NULL, 55, 6746.648, 6156, 47, 4629.79, 4225),
  ('Reisdorf', 2, NULL, '*', NULL, NULL, '*', 11, NULL, NULL, 53, 6050.24, 5521),
  ('Remich', 33, 6693.958, '5057 € - 8925 €', NULL, NULL, '*', 126, 8017.674, 7316, 82, 6499.894, 5931),
  ('Roeser', 54, 8157.803, '6424 € - 10385 €', NULL, NULL, '*', 153, 8233.881, 7513, 118, 7174.908, 6547),
  ('Rosport-Mompach', 6, NULL, '*', NULL, NULL, '*', 13, NULL, NULL, 81, 4806.72, 4386),
  ('Rumelange', 19, 5894.643, '3380 € - 9140 €', NULL, NULL, '*', 66, 6475.025, 5908, 86, 4918.761, 4488),
  ('Saeul', 2, NULL, '*', NULL, NULL, '*', 2, NULL, NULL, 18, NULL, NULL),
  ('Sandweiler', 19, 7792.366, '6085 € - 9676 €', NULL, NULL, '*', 26, NULL, NULL, 31, 7454.713, 6802),
  ('Sanem', 138, 7539.077, '5238 € - 10137 €', 29, 8937.283, '7623 € - 10210 €', 471, 7459.496, 6807, 491, 5496.629, 5016),
  ('Schengen', 21, 6541.013, '5060 € - 8858 €', NULL, NULL, '*', 30, 6969.232, 6359, 114, 5396.319, 4924),
  ('Schieren', 7, NULL, '*', 3, NULL, '*', 27, NULL, NULL, 22, NULL, NULL),
  ('Schifflange', 100, 7390.456, '4755 € - 9349 €', 6, NULL, '*', 303, 7298.821, 6660, 107, 5691.998, 5194),
  ('Schuttrange', 11, 8096.61, '5300 € - 9524 €', 6, NULL, '*', 84, 9432.296, 8607, 81, 7406.017, 6758),
  ('Stadtbredimus', 6, NULL, '*', NULL, NULL, '*', 16, NULL, NULL, 98, 5837.951, 5327),
  ('Steinfort', 28, 7964.728, '4440 € - 10048 €', 8, NULL, '*', 202, 8734.896, 7971, 197, 6178.631, 5638),
  ('Steinsel', 26, 8433.582, '6069 € - 11177 €', 29, 9078.293, '6537 € - 10813 €', 196, 9569.236, 8732, 102, 6931.09, 6325),
  ('Strassen', 79, 10031.07, '6974 € - 13337 €', 27, 12106.23, '9686 € - 14914 €', 263, 10779.85, 9837, 61, 8733.636, 7969),
  ('Tandel', 1, NULL, '*', NULL, NULL, '*', NULL, NULL, NULL, NULL, NULL, NULL),
  ('Troisvierges', 2, NULL, '*', NULL, NULL, '*', 11, NULL, NULL, 56, 4077.889, 3721),
  ('Useldange', 4, NULL, '*', NULL, NULL, '*', 11, NULL, NULL, 69, 5277.081, 4815),
  ('Vallée de l''Ernz', 5, NULL, '*', 1, NULL, '*', 12, NULL, NULL, 179, 4824.492, 4402),
  ('Vianden', 7, NULL, '*', 2, NULL, '*', 27, NULL, NULL, 42, 4223.038, 3854),
  ('Vichten', 4, NULL, '*', NULL, NULL, '*', 7, NULL, NULL, 22, NULL, NULL),
  ('Waldbillig', 3, NULL, '*', NULL, NULL, '*', 5, NULL, NULL, 39, 5277.722, 4816),
  ('Walferdange', 59, 8550.38, '6184 € - 11279 €', 5, NULL, '*', 227, 9583.645, 8745, 95, 7529.224, 6870),
  ('Weiler-la-Tour', 10, 7797.582, '6435 € - 9485 €', NULL, NULL, '*', 38, 8386.918, 7653, 94, 6475.206, 5909),
  ('Weiswampach', 18, 5934.055, '3801 € - 7414 €', NULL, NULL, '*', 63, 6679.935, 6095, 21, NULL, NULL),
  ('Wiltz', 30, 5274.524, '3514 € - 6770 €', NULL, NULL, '*', 196, 5627.966, 5136, 462, 4213.139, 3844),
  ('Wincrange', 6, NULL, '*', NULL, NULL, '*', 13, NULL, NULL, 69, 4291.768, 3916),
  ('Winseler', 6, NULL, '*', NULL, NULL, '*', 23, NULL, NULL, 19, NULL, NULL),
  ('Wormeldange', 13, 6068.175, '3101 € - 9098 €', 4, NULL, '*', 179, 8527.334, 7781, 53, 5181.871, 4728)
ON CONFLICT (commune, as_of) DO NOTHING;

-- SEED quartiers VDL (25)
INSERT INTO public.vdl_quartier_baseline (quartier, announced_appart_count, announced_appart_avg_m2, estimated_appart_m2_from_ann, announced_maison_count, announced_maison_avg_m2, estimated_maison_m2_from_ann) VALUES
  ('Beggen', 72, 10124.0, 9238, 16, 7149.152, 6524),
  ('Belair', 1314, 14272.85, 13024, 67, 10966.7, 10007),
  ('Bonnevoie', 530, 10560.37, 9636, 64, 7593.921, 6929),
  ('Cents', 94, 8892.141, 8114, 121, 8181.7, 7466),
  ('Cessange', 141, 10900.47, 9947, 23, 8749.626, 7984),
  ('Clausen', 14, 9959.866, 9088, 5, NULL, NULL),
  ('Dommeldange', 36, 9990.104, 9116, 12, 7256.224, 6621),
  ('Eich', 136, 11182.46, 10204, 10, 7110.758, 6489),
  ('Gare', 212, 10828.69, 9881, 117, 8092.067, 7384),
  ('Gasperich', 303, 12289.33, 11214, 28, 9586.629, 8748),
  ('Grund', 2, NULL, NULL, 3, NULL, NULL),
  ('Hamm', 52, 10558.65, 9635, 10, 7674.495, 7003),
  ('Hollerich', 221, 11406.47, 10408, 19, 9006.511, 8218),
  ('Kirchberg', 357, 11407.35, 10409, 15, 7713.11, 7038),
  ('Limpertsberg', 362, 11977.03, 10929, 49, 10880.44, 9928),
  ('Luxembourg-Ville', 6863, 12362.33, 11281, 818, 8668.662, 7910),
  ('Merl', 325, 11767.51, 10738, 46, 8989.389, 8203),
  ('Moyenne nationale', 22548, 9463.98, 8636, 13059, 6058.961, 5529),
  ('Mühlenbach', 71, 11694.98, 10672, 32, 8133.353, 7422),
  ('Neudorf', 1596, 13600.66, 12411, 23, 8726.785, 7963),
  ('Pfaffenthal', 22, 9665.391, 8820, 8, NULL, NULL),
  ('Pulvermühle', 12, 10295.61, 9395, 1, NULL, NULL),
  ('Rollingergrund', 170, 11014.29, 10051, 32, 8524.263, 7778),
  ('Ville-Haute', 189, 11742.9, 10715, 47, 9054.428, 8262),
  ('Weimerskirch', 65, 10062.35, 9182, 27, 7367.799, 6723)
ON CONFLICT (quartier, as_of) DO NOTHING;
