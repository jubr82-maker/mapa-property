-- ============================================================================
-- MIGRATION : workflow admin sur la table `arcova_waitlist`
-- À APPLIQUER MANUELLEMENT dans Supabase SQL Editor par Julien.
-- Les agents Claude Code ne peuvent pas exécuter de migrations Supabase.
--
-- Checklist d'application :
--   [ ] 1. Ouvrir Supabase Dashboard > SQL Editor (projet beta.mapaproperty.lu).
--   [ ] 2. Coller l'intégralité de ce fichier dans une nouvelle requête.
--   [ ] 3. Cliquer "Run" et vérifier que la requête se termine sans erreur.
--   [ ] 4. Recharger /admin/arcova sur beta — les nouveaux onglets et badges
--          doivent apparaître automatiquement.
--   [ ] 5. (Optionnel) `SELECT workflow_status, count(*) FROM arcova_waitlist
--           GROUP BY workflow_status;` pour vérifier le backfill.
--
-- Tant que cette migration n'est PAS appliquée, l'UI dégrade gracieusement :
--   - La page /admin/arcova affiche toutes les inscriptions dans l'onglet
--     "Tous" (compteurs par statut à 0 sauf "Tous").
--   - La vue détail /admin/arcova/[id] charge sans crash ; les Server Actions
--     workflow renvoient l'erreur Supabase telle quelle.
--   - Les badges affichent "Nouveau" par défaut.
--
-- NB : la colonne legacy `status` (pending/contacted/done) reste intacte —
--   le nouveau `workflow_status` la complète sans la remplacer.
-- ============================================================================

-- 6 statuts workflow inviolables (alignés avec components/admin/WorkflowBadge.tsx)
ALTER TABLE public.arcova_waitlist
  ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'new'
    CHECK (workflow_status IN ('new','in_progress','on_hold','validated','rejected','completed'));

ALTER TABLE public.arcova_waitlist
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.arcova_waitlist
  ADD COLUMN IF NOT EXISTS next_follow_up DATE;

ALTER TABLE public.arcova_waitlist
  ADD COLUMN IF NOT EXISTS workflow_history JSONB DEFAULT '[]'::jsonb;

-- Index pour les filtres / sous-onglets
CREATE INDEX IF NOT EXISTS idx_arcova_waitlist_workflow_status
  ON public.arcova_waitlist(workflow_status);

CREATE INDEX IF NOT EXISTS idx_arcova_waitlist_next_follow_up
  ON public.arcova_waitlist(next_follow_up)
  WHERE next_follow_up IS NOT NULL;

-- Backfill : toutes les inscriptions existantes en 'new'.
UPDATE public.arcova_waitlist SET workflow_status = COALESCE(workflow_status, 'new');
