-- =====================================================================
-- 24b QUESTIONS FREQUENTES : ARTICLE STEINFORT
-- MAPA Property, prepare le 2026-10-16. A executer APRES 23_faq.sql, AU
-- MOMENT DU DEPLOIEMENT (pas avant) : le site actuellement en ligne ne lit
-- pas la table faqs, l'article perdrait sinon ses questions en ligne.
--
-- Les 4 questions de la section "Questions frequentes" de l'article sont
-- extraites du HTML (FR, EN, DE), inserees pour page_key
-- 'blog:immobilier-steinfort', puis la section est retiree du HTML des
-- trois langues (pas de doublon). Questions et reponses en texte simple
-- (balises retirees, mots inchanges).
-- Garde-fous : un seul article, exactement 4 questions dans chaque langue,
-- la fin d'article (citation, signature, "Sources") jamais prise dans une
-- reponse. Sinon : ARRET avec la cause, RIEN n'est modifie (transaction
-- annulee).
--
-- Rejouable : l'article n'est traite que si sa page n'a encore aucune
-- question.
-- Retour arriere : DELETE FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort';
-- (le HTML de l'article se restaure depuis la sauvegarde faite avant).
--
-- APERCU FACULTATIF, a lancer SEUL avant ce fichier (lecture seule) :
--   SELECT slug,
--          substring(content_fr from '(?i)(<h[23][^>]*>[^<]*(questions fr[eé]quentes|faq)[\s\S]*)') AS fr
--   FROM public.blog_posts WHERE lower(slug) = 'immobilier-steinfort';
--
-- Necessite PostgreSQL 15 ou plus (regexp_instr), cas de Supabase.
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Article Steinfort : extraction, insertion, retrait de la section.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.faq_texte(h text) RETURNS text
LANGUAGE sql IMMUTABLE AS $f$
  SELECT btrim(regexp_replace(
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
      regexp_replace(regexp_replace(h, '<br\s*/?>', ' ', 'gi'), '<[^>]+>', '', 'g'),
      '&nbsp;', ' '), '&#160;', ' '), '&amp;', '&'), '&#39;', ''''), '&apos;', ''''), '&rsquo;', '’'),
      '&quot;', '"'), '&laquo;', '«'), '&raquo;', '»'), '&lt;', '<'), '&gt;', '>'),
    '[ \t\r\n]+', ' ', 'g'))
$f$;

DO $steinfort$
DECLARE
  -- Meme type que la colonne id de blog_posts (un entier, pas un uuid :
  -- premiere execution du 2026-10-16 en echec sur "6", rien modifie).
  v_id public.blog_posts.id%TYPE;
  v_n integer;
  l text;
  html text;
  head_re constant text := '<h([23])[^>]*>[[:space:]]*(questions[[:space:]]+fr(e|é|&eacute;)quentes|frequently[[:space:]]+asked[[:space:]]+questions|h(ä|a|&auml;)ufig[[:space:]]+gestellte[[:space:]]+fragen|h(ä|a|&auml;)ufige[[:space:]]+fragen|faq)[[:space:]]*:?[[:space:]]*</h\1>';
  h_start integer;
  h_end integer;
  pos integer;
  qs integer;
  qe integer;
  qtxt text;
  ans text;
  para text;
  pe integer;
  rest text;
  removed_end integer;
  qa jsonb;
  all_qa jsonb := '{}'::jsonb;
  i integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.blog_posts WHERE lower(slug) = 'immobilier-steinfort';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Steinfort : % article(s) trouve(s) pour l''adresse immobilier-steinfort (attendu 1). Rien n''a ete modifie.', v_n;
  END IF;
  IF EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort') THEN
    RAISE NOTICE 'Steinfort : questions deja presentes, article non retraite.';
    RETURN;
  END IF;
  SELECT id INTO v_id FROM public.blog_posts WHERE lower(slug) = 'immobilier-steinfort';

  FOREACH l IN ARRAY ARRAY['fr', 'en', 'de'] LOOP
    EXECUTE format('SELECT %I FROM public.blog_posts WHERE id = $1', 'content_' || l) INTO html USING v_id;
    IF html IS NULL THEN
      RAISE EXCEPTION 'Steinfort %, texte vide. Rien n''a ete modifie.', l;
    END IF;
    h_start := regexp_instr(html, head_re, 1, 1, 0, 'i');
    IF h_start = 0 THEN
      RAISE EXCEPTION 'Steinfort %, titre de la section "Questions frequentes" introuvable. Rien n''a ete modifie.', l;
    END IF;
    h_end := regexp_instr(html, head_re, 1, 1, 1, 'i');
    pos := h_end;
    removed_end := h_end;
    qa := '[]'::jsonb;
    LOOP
      rest := substr(html, pos);
      -- Question suivante : un <h3> avant tout autre titre <h1>/<h2>.
      qs := regexp_instr(rest, '<h3[[:space:]>]', 1, 1, 0, 'i');
      EXIT WHEN qs = 0;
      IF regexp_instr(substr(rest, 1, qs - 1), '<h[12][[:space:]>]', 1, 1, 0, 'i') > 0 THEN EXIT; END IF;
      -- Rien d'autre que des blancs entre deux questions.
      IF btrim(substr(rest, 1, qs - 1), E' \t\r\n') <> '' THEN EXIT; END IF;
      qe := strpos(lower(rest), '</h3>');
      EXIT WHEN qe = 0 OR qe < qs;
      qtxt := pg_temp.faq_texte(substr(rest, qs, qe - qs));
      pos := pos + qe - 1 + length('</h3>');
      ans := '';
      -- Reponse : paragraphes <p> qui suivent, hors fin d'article.
      LOOP
        rest := substr(html, pos);
        EXIT WHEN rest !~* '^[[:space:]]*<p[[:space:]>]';
        pe := strpos(lower(rest), '</p>');
        EXIT WHEN pe = 0;
        para := pg_temp.faq_texte(substr(rest, 1, pe - 1));
        EXIT WHEN para ~* '^(sources?|quellen)[[:space:]]*:' OR para ~* 'real estate director';
        IF para <> '' THEN
          ans := CASE WHEN ans = '' THEN para ELSE ans || E'\n\n' || para END;
        END IF;
        pos := pos + pe - 1 + length('</p>');
      END LOOP;
      IF qtxt = '' OR ans = '' THEN
        RAISE EXCEPTION 'Steinfort %, question % sans texte ou sans reponse. Rien n''a ete modifie.', l, jsonb_array_length(qa) + 1;
      END IF;
      qa := qa || jsonb_build_array(jsonb_build_object('q', qtxt, 'a', ans));
      removed_end := pos;
    END LOOP;
    IF jsonb_array_length(qa) <> 4 THEN
      RAISE EXCEPTION 'Steinfort %, % question(s) trouvee(s) (attendu 4). Rien n''a ete modifie.', l, jsonb_array_length(qa);
    END IF;
    all_qa := all_qa || jsonb_build_object(l, qa);
    -- Retrait de la section : du titre a la fin de la derniere reponse.
    EXECUTE format('UPDATE public.blog_posts SET %I = $1 WHERE id = $2', 'content_' || l)
      USING substr(html, 1, h_start - 1) || substr(html, removed_end), v_id;
  END LOOP;

  FOR i IN 0..3 LOOP
    INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
    VALUES ('blog:immobilier-steinfort',
            all_qa->'fr'->i->>'q', all_qa->'fr'->i->>'a',
            all_qa->'en'->i->>'q', all_qa->'en'->i->>'a',
            all_qa->'de'->i->>'q', all_qa->'de'->i->>'a',
            i + 1, true);
  END LOOP;
END
$steinfort$;


COMMIT;

-- Controle : les questions de Steinfort, puis la section retiree.
SELECT 'steinfort ' || position || ' FR' AS controle, left(question_fr, 120) AS etat FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort'
UNION ALL
SELECT 'steinfort ' || position || ' EN', left(question_en, 120) FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort'
UNION ALL
SELECT 'steinfort ' || position || ' DE', left(question_de, 120) FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort'
UNION ALL
SELECT 'section FAQ restante dans l''article (attendu 0)',
       (SELECT count(*)::text FROM public.blog_posts
        WHERE lower(slug) = 'immobilier-steinfort'
          AND (content_fr ~* 'questions[[:space:]]+fr(e|é)quentes</h' OR content_en ~* 'frequently[[:space:]]+asked[[:space:]]+questions</h' OR content_de ~* 'h(ä|a)ufig(e|[[:space:]]+gestellte)[[:space:]]+fragen</h'));
