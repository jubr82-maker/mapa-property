-- =====================================================================
-- ABANDONNE LE 2026-10-07 : NE PAS EXECUTER.
-- Julien garde "a vendre" et "a louer" dans les titres ; les modeles
-- d'annonces les placent de facon coherente. Fichier conserve pour
-- memoire uniquement.
-- =====================================================================
-- 15 TITRES DES BIENS : RETRAIT DES MENTIONS "A VENDRE" EN TETE
-- MAPA Property, prepare le 2026-10-06. MODIFIE public.properties
-- (colonnes title_fr, title_en, title_de uniquement).
--
-- Retire EN TETE du titre, quelle que soit la casse, avec la ponctuation
-- et les espaces qui suivent :
--   francais : "A vendre", "A vendre" avec A accentue, "Vente d'un",
--              "Vente d'une" (apostrophe droite ou typographique)
--   anglais  : "For sale"
--   allemand : "Zu verkaufen"
-- Exemples : "A Vendre : Villa..." -> "Villa..." ; "Vente d'un
-- appartement..." -> "Appartement..." ; "For sale, house..." -> "House...".
-- Puis remet une majuscule a la premiere lettre du titre restant.
-- Un titre qui serait vide apres retrait n'est pas modifie.
--
-- Rejouable : la sauvegarde n'est creee qu'a la premiere execution
-- (public.properties_sauvegarde_titres_20261006, copie complete de la
-- table AVANT toute modification, controlee) ; une seconde execution ne
-- trouve plus rien a modifier.
-- Les caracteres accentues, l'apostrophe typographique et les tirets sont
-- ecrits par leur code (chr) : ce fichier ne contient aucun tiret long ou
-- moyen.
--
-- Retour arriere : UPDATE public.properties p SET title_fr = s.title_fr,
-- title_en = s.title_en, title_de = s.title_de
-- FROM public.properties_sauvegarde_titres_20261006 s WHERE s.id = p.id;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

-- 1. Sauvegarde prealable (premiere execution seulement), controlee.
DO $$
DECLARE
  n_copie bigint;
  n_source bigint;
BEGIN
  IF to_regclass('public.properties_sauvegarde_titres_20261006') IS NULL THEN
    CREATE TABLE public.properties_sauvegarde_titres_20261006 AS TABLE public.properties;
    SELECT count(*) INTO n_copie FROM public.properties_sauvegarde_titres_20261006;
    SELECT count(*) INTO n_source FROM public.properties;
    IF n_copie <> n_source THEN
      RAISE EXCEPTION 'Sauvegarde incomplete : % lignes copiees sur %', n_copie, n_source;
    END IF;
    -- Table de sauvegarde : jamais lisible depuis le site.
    ALTER TABLE public.properties_sauvegarde_titres_20261006 ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.properties_sauvegarde_titres_20261006 FROM anon, authenticated;
  END IF;
END $$;

-- 2. Motif et calcul des nouveaux titres.
DROP TABLE IF EXISTS pg_temp.titres_resultat;
CREATE TEMP TABLE titres_resultat (
  slug text,
  colonne text,
  avant text,
  apres text
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  -- a ou a accentue (chr 224 / 192), apostrophes droite et typographique
  -- (chr 8217), tirets court, moyen (8211) et long (8212).
  a_vendre text := '[aA' || chr(224) || chr(192) || '][[:space:]]+vendre';
  vente_de text := 'vente[[:space:]]+d[''' || chr(8217) || '][[:space:]]*une?';
  for_sale text := 'for[[:space:]]+sale';
  zu_verkaufen text := 'zu[[:space:]]+verkaufen';
  ponctuation text := '[[:space:]' || chr(160) || ']*[:,;.!|/' || chr(8211) || chr(8212) || '-]*[[:space:]' || chr(160) || ']*';
  motif text;
  c text;
  r record;
  reste text;
BEGIN
  motif := '^[[:space:]' || chr(160) || ']*(' || a_vendre || '|' || vente_de || '|' || for_sale || '|' || zu_verkaufen || ')' || ponctuation;
  FOREACH c IN ARRAY ARRAY['title_fr', 'title_en', 'title_de'] LOOP
    FOR r IN EXECUTE format('SELECT id, slug, %1$I AS titre FROM public.properties WHERE %1$I ~* %2$L', c, motif) LOOP
      reste := regexp_replace(r.titre, motif, '', 'i');
      IF btrim(reste) <> '' THEN
        reste := upper(left(reste, 1)) || substr(reste, 2);
        EXECUTE format('UPDATE public.properties SET %I = $1 WHERE id = $2', c) USING reste, r.id;
        INSERT INTO titres_resultat VALUES (coalesce(r.slug, r.id::text), c, r.titre, reste);
      END IF;
    END LOOP;
  END LOOP;
END $$;

COMMIT;

-- 3. Tableau final (seul affiche) : titres avant et apres, par bien et par
--    langue. Vide a la seconde execution (rien a modifier).
SELECT slug::text AS bien,
       colonne::text,
       avant::text AS titre_avant,
       apres::text AS titre_apres
FROM titres_resultat
UNION ALL
SELECT 'aucun titre a modifier'::text, ''::text, ''::text, ''::text
WHERE NOT EXISTS (SELECT 1 FROM titres_resultat)
ORDER BY 1, 2;
