-- MAPA Property — Sprint B1 (formulaire estimation public)
--
-- Etend la table estimation_requests (cree par 20260514120100) avec
-- les 4 champs qualifiants demandes par le brief B1 :
--   - contact_name   : nom complet du prospect (lead utile pour suivi)
--   - surface_total  : surface habitable + caves + greniers + garages
--   - works_level    : niveau global des travaux realises
--                      (gros | moyens | petits | aucun)
--   - message        : texte libre optionnel laisse par le prospect
--
-- Decisions architecture (cf. AUDIT B1) :
--   - PAS de creation de nouvelle table estimation_leads (doublon avec
--     estimation_requests). On etend l'existant.
--   - PAS de creation de colonnes fourchette_basse / fourchette_haute :
--     les valeurs sont deja dans client_output JSONB (price_low/mid/high).
--   - Toutes les colonnes sont NULLABLE pour preserver la compat avec
--     les flux EVS existants (qui ne renseignent pas ces champs).
--   - CHECK constraint sur works_level pour eviter les valeurs aberrantes,
--     mais autorise NULL (pas de retro-fill destructif).
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio (SQL Editor).
-- Aucune ecriture DB automatique cote code (regle projet).

ALTER TABLE public.estimation_requests
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS surface_total INT,
  ADD COLUMN IF NOT EXISTS works_level TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT;

-- Contrainte works_level : valeurs limitees, NULL autorise (back-compat).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.estimation_requests'::regclass
      AND conname = 'estimation_requests_works_level_check'
  ) THEN
    ALTER TABLE public.estimation_requests
      ADD CONSTRAINT estimation_requests_works_level_check
      CHECK (works_level IS NULL OR works_level IN ('gros', 'moyens', 'petits', 'aucun'));
  END IF;
END $$;

-- Verification post-migration (optionnel) :
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'estimation_requests'
--   AND column_name IN ('contact_name', 'surface_total', 'works_level', 'message');
