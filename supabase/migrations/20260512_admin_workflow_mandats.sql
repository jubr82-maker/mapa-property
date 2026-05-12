-- ============================================================================
-- MIGRATION : workflow admin sur la table `mandats_recherche`
-- À APPLIQUER MANUELLEMENT dans Supabase SQL Editor par Julien.
-- Les agents Claude Code ne peuvent pas exécuter de migrations Supabase.
--
-- Checklist d'application :
--   [ ] 1. Ouvrir Supabase Dashboard > SQL Editor (projet beta.mapaproperty.lu).
--   [ ] 2. Coller l'intégralité de ce fichier dans une nouvelle requête.
--   [ ] 3. Cliquer "Run" et vérifier que la requête se termine sans erreur.
--   [ ] 4. Recharger /admin/mandats-recherche sur beta — les nouveaux onglets
--          et badges doivent apparaître automatiquement.
--   [ ] 5. (Optionnel) `SELECT workflow_status, count(*) FROM mandats_recherche
--           GROUP BY workflow_status;` pour vérifier le backfill.
--
-- Tant que cette migration n'est PAS appliquée, l'UI dégrade gracieusement :
--   - La page /admin/mandats-recherche affiche tous les mandats dans
--     l'onglet "Tous" (compteurs par statut à 0 sauf "Tous").
--   - La vue détail /admin/mandats-recherche/[id] charge sans crash ;
--     les Server Actions workflow renvoient l'erreur Supabase telle quelle.
--   - Les badges affichent "Nouveau" par défaut.
-- ============================================================================

-- 6 statuts workflow inviolables (alignés avec components/admin/WorkflowBadge.tsx)
ALTER TABLE public.mandats_recherche
  ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'new'
    CHECK (workflow_status IN ('new','in_progress','on_hold','validated','rejected','completed'));

ALTER TABLE public.mandats_recherche
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.mandats_recherche
  ADD COLUMN IF NOT EXISTS next_follow_up DATE;

ALTER TABLE public.mandats_recherche
  ADD COLUMN IF NOT EXISTS workflow_history JSONB DEFAULT '[]'::jsonb;

-- Index pour les filtres / sous-onglets
CREATE INDEX IF NOT EXISTS idx_mandats_recherche_workflow_status
  ON public.mandats_recherche(workflow_status);

CREATE INDEX IF NOT EXISTS idx_mandats_recherche_next_follow_up
  ON public.mandats_recherche(next_follow_up)
  WHERE next_follow_up IS NOT NULL;

-- Backfill : tous les mandats existants en 'new' (le DEFAULT le fera sur les
-- nouvelles colonnes mais on s'assure que les lignes pre-existantes sont OK).
UPDATE public.mandats_recherche SET workflow_status = COALESCE(workflow_status, 'new');
