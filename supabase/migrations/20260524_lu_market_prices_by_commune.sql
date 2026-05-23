-- MAPA Property — Sprint B2 squelette (data references EVS)
--
-- Cree la table de reference des prix marche par commune au Luxembourg.
-- Cible des prochains imports CSV Observatoire de l'Habitat / STATEC
-- (data.public.lu). Migration squelette : la table est creee VIDE,
-- l'alimentation se fera via :
--   1. Script d'import scripts/import-observatoire-csv.ts (sprint suivant)
--   2. Cron Vercel trimestriel pour refresh apres publication STATEC
--   3. INSERT manuel d'amorcage pour les premieres communes critiques
--
-- Activation cote engine.ts (methodStatecReference + methodIncomeCapitalization
-- + methodHedonic baseline) : se fera SEULEMENT quand des donnees seront
-- presentes. Si la table est vide, le fallback codé palier-par-palier
-- continue de fonctionner — pas de regression EVS test:engine.
--
-- Schema decisions :
-- - `segment` : appartement_existant / appartement_vefa / maison (extensible)
-- - `trimestre` : format texte 'T4-2025' (aligne avec la communication STATEC)
-- - `loyer_median_m2_mensuel` : ajoute des cette migration pour eviter une
--   2eme migration pour la methode capitalisation locative — il sera
--   NULL tant que pas d'import loyers separe.
-- - Contrainte UNIQUE(commune, segment, trimestre) : idempotence des imports
--   (REPLACE/UPSERT).
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio (SQL Editor).
-- Aucune ecriture DB automatique cote code (regle projet).

CREATE TABLE IF NOT EXISTS public.lu_market_prices_by_commune (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune TEXT NOT NULL,
  segment TEXT NOT NULL,
  trimestre TEXT NOT NULL,
  prix_median_m2 NUMERIC,
  fourchette_basse_m2 NUMERIC,
  fourchette_haute_m2 NUMERIC,
  loyer_median_m2_mensuel NUMERIC,
  nb_transactions INT,
  source TEXT NOT NULL DEFAULT 'Observatoire de l''Habitat / STATEC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (commune, segment, trimestre)
);

CREATE INDEX IF NOT EXISTS lu_market_prices_commune_idx
  ON public.lu_market_prices_by_commune (commune);
CREATE INDEX IF NOT EXISTS lu_market_prices_trimestre_idx
  ON public.lu_market_prices_by_commune (trimestre DESC);

-- Trigger updated_at (idempotent : reutilise une fonction generique si
-- elle existe deja en base, sinon la cree).
CREATE OR REPLACE FUNCTION public.lu_market_prices_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS lu_market_prices_touch_updated_at
  ON public.lu_market_prices_by_commune;
CREATE TRIGGER lu_market_prices_touch_updated_at
  BEFORE UPDATE ON public.lu_market_prices_by_commune
  FOR EACH ROW EXECUTE FUNCTION public.lu_market_prices_touch_updated_at();

-- RLS : lecture publique (donnees Observatoire publiques), ecriture admin.
ALTER TABLE public.lu_market_prices_by_commune ENABLE ROW LEVEL SECURITY;

-- Lecture ouverte (donnees Observatoire = publiques par nature, pas
-- d'enjeu confidentialite ; le frontend public en a besoin pour la
-- transparence EVS).
DROP POLICY IF EXISTS "lu_market_prices_public_read"
  ON public.lu_market_prices_by_commune;
CREATE POLICY "lu_market_prices_public_read"
  ON public.lu_market_prices_by_commune FOR SELECT
  USING (TRUE);

-- INSERT/UPDATE/DELETE : admin authentifie uniquement (refresh via cron
-- Vercel utilisant service_role bypasse RLS de toute facon).
DROP POLICY IF EXISTS "lu_market_prices_admin_write"
  ON public.lu_market_prices_by_commune;
CREATE POLICY "lu_market_prices_admin_write"
  ON public.lu_market_prices_by_commune FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Verification post-migration (optionnel) :
-- SELECT COUNT(*) FROM public.lu_market_prices_by_commune;  -- 0 attendu
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'lu_market_prices_by_commune';
