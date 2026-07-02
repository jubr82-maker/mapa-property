-- MAPA Property — Ajout colonne use_as_comparable sur mapa_historical_sales
-- 1er juillet 2026 (Sprint 1/3 — gestion ventes realisees, socle EVS).
--
-- CONTEXTE : chaque vente saisie doit pouvoir etre INCLUSE ou EXCLUE des
-- futurs calculs de la methode "Comparaison Directe" du moteur EVS (sprint
-- suivant). On ajoute un booleen par vente. Par defaut TRUE (une vente compte
-- comme comparable). L'admin pourra decocher une vente atypique.
--
-- IMPORTANT : cette colonne n'est PAS encore consommee par le moteur
-- (lib/estimation/engine.ts) — sprint suivant. Ici on ne fait que la stocker
-- et permettre son edition depuis /admin/ventes-realisees.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS. Ne touche pas aux donnees existantes
-- (les lignes deja presentes prennent la valeur par defaut TRUE).
--
-- A APPLIQUER MANUELLEMENT dans Supabase Studio (SQL Editor), coherent avec
-- la convention du projet. Aucune ecriture DB automatique cote code.

ALTER TABLE public.mapa_historical_sales
  ADD COLUMN IF NOT EXISTS use_as_comparable BOOLEAN NOT NULL DEFAULT TRUE;

-- Index partiel : les futurs calculs moteur ne liront que les comparables
-- actifs — index sur (commune) filtre sur use_as_comparable = true.
CREATE INDEX IF NOT EXISTS mapa_historical_sales_comparable_idx
  ON public.mapa_historical_sales (commune)
  WHERE use_as_comparable = TRUE;

-- Verification post-migration :
--   SELECT column_name, data_type, column_default, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'mapa_historical_sales' AND column_name = 'use_as_comparable';
-- Attendu : boolean | true | NO
