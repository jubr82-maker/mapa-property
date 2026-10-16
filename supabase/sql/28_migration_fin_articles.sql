-- =====================================================================
-- 28 FIN D'ARTICLE STANDARD : MIGRATION DES 4 ARTICLES PUBLIES
-- MAPA Property, prepare le 2026-10-17. A executer APRES 27 ET APRES LE
-- DEPLOIEMENT de l'etape 8 (sinon l'article Steinfort perdrait en ligne sa
-- rubrique et les 4 articles leur signature, jusqu'au deploiement).
--
-- Choix de Julien (2026-10-17) :
-- - Steinfort : sa rubrique "La position de Mapa Property" est la fin
--   standard (texte identique, verifie) : retiree du texte, commune
--   "Steinfort" ; la fin standard s'affiche a la meme place, a l'identique.
-- - Vendre au Luxembourg, Off Market, Vivre au Luxembourg : leur rubrique
--   propre est GARDEE telle quelle ; la fin standard ne s'y affiche pas
--   (show_standard_ending = false).
-- - Signature : les 4 signatures ecrites a la main sont retirees ; la
--   signature standard ("Julien Brebion, Real Estate Director, Mapa
--   Property", avec une virgule) s'affiche a la meme place. Seul changement
--   visible : le tiret long des 3 autres signatures devient une virgule.
-- - Citation de conclusion et sources : jamais touchees.
--
-- 1. Sauvegarde : copie du texte actuel des 4 articles (FR, EN, DE) dans
--    public.blog_posts_avant_28 (validee a part, conservee meme si la suite
--    s'arrete ; jamais ecrasee par une nouvelle execution).
-- 2. Migration : chaque retrait est verifie avant d'etre fait (texte
--    attendu present exactement une fois, rubrique de Steinfort identique a
--    la fin standard du 27). Au moindre ecart : ARRET avec la cause, RIEN
--    n'est modifie.
-- 3. Controle : avant et apres pour chaque article et chaque langue.
--
-- Rejouable : un article deja migre est laisse tel quel.
-- Retour arriere : UPDATE public.blog_posts b SET content_fr = s.content_fr,
--   content_en = s.content_en, content_de = s.content_de
--   FROM public.blog_posts_avant_28 s WHERE b.id = s.id;
-- Necessite PostgreSQL 15 ou plus (regexp_instr), cas de Supabase.
-- Mode d'emploi : coller le fichier ENTIER, Run.
-- =====================================================================

-- 1. Sauvegarde.
BEGIN;
CREATE TABLE IF NOT EXISTS public.blog_posts_avant_28 AS
  SELECT id, slug, content_fr, content_en, content_de, now() AS copie_le
  FROM public.blog_posts
  WHERE lower(slug) IN ('immobilier-steinfort', 'vendre-luxembourg-2026-prix-estimation',
                        'off-market-luxembourg-fin-modele-informel', 'vivre-au-luxembourg-choix-rationnel-europe');
ALTER TABLE public.blog_posts_avant_28 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_posts_avant_28 FROM anon, authenticated;
COMMIT;

-- 2. Migration.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.norm(x text) RETURNS text LANGUAGE sql IMMUTABLE AS
$f$ SELECT btrim(regexp_replace(regexp_replace(coalesce(x, ''), '>\s+<', '><', 'g'), '\s+', ' ', 'g')) $f$;

DO $fin$
DECLARE
  v_n integer;
  r record;
  l text;
  html text;
  sig text;
  head text;
  h_start integer;
  c_start integer;
  expected text;
  sig_std constant text := '<p><em>Julien Brebion, Real Estate Director, Mapa Property</em></p>';
  -- Signature actuelle des 3 autres articles, avec son tiret long (texte a
  -- retrouver tel quel pour le retirer ; il ne sera plus affiche).
  sig_dash constant text := '<p><em>Julien Brebion — Real Estate Director, Mapa Property</em></p>';
BEGIN
  SELECT count(*) INTO v_n FROM public.blog_standard_ending WHERE id = 1;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Fin standard absente : executer d''abord 27_blog_fin_article.sql. Rien n''a ete modifie.';
  END IF;
  SELECT count(*) INTO v_n FROM public.blog_posts
  WHERE lower(slug) IN ('immobilier-steinfort', 'vendre-luxembourg-2026-prix-estimation',
                        'off-market-luxembourg-fin-modele-informel', 'vivre-au-luxembourg-choix-rationnel-europe');
  IF v_n <> 4 THEN
    RAISE EXCEPTION '% article(s) trouve(s) sur 4 attendus. Rien n''a ete modifie.', v_n;
  END IF;

  FOR r IN SELECT id, lower(slug) AS slug FROM public.blog_posts
           WHERE lower(slug) IN ('immobilier-steinfort', 'vendre-luxembourg-2026-prix-estimation',
                                 'off-market-luxembourg-fin-modele-informel', 'vivre-au-luxembourg-choix-rationnel-europe')
  LOOP
    sig := CASE WHEN r.slug = 'immobilier-steinfort' THEN sig_std ELSE sig_dash END;
    FOREACH l IN ARRAY ARRAY['fr', 'en', 'de'] LOOP
      EXECUTE format('SELECT %I FROM public.blog_posts WHERE id = $1', 'content_' || l) INTO html USING r.id;
      -- Deja migre (signature ecrite a la main absente) : laisse tel quel.
      v_n := (length(html) - length(replace(html, sig, ''))) / length(sig);
      IF v_n = 0 AND position('Julien Brebion' IN html) = 0 THEN
        RAISE NOTICE '% %, deja migre, laisse tel quel.', r.slug, l;
        CONTINUE;
      END IF;
      IF v_n <> 1 THEN
        RAISE EXCEPTION '% %, signature ecrite a la main trouvee % fois (attendu 1). Rien n''a ete modifie.', r.slug, l, v_n;
      END IF;
      html := replace(replace(replace(html, E'\r\n' || sig, ''), E'\n' || sig, ''), sig, '');

      IF r.slug = 'immobilier-steinfort' THEN
        EXECUTE format('SELECT %I FROM public.blog_standard_ending WHERE id = 1', 'heading_' || l) INTO head;
        h_start := position('<h2>' || head || '</h2>' IN html);
        c_start := regexp_instr(html, '<h2>(Conclusion|Fazit)</h2>', 1, 1, 0, 'i');
        IF h_start = 0 OR c_start = 0 OR c_start < h_start THEN
          RAISE EXCEPTION 'Steinfort %, rubrique "%" ou conclusion introuvable. Rien n''a ete modifie.', l, head;
        END IF;
        EXECUTE format('SELECT %I FROM public.blog_standard_ending WHERE id = 1', 'text_commune_' || l) INTO expected;
        IF pg_temp.norm(substr(html, h_start, c_start - h_start)) <> pg_temp.norm('<h2>' || head || '</h2>' || expected) THEN
          RAISE EXCEPTION 'Steinfort %, la rubrique ne correspond pas exactement a la fin standard. Rien n''a ete modifie.', l;
        END IF;
        html := substr(html, 1, h_start - 1) || substr(html, c_start);
      END IF;

      EXECUTE format('UPDATE public.blog_posts SET %I = $1 WHERE id = $2', 'content_' || l) USING html, r.id;
    END LOOP;

    IF r.slug = 'immobilier-steinfort' THEN
      UPDATE public.blog_posts SET commune = 'Steinfort', show_standard_ending = true WHERE id = r.id;
    ELSE
      UPDATE public.blog_posts SET show_standard_ending = false WHERE id = r.id;
    END IF;
  END LOOP;
END
$fin$;

COMMIT;

-- 3. Avant et apres, par article et par langue.
SELECT b.slug AS article, x.langue,
       length(x.avant) AS longueur_avant, length(x.apres) AS longueur_apres,
       (x.avant LIKE '%<p><em>Julien Brebion%') AS signature_main_avant,
       (x.apres LIKE '%<p><em>Julien Brebion%') AS signature_main_apres,
       (x.avant ~ '<h2>(La position de Mapa Property|Mapa Property''s position|Die Position von Mapa Property)</h2>') AS rubrique_dans_texte_avant,
       (x.apres ~ '<h2>(La position de Mapa Property|Mapa Property''s position|Die Position von Mapa Property)</h2>') AS rubrique_dans_texte_apres,
       b.commune, b.show_standard_ending AS fin_standard_affichee,
       right(regexp_replace(x.avant, '\s+', ' ', 'g'), 260) AS fin_du_texte_avant,
       right(regexp_replace(x.apres, '\s+', ' ', 'g'), 260) AS fin_du_texte_apres
FROM public.blog_posts b
JOIN public.blog_posts_avant_28 s ON s.id = b.id
CROSS JOIN LATERAL (VALUES ('fr', s.content_fr, b.content_fr), ('en', s.content_en, b.content_en), ('de', s.content_de, b.content_de)) AS x(langue, avant, apres)
ORDER BY b.slug, x.langue;
