-- supabase/migrations/20260603_mandats_unified.sql
--
-- Sprint MANDATS-A — Refonte mandats_recherche -> table "mandats" unifiee
-- couvrant 3 sections admin : Vente / Recherche / Location.
--
-- Etat pre-migration (audit 2026-06-03) :
--   - 0 row dans mandats_recherche -> aucun risque de perte.
--   - 1 FK (lead_id -> leads.id ON DELETE SET NULL).
--   - 1 PK, 3 CHECK nommes, 4 indexes, 1 RLS policy, 1 trigger a renommer.
--   - status CHECK actuel ('active','paused','completed','abandoned')
--     remplace par ('actif','vendu','loue','expire','resilie').
--   - transaction_type ('sale','rent') SUPPRIMEE (redondante avec
--     type_transaction nouveau).
--   - type_transaction NOUVEAU ('vente','recherche','location'), defaut
--     'vente' — pilote les 3 sections admin.
--
-- Execution : appliquee via apply_migration Supabase MCP en bloc DO $$
-- (PL/pgSQL preserve la visibilite catalogue inter-statement, contournant
-- le pre-parse 42P01 d'un BEGIN/COMMIT envoye en un seul payload).

DO $$
BEGIN
  -- 1. RENAME table mandats_recherche -> mandats
  ALTER TABLE public.mandats_recherche RENAME TO mandats;

  -- 2. RENAME contraintes nommees (PK + FK + status_check + workflow_status_check).
  --    transaction_type_check sera auto-droppe a l'etape 6 via DROP COLUMN.
  ALTER TABLE public.mandats RENAME CONSTRAINT mandats_recherche_pkey TO mandats_pkey;
  ALTER TABLE public.mandats RENAME CONSTRAINT mandats_recherche_lead_id_fkey TO mandats_lead_id_fkey;
  ALTER TABLE public.mandats RENAME CONSTRAINT mandats_recherche_status_check TO mandats_status_check;
  ALTER TABLE public.mandats RENAME CONSTRAINT mandats_recherche_workflow_status_check TO mandats_workflow_status_check;

  -- 3. RENAME 4 indexes (PK deja renomme via la contrainte ci-dessus).
  ALTER INDEX public.idx_mandats_recherche_status         RENAME TO idx_mandats_status;
  ALTER INDEX public.idx_mandats_recherche_lead           RENAME TO idx_mandats_lead;
  ALTER INDEX public.idx_mandats_recherche_workflow_status RENAME TO idx_mandats_workflow_status;
  ALTER INDEX public.idx_mandats_recherche_next_follow_up RENAME TO idx_mandats_next_follow_up;

  -- 4. RENAME trigger.
  ALTER TRIGGER trg_mandats_recherche_updated ON public.mandats RENAME TO trg_mandats_updated;

  -- 5. RLS : DROP + CREATE (Postgres ne supporte pas ALTER POLICY ... RENAME TO).
  DROP POLICY "authenticated all mandats recherche" ON public.mandats;
  CREATE POLICY "authenticated all mandats" ON public.mandats
    FOR ALL
    USING ((SELECT auth.uid()) IS NOT NULL)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

  -- 6. DROP colonne transaction_type (sale/rent, redondant avec type_transaction).
  --    Le CHECK mandats_recherche_transaction_type_check est auto-droppe par
  --    Postgres (contrainte mono-colonne dependante).
  ALTER TABLE public.mandats DROP COLUMN transaction_type;

  -- 7. ADD 8 colonnes nouvelles (chacune en statement separe pour erreurs claires).
  ALTER TABLE public.mandats
    ADD COLUMN type_transaction text NOT NULL DEFAULT 'vente'
      CHECK (type_transaction IN ('vente','recherche','location'));
  ALTER TABLE public.mandats
    ADD COLUMN type_mandat text
      CHECK (type_mandat IS NULL OR type_mandat IN ('exclusif','semi-exclusif','simple','autonome'));
  ALTER TABLE public.mandats ADD COLUMN bien_adresse text;
  ALTER TABLE public.mandats ADD COLUMN bien_type text;
  ALTER TABLE public.mandats ADD COLUMN prix_mise_en_vente numeric;
  ALTER TABLE public.mandats ADD COLUMN commission text;
  ALTER TABLE public.mandats ADD COLUMN date_debut date;
  ALTER TABLE public.mandats ADD COLUMN date_fin date;

  -- 8. Adapter le CHECK status aux nouvelles valeurs metier.
  ALTER TABLE public.mandats DROP CONSTRAINT mandats_status_check;
  ALTER TABLE public.mandats ALTER COLUMN status SET DEFAULT 'actif';
  ALTER TABLE public.mandats
    ADD CONSTRAINT mandats_status_check
    CHECK (status IN ('actif','vendu','loue','expire','resilie'));

  -- 9. Index pour filtrage admin par section (vente / recherche / location).
  CREATE INDEX idx_mandats_type_transaction ON public.mandats(type_transaction);
END
$$;
