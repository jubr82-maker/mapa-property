-- =====================================================================
-- 35 BANDEAUX "SOUS COMPROMIS", "VENDU", "LOUE" SUR LES BIENS
-- MAPA Property, prepare le 2026-11-12. MODIFIE la STRUCTURE de
-- public.properties (trois colonnes ajoutees) ; ne modifie AUCUNE donnee
-- et AUCUN droit (RLS inchangee : memes regles que les autres colonnes).
--
-- 1. status_banner   : bandeau pose sur la premiere photo du bien.
--                      under_compromise (Sous compromis), sold (Vendu),
--                      rented (Loue). Vide (NULL) = aucun bandeau.
-- 2. banner_position : straight (droit, au centre) ou diagonal (en
--                      diagonale). Defaut : straight.
-- 3. banner_color    : sapin, cuivre, creme ou blanc. Defaut : sapin.
--
-- Le bien reste visible sur le site avec son bandeau ; pour le retirer du
-- site, utiliser le statut de la fiche admin. Combinaisons acceptees par
-- l'admin (controle serveur, app/admin/properties/actions.ts) : bien en
-- vente = aucun, sous compromis ou vendu ; bien en location = aucun ou loue.
--
-- Avant execution, le site et l'admin fonctionnent comme aujourd'hui :
-- lecture tolerante (colonnes absentes = aucun bandeau) et, dans l'admin,
-- la mention "Les bandeaux seront enregistrables apres execution du
-- fichier SQL 35."
-- Rejouable : ADD COLUMN IF NOT EXISTS, contraintes creees une seule fois.
-- Retour arriere :
--   ALTER TABLE public.properties DROP COLUMN status_banner,
--     DROP COLUMN banner_position, DROP COLUMN banner_color;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- Apres execution : enregistrer UN bien dans l'admin (meme sans
-- modification) pour rafraichir les listes du site.
-- =====================================================================

BEGIN;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status_banner text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS banner_position text NOT NULL DEFAULT 'straight';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS banner_color text NOT NULL DEFAULT 'sapin';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_status_banner_check'
      AND conrelid = 'public.properties'::regclass
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_status_banner_check
      CHECK (status_banner IS NULL OR status_banner IN ('under_compromise', 'sold', 'rented'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_banner_position_check'
      AND conrelid = 'public.properties'::regclass
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_banner_position_check
      CHECK (banner_position IN ('straight', 'diagonal'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_banner_color_check'
      AND conrelid = 'public.properties'::regclass
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_banner_color_check
      CHECK (banner_color IN ('sapin', 'cuivre', 'creme', 'blanc'));
  END IF;
END $$;

COMMENT ON COLUMN public.properties.status_banner IS
  'Bandeau de la premiere photo : under_compromise, sold, rented (vide = aucun).';
COMMENT ON COLUMN public.properties.banner_position IS
  'Position du bandeau : straight (droit, au centre) ou diagonal.';
COMMENT ON COLUMN public.properties.banner_color IS
  'Couleur du bandeau : sapin, cuivre, creme ou blanc.';

COMMIT;

-- Controle (seul tableau affiche) : les trois colonnes et leur contrainte.
SELECT c.column_name AS colonne,
       c.data_type AS type,
       coalesce(c.column_default, '(aucun)') AS defaut,
       c.is_nullable AS vide_permis,
       coalesce((
         SELECT pg_get_constraintdef(k.oid)
         FROM pg_constraint k
         WHERE k.conrelid = 'public.properties'::regclass
           AND k.conname = 'properties_' || c.column_name || '_check'
       ), '(aucune)') AS contrainte
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'properties'
  AND c.column_name IN ('status_banner', 'banner_position', 'banner_color')
ORDER BY c.column_name;
