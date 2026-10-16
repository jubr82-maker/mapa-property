-- =====================================================================
-- 26 ADRESSE DE L'ARTICLE STEINFORT EN MINUSCULES
-- MAPA Property, prepare le 2026-10-17. Modifie UNE valeur : la colonne
-- slug de l'article Steinfort ("Immobilier-Steinfort" devient
-- "immobilier-steinfort"). Aucune autre colonne, aucun autre article.
--
-- A EXECUTER APRES la mise en ligne du code de l'etape 4. Ce code trouve
-- un article sans tenir compte des majuscules et redirige en 301 toute
-- adresse /fr|en|de/blog/<Majuscules> vers sa forme en minuscules : avant
-- comme apres ce fichier, /blog/immobilier-steinfort fonctionne. Execute
-- AVANT, l'ancien code en ligne (recherche exacte) ne trouverait plus
-- l'article sous /blog/Immobilier-Steinfort.
--
-- Questions de l'article : page_key "blog:immobilier-steinfort", deja en
-- minuscules (SQL 24b) ; recalee par securite si une variante existait.
-- La copie blog_posts_steinfort_avant_24b n'est pas touchee.
--
-- Garde-fous : un seul article Steinfort ; aucun autre article ne porte
-- deja l'adresse "immobilier-steinfort". Sinon ARRET, rien n'est modifie.
-- Rejouable : sans effet si l'adresse est deja en minuscules.
-- Retour arriere : UPDATE public.blog_posts SET slug = 'Immobilier-Steinfort'
--   WHERE slug = 'immobilier-steinfort';
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

DO $slug$
DECLARE
  v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.blog_posts WHERE lower(slug) = 'immobilier-steinfort';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Steinfort : % article(s) pour l''adresse immobilier-steinfort, toutes casses confondues (attendu 1). Rien n''a ete modifie.', v_n;
  END IF;
END
$slug$;

UPDATE public.blog_posts
SET slug = 'immobilier-steinfort'
WHERE lower(slug) = 'immobilier-steinfort' AND slug <> 'immobilier-steinfort';

UPDATE public.faqs
SET page_key = 'blog:immobilier-steinfort', updated_at = now()
WHERE lower(page_key) = 'blog:immobilier-steinfort' AND page_key <> 'blog:immobilier-steinfort';

COMMIT;

-- Controle : adresse de l'article (attendu immobilier-steinfort), questions
-- rattachees (attendu 4), puis tout autre article dont l'adresse contient
-- encore des majuscules ou des accents (attendu : aucune ligne "a corriger").
SELECT 'adresse Steinfort' AS controle, slug AS etat FROM public.blog_posts WHERE lower(slug) = 'immobilier-steinfort'
UNION ALL
SELECT 'questions Steinfort (attendu 4)', count(*)::text FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort'
UNION ALL
SELECT 'a corriger : ' || slug, 'adresse avec majuscules ou accents' FROM public.blog_posts
WHERE slug IS NOT NULL AND slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$';
