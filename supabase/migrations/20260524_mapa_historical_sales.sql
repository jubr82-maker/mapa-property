-- MAPA Property — Sprint B2 squelette (historique ventes MAPA)
--
-- Cree la table interne des ventes realisees par les agents MAPA Property.
-- Sera consommee par :
--   1. Page admin /admin/ventes-realisees (CRUD : sprint B2 squelette,
--      commit suivant — formulaire d'ajout, liste filtrable)
--   2. methodSalesComparison dans lib/estimation/engine.ts (V1 actuelle
--      retourne applicable=false : "pas de table internal_comparables
--      seedee encore". L'activation effective se fera quand la table
--      contiendra >= 3 comparables dans la commune cible, sprint suivant.)
--
-- IMPORTANT — Donnee CONFIDENTIELLE :
--   Cette table contient des actes notaries privés. RLS stricte :
--   uniquement Julien et Frederic (auth.email match). Aucun acces public.
--   service_role bypasse RLS pour les lectures cote engine.ts (server-side).
--
-- Schema decisions :
-- - `agent` : enum textuel 'julien' | 'frederic' (qui a vendu)
-- - `date_acte` : DATE (pas TIMESTAMPTZ — granularité jour suffit)
-- - `prix_vente` : NUMERIC (precision financiere)
-- - `etat`, `classe_energie`, `chambres` optionnels (back-fill possible)
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio (SQL Editor).
-- Aucune ecriture DB automatique cote code (regle projet).

CREATE TABLE IF NOT EXISTS public.mapa_historical_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Bien
  property_type TEXT NOT NULL,
  surface_habitable INT NOT NULL,
  surface_terrain INT,
  chambres INT,
  classe_energie TEXT,
  annee_construction INT,
  etat TEXT,
  adresse TEXT NOT NULL,
  commune TEXT NOT NULL,

  -- Vente
  prix_vente NUMERIC NOT NULL,
  date_acte DATE NOT NULL,
  agent TEXT NOT NULL,

  -- Metadonnees
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT mapa_historical_sales_agent_check
    CHECK (agent IN ('julien', 'frederic')),
  CONSTRAINT mapa_historical_sales_prix_positif
    CHECK (prix_vente > 0),
  CONSTRAINT mapa_historical_sales_surface_positive
    CHECK (surface_habitable > 0)
);

CREATE INDEX IF NOT EXISTS mapa_historical_sales_commune_idx
  ON public.mapa_historical_sales (commune);
CREATE INDEX IF NOT EXISTS mapa_historical_sales_date_acte_idx
  ON public.mapa_historical_sales (date_acte DESC);
CREATE INDEX IF NOT EXISTS mapa_historical_sales_agent_idx
  ON public.mapa_historical_sales (agent);

-- Trigger updated_at.
CREATE OR REPLACE FUNCTION public.mapa_historical_sales_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS mapa_historical_sales_touch_updated_at
  ON public.mapa_historical_sales;
CREATE TRIGGER mapa_historical_sales_touch_updated_at
  BEFORE UPDATE ON public.mapa_historical_sales
  FOR EACH ROW EXECUTE FUNCTION public.mapa_historical_sales_touch_updated_at();

-- RLS stricte : donnees confidentielles (actes notaries).
ALTER TABLE public.mapa_historical_sales ENABLE ROW LEVEL SECURITY;

-- SELECT : uniquement Julien (j.brebion@mapagroup.org) et Frederic
-- (f.mannis@mapagroup.org) via auth.email(). Service_role bypasse RLS.
DROP POLICY IF EXISTS "mapa_historical_sales_partners_read"
  ON public.mapa_historical_sales;
CREATE POLICY "mapa_historical_sales_partners_read"
  ON public.mapa_historical_sales FOR SELECT
  USING (
    auth.email() IN (
      'j.brebion@mapagroup.org',
      'f.mannis@mapagroup.org'
    )
  );

-- INSERT/UPDATE/DELETE : meme restriction stricte.
DROP POLICY IF EXISTS "mapa_historical_sales_partners_write"
  ON public.mapa_historical_sales;
CREATE POLICY "mapa_historical_sales_partners_write"
  ON public.mapa_historical_sales FOR ALL
  USING (
    auth.email() IN (
      'j.brebion@mapagroup.org',
      'f.mannis@mapagroup.org'
    )
  )
  WITH CHECK (
    auth.email() IN (
      'j.brebion@mapagroup.org',
      'f.mannis@mapagroup.org'
    )
  );

-- Verification post-migration (optionnel) :
-- SELECT COUNT(*) FROM public.mapa_historical_sales;  -- 0 attendu
-- SELECT polname, polcmd, polqual::text FROM pg_policy
--   WHERE polrelid = 'public.mapa_historical_sales'::regclass;
