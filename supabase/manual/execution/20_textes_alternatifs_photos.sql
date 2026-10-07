-- =====================================================================
-- 20 TEXTES ALTERNATIFS DES PHOTOS DES BIENS
-- MAPA Property, prepare le 2026-10-07. MODIFIE la STRUCTURE de
-- public.property_images (quatre colonnes ajoutees) ; ne modifie AUCUNE
-- donnee.
--
-- alt_fr, alt_en, alt_de : texte alternatif saisi photo par photo dans la
-- fiche admin (vide : texte construit depuis la piece, le type de bien et
-- la localite). room_id : piece du modele d'annonce a laquelle la photo
-- est rattachee (identifiant de properties.listing_data, SQL 17).
-- Memes droits que la table (lecture publique des photos, ecriture admin).
-- La reorganisation des photos dans l'admin conserve ces valeurs.
-- Rejouable : ADD COLUMN IF NOT EXISTS.
-- Retour arriere : ALTER TABLE public.property_images DROP COLUMN alt_fr,
--   DROP COLUMN alt_en, DROP COLUMN alt_de, DROP COLUMN room_id;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.property_images ADD COLUMN IF NOT EXISTS alt_fr text;
ALTER TABLE public.property_images ADD COLUMN IF NOT EXISTS alt_en text;
ALTER TABLE public.property_images ADD COLUMN IF NOT EXISTS alt_de text;
ALTER TABLE public.property_images ADD COLUMN IF NOT EXISTS room_id text;

COMMIT;

SELECT column_name::text AS colonne, 'presente'::text AS etat
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'property_images'
  AND column_name IN ('alt_fr', 'alt_en', 'alt_de', 'room_id')
ORDER BY 1;
