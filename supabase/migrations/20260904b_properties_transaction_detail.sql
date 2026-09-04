-- ============================================================================
-- MAPA Property — transaction_detail sur properties (transaction riche).
-- 4 septembre 2026.
--
-- NON EXÉCUTÉE PAR CLAUDE. À appliquer manuellement par Julien dans le
-- SQL Editor Supabase, après relecture.
--
-- CONTEXTE : properties.transaction reste un binaire sale/rent (contrainte
-- CHECK existante properties_transaction_check, inchangée ici — tout le
-- reste du code, PropertyCard/FilterBar/mapTransaction()/matchesTypeQuery,
-- continue de fonctionner sans modification). transaction_detail stocke en
-- plus le slug précis de TRANSACTION_TYPES (lib/taxonomy/property-types.ts)
-- choisi au formulaire de création — ex. "vente-en-viager" — pour un
-- affichage riche sur la fiche, sans jamais remplacer transaction.
--
-- Nullable, aucun défaut : les 16 biens existants (créés avant cette
-- colonne) restent NULL et retombent sur l'affichage Vente/Location actuel
-- via transaction — rien ne change pour eux.
--
-- Idempotente : ADD COLUMN IF NOT EXISTS.
-- ============================================================================

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS transaction_detail TEXT;

COMMIT;

-- ============================================================================
-- Vérification post-migration (à lancer manuellement, informatif) :
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'properties'
--   AND column_name = 'transaction_detail';
-- ============================================================================
