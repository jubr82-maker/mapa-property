-- MAPA Property — Sprint C7 (refonte methode Observatoire LU)
--
-- Etend la table estimation_requests avec 11 nouvelles colonnes plates
-- correspondant aux champs du formulaire C7 (apartment) :
--
--   energy_class    : CPE Luxembourg (A++ a I, NULLABLE)
--   condition       : etat C7 6 niveaux ('new'/'excellent'/'good'/'fair'/
--                     'to_renovate'/'major_works')
--   floor_type      : type d'etage (basement/ground/first/middle/high/top/penthouse)
--   atypical_type   : type atypique (standard/studio/duplex/triplex/loft)
--   vefa            : vente en l'etat futur d'achevement (TVA 3% neuf)
--   parking_indoor  : nb places parking interieur (cap 5, default 0)
--   parking_outdoor : nb places parking exterieur (cap 5, default 0)
--   cellar          : cave privative presente (forfait 3000€)
--   terrace_area    : surface terrasse m² (>15 = bonus)
--   balcony_area    : surface balcon m² (info seulement)
--   garden_area     : surface jardin m² (800€/m² plafond 50k€, apartment only)
--
-- BACK-COMPAT : la colonne 'inputs' JSONB continue de contenir le payload
-- complet (works/yearBuilt/state/etc.). Ces 11 colonnes plates sont AJOUTEES
-- pour stats admin + futurs imports analytiques sans deconstruire le JSONB.
-- Les anciens champs (works_details, year_built s'il existait) restent
-- intacts.
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio.

ALTER TABLE public.estimation_requests
  ADD COLUMN IF NOT EXISTS energy_class TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS floor_type TEXT,
  ADD COLUMN IF NOT EXISTS atypical_type TEXT,
  ADD COLUMN IF NOT EXISTS vefa BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parking_indoor INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_outdoor INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cellar BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terrace_area NUMERIC,
  ADD COLUMN IF NOT EXISTS balcony_area NUMERIC,
  ADD COLUMN IF NOT EXISTS garden_area NUMERIC;

-- Contraintes douces (NULL autorise pour back-compat avec leads pre-C7).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.estimation_requests'::regclass
      AND conname = 'estimation_requests_condition_check'
  ) THEN
    ALTER TABLE public.estimation_requests
      ADD CONSTRAINT estimation_requests_condition_check
      CHECK (condition IS NULL OR condition IN
        ('new', 'excellent', 'good', 'fair', 'to_renovate', 'major_works',
         'renovated'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.estimation_requests'::regclass
      AND conname = 'estimation_requests_floor_type_check'
  ) THEN
    ALTER TABLE public.estimation_requests
      ADD CONSTRAINT estimation_requests_floor_type_check
      CHECK (floor_type IS NULL OR floor_type IN
        ('basement', 'ground', 'first', 'middle', 'high', 'top', 'penthouse'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.estimation_requests'::regclass
      AND conname = 'estimation_requests_atypical_type_check'
  ) THEN
    ALTER TABLE public.estimation_requests
      ADD CONSTRAINT estimation_requests_atypical_type_check
      CHECK (atypical_type IS NULL OR atypical_type IN
        ('standard', 'studio', 'duplex', 'triplex', 'loft'));
  END IF;
END $$;

-- Verification post-migration (optionnel) :
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'estimation_requests'
--   AND column_name IN ('energy_class', 'condition', 'floor_type',
--     'atypical_type', 'vefa', 'parking_indoor', 'parking_outdoor',
--     'cellar', 'terrace_area', 'balcony_area', 'garden_area');
