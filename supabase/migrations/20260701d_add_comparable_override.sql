-- MAPA Property — Comparabilite deux etats (auto 12 mois / override manuel)
-- 1er juillet 2026 (Sprint branchement moteur EVS — Comparaison Directe).
--
-- LOGIQUE METIER (validee Julien) :
--   "est comparable" =
--     comparable_override IS NOT NULL ? comparable_override
--                                     : (date_acte >= now() - interval '12 months')
--   - MODE AUTO (comparable_override = NULL, defaut) : suit la regle des 12
--     mois glissants, recalculee en continu a chaque estimation.
--   - MODE MANUEL (comparable_override = true/false) : le choix de Julien prime
--     et n'est plus ecrase par la regle des 12 mois.
--
-- On ajoute donc comparable_override BOOLEAN NULL (3 etats : null / true / false).
-- La colonne use_as_comparable (migration 20260701c) devient OBSOLETE cote
-- moteur : le moteur ne lira QUE comparable_override + date_acte. Voir la
-- strategie de transition dans le message de sprint (a valider avant apply).
--
-- STRATEGIE DE TRANSITION (a valider) :
--   comparable_override est NULL pour toutes les lignes existantes -> tout
--   repasse en MODE AUTO (regle 12 mois). C'est le comportement voulu par
--   defaut. use_as_comparable n'est PAS supprime ici (trace conservee) ; il
--   pourra etre drop dans un nettoyage ulterieur une fois l'admin recable sur
--   comparable_override.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS. Ne touche pas aux donnees.
--
-- A APPLIQUER MANUELLEMENT dans Supabase Studio (SQL Editor).

ALTER TABLE public.mapa_historical_sales
  ADD COLUMN IF NOT EXISTS comparable_override BOOLEAN NULL;

COMMENT ON COLUMN public.mapa_historical_sales.comparable_override IS
  'NULL = mode auto (comparable si date_acte >= 12 mois) ; true/false = override manuel qui prime.';

-- Index : le moteur lit les comparables actifs par commune. On indexe commune
-- pour les override explicitement true (cas manuel) — les lignes auto sont
-- filtrees par date cote requete.
CREATE INDEX IF NOT EXISTS mapa_historical_sales_override_idx
  ON public.mapa_historical_sales (commune)
  WHERE comparable_override IS TRUE;

-- Verification post-migration :
--   SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_name = 'mapa_historical_sales' AND column_name = 'comparable_override';
-- Attendu : boolean | YES | (aucun default)
