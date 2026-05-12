-- ============================================================================
-- MIGRATION : workflow admin sur la table `offmarket_requests`
-- À APPLIQUER MANUELLEMENT dans Supabase SQL Editor par Julien.
-- Les agents Claude Code ne peuvent pas exécuter de migrations Supabase.
--
-- COHABITATION AVEC COLONNES EXISTANTES :
--   La table offmarket_requests possède déjà (cf. 20260511_admin_offmarket.sql) :
--     - `status` TEXT (workflow métier off-market : pending, qualified,
--       nda_sent, nda_signed, dossier_sent, visit_scheduled, rejected)
--     - `notes_admin` TEXT (notes legacy attachées au workflow off-market)
--   Cette migration AJOUTE un workflow administratif GÉNÉRIQUE parallèle,
--   aligné avec leads / mandats / arcova, sans toucher aux colonnes existantes :
--     - `workflow_status` (6 statuts génériques : new, in_progress, on_hold,
--       validated, rejected, completed)
--     - `admin_notes` (notes admin génériques — distinctes de notes_admin)
--     - `next_follow_up`, `workflow_history`
--
--   Les deux workflows coexistent : Julien peut utiliser `status` pour le
--   suivi métier off-market (NDA, visite) et `workflow_status` pour la
--   classification administrative croisée toutes tables.
--
-- Checklist d'application :
--   [ ] 1. Ouvrir Supabase Dashboard > SQL Editor (projet beta.mapaproperty.lu).
--   [ ] 2. Coller l'intégralité de ce fichier dans une nouvelle requête.
--   [ ] 3. Cliquer "Run" et vérifier que la requête se termine sans erreur.
--   [ ] 4. Recharger /admin/offmarket/requests sur beta — les nouveaux onglets
--          et badges doivent apparaître automatiquement.
--   [ ] 5. (Optionnel) `SELECT workflow_status, count(*) FROM offmarket_requests
--           GROUP BY workflow_status;` pour vérifier le backfill.
--
-- Tant que cette migration n'est PAS appliquée, l'UI dégrade gracieusement :
--   - La page /admin/offmarket/requests affiche toutes les demandes dans
--     l'onglet "Tous" (compteurs par statut à 0 sauf "Tous").
--   - La vue détail /admin/offmarket/requests/[id] charge sans crash ;
--     les Server Actions workflow renvoient l'erreur Supabase telle quelle.
--   - Les badges affichent "Nouveau" par défaut.
-- ============================================================================

-- 6 statuts workflow inviolables (alignés avec components/admin/WorkflowBadge.tsx)
ALTER TABLE public.offmarket_requests
  ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'new'
    CHECK (workflow_status IN ('new','in_progress','on_hold','validated','rejected','completed'));

-- IMPORTANT : `admin_notes` (générique) coexiste avec `notes_admin` (métier).
ALTER TABLE public.offmarket_requests
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.offmarket_requests
  ADD COLUMN IF NOT EXISTS next_follow_up DATE;

ALTER TABLE public.offmarket_requests
  ADD COLUMN IF NOT EXISTS workflow_history JSONB DEFAULT '[]'::jsonb;

-- Index pour les filtres / sous-onglets
CREATE INDEX IF NOT EXISTS idx_offmarket_requests_workflow_status
  ON public.offmarket_requests(workflow_status);

CREATE INDEX IF NOT EXISTS idx_offmarket_requests_next_follow_up
  ON public.offmarket_requests(next_follow_up)
  WHERE next_follow_up IS NOT NULL;

-- Backfill : toutes les demandes existantes en 'new'.
UPDATE public.offmarket_requests SET workflow_status = COALESCE(workflow_status, 'new');
