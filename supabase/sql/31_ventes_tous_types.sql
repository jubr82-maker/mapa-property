-- =====================================================================
-- 31 VENTES REALISEES : TOUS LES TYPES DE BIENS
-- MAPA Property, prepare le 2026-10-22. MODIFIE seulement la STRUCTURE de
-- public.mapa_historical_sales ; ne modifie AUCUNE vente enregistree.
--
-- Le type (property_type) n'a aucune contrainte en base (migration
-- 20260524) : rien a changer pour accepter local commercial, bureau, fonds
-- de commerce, commerce, entrepot, parking, garage, immeuble de rapport,
-- terrain. La liste fermee est controlee par le site
-- (lib/admin/sale-fields.ts, liste des fiches de biens).
--
-- En revanche, surface_habitable est obligatoire et > 0 (NOT NULL et
-- contrainte mapa_historical_sales_surface_positive) : un terrain, un
-- parking ou un fonds de commerce sans surface ne peut pas etre enregistre.
-- Ce fichier la rend facultative, toujours > 0 quand elle est saisie.
-- Le moteur d'estimation ignore deja une vente sans surface.
--
-- A EXECUTER AVANT le deploiement du formulaire (commit "ventes realisees :
-- tous les types de biens"). Sans lui, enregistrer une vente sans surface
-- echoue avec un message d'erreur, rien n'est perdu.
-- Rejouable. Retour arriere (seulement si aucune vente sans surface) :
--   ALTER TABLE public.mapa_historical_sales ALTER COLUMN surface_habitable SET NOT NULL;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.mapa_historical_sales ALTER COLUMN surface_habitable DROP NOT NULL;

ALTER TABLE public.mapa_historical_sales DROP CONSTRAINT IF EXISTS mapa_historical_sales_surface_positive;
ALTER TABLE public.mapa_historical_sales
  ADD CONSTRAINT mapa_historical_sales_surface_positive
  CHECK (surface_habitable IS NULL OR surface_habitable > 0);

COMMIT;

-- Tableau final (seul affiche) : contraintes de la table, colonne surface,
-- types deja enregistres (une ancienne valeur "maison" ou "immeuble" reste
-- lisible et modifiable dans l'admin).
SELECT 'contrainte ' || conname AS controle, pg_get_constraintdef(oid) AS etat
FROM pg_constraint
WHERE conrelid = 'public.mapa_historical_sales'::regclass AND contype = 'c'
UNION ALL
SELECT 'surface_habitable obligatoire',
       CASE WHEN (SELECT is_nullable FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'mapa_historical_sales' AND column_name = 'surface_habitable') = 'YES'
            THEN 'non (facultative)' ELSE 'OUI' END
UNION ALL
SELECT 'type enregistre : ' || property_type, count(*)::text || ' vente(s)'
FROM public.mapa_historical_sales
GROUP BY property_type
ORDER BY 1;
