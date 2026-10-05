-- =====================================================================
-- ARCHIVAGE DES BIENS (table public.properties)
-- MAPA Property, prepare le 2026-10-05. A executer par Julien dans
-- l'editeur SQL Supabase, bloc par bloc. NON EXECUTE par Claude.
--
-- Fonctionnement cote code (deja livre, actif des que ce SQL est passe) :
--   Archiver  = is_published = false + archived_at = maintenant.
--   Restaurer = is_published = true  + archived_at = NULL.
--   Le site public ne lit que les biens publies (lib/data.ts) : un bien
--   archive disparait du catalogue, de l'accueil, des carrousels, de la
--   recherche, du sitemap, des pages de communes et du chatbot. Sa fiche
--   repond 410 (proxy.ts -> app/api/property-gone).
--   Supprimer = uniquement un bien archive, apres saisie de sa reference.
-- Avant ce SQL : l'admin affiche un avertissement et desactive Archiver,
-- Restaurer et Supprimer ; le reste du site est inchange.
-- =====================================================================


-- =====================================================================
-- BLOC 1 : CONTROLE PREALABLE (lecture seule)
-- =====================================================================

-- 1a. Cles etrangeres qui pointent vers properties (table creee hors du
--     depot : non documentees dans les migrations). Attendu : au plus
--     property_images.property_id. confdeltype : a=no action, r=restrict,
--     c=cascade, n=set null. Si "a" ou "r" : la suppression definitive d'un
--     bien supprime d'abord ses lignes property_images (deja prevu dans le
--     code). Toute AUTRE table listee ici : la signaler avant de continuer.
SELECT c.conrelid::regclass AS table_enfant, c.conname AS contrainte, c.confdeltype AS sur_suppression
FROM pg_constraint c
WHERE c.contype = 'f' AND c.confrelid = 'public.properties'::regclass
ORDER BY 1;

-- 1b. Regles d'acces (RLS) de properties : la suppression par un admin
--     passe par la regle "authenticated all properties" (FOR ALL,
--     is_mapa_admin()). Verifier qu'elle est bien en FOR ALL (cmd = ALL).
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('properties', 'property_images')
ORDER BY tablename, policyname;

-- 1c. Vues qui lisent properties : elles doivent filtrer is_published
--     (un bien archive est toujours non publie, cf. contrainte du bloc 2).
SELECT DISTINCT v.table_schema || '.' || v.view_name AS vue
FROM information_schema.view_table_usage v
WHERE v.table_schema = 'public' AND v.table_name = 'properties';

-- 1d. Vue publique off-market : elle doit contenir
--     "WHERE is_published = TRUE AND status = 'published'"
--     (migration 20260701e). Les biens off-market retires utilisent deja le
--     statut 'withdrawn' : ils sont exclus de la vue. Aucune modification.
SELECT pg_get_viewdef('public.properties_offmarket_public'::regclass, true) AS definition;


-- =====================================================================
-- BLOC 2 : MODIFICATION
-- =====================================================================

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.properties.archived_at IS
  'Date et heure d''archivage (admin). Non NULL = bien archive, retire du site public.';

-- Garantie en base : un bien archive n'est jamais publie (protege aussi
-- contre une republication par la synchronisation Apimo).
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_archived_not_published;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_archived_not_published
  CHECK (archived_at IS NULL OR is_published = FALSE);

CREATE INDEX IF NOT EXISTS idx_properties_archived_at
  ON public.properties (archived_at)
  WHERE archived_at IS NOT NULL;

COMMIT;

-- Verification : la colonne existe et aucun bien n'est encore archive.
SELECT count(*) FILTER (WHERE archived_at IS NOT NULL) AS biens_archives,
       count(*) AS biens_total
FROM public.properties;


-- =====================================================================
-- BLOC 3 (RETOUR ARRIERE, seulement si necessaire)
-- Retire la colonne : les biens archives restent simplement non publies
-- (hors ligne). L'admin desactive alors l'archivage (avertissement).
-- =====================================================================

-- BEGIN;
-- ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_archived_not_published;
-- DROP INDEX IF EXISTS public.idx_properties_archived_at;
-- ALTER TABLE public.properties DROP COLUMN IF EXISTS archived_at;
-- COMMIT;
