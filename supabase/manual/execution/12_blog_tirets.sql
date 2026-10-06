-- =====================================================================
-- 12 BLOG : TIRETS LONGS ET MOYENS ENTOURES D'ESPACES -> VIRGULE
-- MAPA Property, prepare le 2026-10-06. MODIFIE public.blog_posts.
--
-- Rejouable : la sauvegarde n'est creee qu'a la premiere execution
-- (public.blog_posts_sauvegarde_tirets_20261006, copie complete de la
-- table AVANT toute modification) ; une seconde execution ne trouve plus
-- rien a remplacer et ne touche aucune ligne.
--
-- Champs traites : TOUTES les colonnes texte de blog_posts (text,
-- character varying, json, jsonb), lues dans information_schema.
-- Remplacement : un tiret long (U+2014) ou moyen (U+2013), ou son entite
-- HTML (&mdash; &ndash; &#8212; &#8211; &#x2014; &#x2013;), precede ET
-- suivi d'au moins un espace (espace, espace insecable ou &nbsp;), devient
-- ", ". Un tiret non entoure d'espaces (debut de ligne, mot compose,
-- intervalle "2020-2024") n'est pas touche : il apparait dans le tableau
-- final pour correction a la main dans l'admin.
-- Les caracteres sont ecrits par leur code (chr) : ce fichier n'en
-- contient aucun.
--
-- Retour arriere : UPDATE public.blog_posts p SET <colonnes> = s.<colonnes>
-- FROM public.blog_posts_sauvegarde_tirets_20261006 s WHERE s.id = p.id;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

-- 1. Sauvegarde prealable (premiere execution seulement), controlee.
DO $$
DECLARE
  n_copie bigint;
  n_source bigint;
BEGIN
  IF to_regclass('public.blog_posts_sauvegarde_tirets_20261006') IS NULL THEN
    CREATE TABLE public.blog_posts_sauvegarde_tirets_20261006 AS TABLE public.blog_posts;
    SELECT count(*) INTO n_copie FROM public.blog_posts_sauvegarde_tirets_20261006;
    SELECT count(*) INTO n_source FROM public.blog_posts;
    IF n_copie <> n_source THEN
      RAISE EXCEPTION 'Sauvegarde incomplete : % lignes copiees sur %', n_copie, n_source;
    END IF;
    -- Table de sauvegarde : jamais lisible depuis le site.
    ALTER TABLE public.blog_posts_sauvegarde_tirets_20261006 ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.blog_posts_sauvegarde_tirets_20261006 FROM anon, authenticated;
  END IF;
END $$;

-- 2. Remplacement dans toutes les colonnes texte.
DROP TABLE IF EXISTS pg_temp.tirets_resultat;
CREATE TEMP TABLE tirets_resultat (
  colonne text,
  lignes_modifiees bigint,
  restants_long bigint,
  restants_moyen bigint
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  c record;
  n bigint;
  espace text := '(\s|' || chr(160) || '|&nbsp;|&#160;)+';
  tiret text := '(' || chr(8212) || '|' || chr(8211) || '|&mdash;|&ndash;|&#8212;|&#8211;|&#x2014;|&#x2013;)';
  motif text;
  long_re text := '(' || chr(8212) || '|&mdash;|&#8212;|&#x2014;)';
  moyen_re text := '(' || chr(8211) || '|&ndash;|&#8211;|&#x2013;)';
  n_long bigint;
  n_moyen bigint;
BEGIN
  motif := espace || tiret || espace;
  FOR c IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts'
      AND data_type IN ('text', 'character varying', 'json', 'jsonb')
    ORDER BY ordinal_position
  LOOP
    IF c.data_type IN ('json', 'jsonb') THEN
      EXECUTE format(
        'UPDATE public.blog_posts SET %1$I = regexp_replace(%1$I::text, %2$L, %3$L, ''g'')::%4$s WHERE %1$I::text ~ %2$L',
        c.column_name, motif, ', ', c.data_type);
    ELSE
      EXECUTE format(
        'UPDATE public.blog_posts SET %1$I = regexp_replace(%1$I, %2$L, %3$L, ''g'') WHERE %1$I ~ %2$L',
        c.column_name, motif, ', ');
    END IF;
    GET DIAGNOSTICS n = ROW_COUNT;
    EXECUTE format('SELECT count(*) FROM public.blog_posts WHERE %1$I::text ~ %2$L', c.column_name, long_re) INTO n_long;
    EXECUTE format('SELECT count(*) FROM public.blog_posts WHERE %1$I::text ~ %2$L', c.column_name, moyen_re) INTO n_moyen;
    INSERT INTO tirets_resultat VALUES (c.column_name, n, n_long, n_moyen);
  END LOOP;
END $$;

COMMIT;

-- 3. Tableau final (seul affiche) : par colonne, lignes modifiees par
--    cette execution et lignes contenant encore un tiret long ou moyen
--    (non entoure d'espaces, a corriger a la main dans l'admin).
SELECT colonne::text,
       lignes_modifiees::text AS lignes_modifiees,
       restants_long::text AS lignes_avec_tiret_long_restant,
       restants_moyen::text AS lignes_avec_tiret_moyen_restant
FROM tirets_resultat
ORDER BY colonne;
