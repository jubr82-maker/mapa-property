-- MAPA Property — Sprint C1 (Travaux enrichis sur estimation_requests)
--
-- Etend estimation_requests (cree par 20260514120100 + etendu en B1 par
-- 20260523) avec 3 colonnes detaillees pour la section Travaux du
-- formulaire d'estimation public :
--
--   - works_details JSONB : array des categories engine EVS cochees
--                            (ex: ["toiture","chauffage","menuiseries"])
--   - works_year INT      : annee globale de realisation (1980-2026)
--   - works_amount NUMERIC: montant total HT en euros (optionnel)
--
-- Rappel : la colonne `inputs` JSONB contient deja `works: WorkItem[]` au
-- format engine (chaque item = {category, year, amount}), mais ces
-- 3 colonnes plates donnent un acces direct cote admin pour les
-- statistiques (filtrage par annee, somme volumes, top categories).
--
-- Aucune contrainte sur les valeurs : la validation se fait cote API
-- (parseWorks + WORK_CATEGORIES Set dans app/api/estimate/route.ts).
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio.

ALTER TABLE public.estimation_requests
  ADD COLUMN IF NOT EXISTS works_details JSONB,
  ADD COLUMN IF NOT EXISTS works_year INT,
  ADD COLUMN IF NOT EXISTS works_amount NUMERIC;

-- Contrainte minimaliste : works_year dans une plage realiste, ou NULL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.estimation_requests'::regclass
      AND conname = 'estimation_requests_works_year_check'
  ) THEN
    ALTER TABLE public.estimation_requests
      ADD CONSTRAINT estimation_requests_works_year_check
      CHECK (works_year IS NULL OR (works_year >= 1900 AND works_year <= 2100));
  END IF;
END $$;

-- Verification post-migration (optionnel) :
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'estimation_requests'
--   AND column_name IN ('works_details', 'works_year', 'works_amount');
