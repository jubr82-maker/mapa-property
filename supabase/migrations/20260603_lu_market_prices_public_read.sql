-- Sprint 2 estimations : policy SELECT public sur lu_market_prices_by_commune.
--
-- Cohérent avec commune_baseline (commune_baseline_public_read, USING true)
-- car les données marché (prix médian, loyer, rendement) ne sont pas
-- confidentielles : elles agrègent des sources publiques (Observatoire de
-- l'Habitat / STATEC). RLS reste activé, écriture interdite côté anon.
--
-- Sans cette policy, /api/estimate ne peut pas lire les loyers/rendements
-- réels et retombe systématiquement sur le fallback hardcodé du moteur
-- (DEFAULT_YIELD 3.5 %), rendant la migration data 20260603_market_data_2026
-- inutile pour les estimations publiques.

CREATE POLICY "lu_market_prices_public_read"
  ON public.lu_market_prices_by_commune
  FOR SELECT
  USING (true);
