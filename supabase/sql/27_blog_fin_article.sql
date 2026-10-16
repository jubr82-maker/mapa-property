-- =====================================================================
-- 27 FIN D'ARTICLE STANDARD DU BLOG (structure et textes de depart)
-- MAPA Property, prepare le 2026-10-17. CREE une table et AJOUTE deux
-- colonnes a public.blog_posts ; ne modifie le texte d'aucun article.
--
-- 1. public.blog_standard_ending : UNE seule ligne (id = 1), modifiable dans
--    l'admin (Blog, Fin d'article standard). Par langue (FR, EN, DE) :
--    - heading_* : titre de la rubrique ("La position de Mapa Property") ;
--    - text_commune_* : texte de la rubrique pour un article rattache a une
--      commune ({commune} y est remplace par son nom, si on l'ecrit) ;
--    - text_general_* : texte sans commune (formulation generale) ;
--    - signature_* : "Julien Brebion, Real Estate Director, Mapa Property".
--    Textes de depart : ceux de l'article Steinfort en ligne le 2026-10-17,
--    repris a l'identique (text_commune) ; text_general en est la version
--    sans reference a "la commune" (premiere phrase et phrase acheteur).
--    Lecture publique, ecriture admin (is_mapa_admin).
-- 2. public.blog_posts.commune : commune de l'article (optionnelle).
-- 3. public.blog_posts.show_standard_ending : afficher la rubrique standard
--    (oui par defaut). Un article qui a deja sa propre rubrique du meme
--    titre ne recoit jamais la rubrique standard en double.
--
-- A EXECUTER AVANT le deploiement de l'etape 8 (le formulaire Blog
-- enregistre commune et show_standard_ending). Le 28 se lance APRES.
-- Rejouable : IF NOT EXISTS ; la ligne de depart n'est inseree qu'une fois
-- (une modification faite dans l'admin n'est jamais ecrasee).
-- Retour arriere : DROP TABLE public.blog_standard_ending;
--   ALTER TABLE public.blog_posts DROP COLUMN commune, DROP COLUMN show_standard_ending;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.blog_standard_ending (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  heading_fr text, heading_en text, heading_de text,
  text_commune_fr text, text_commune_en text, text_commune_de text,
  text_general_fr text, text_general_en text, text_general_de text,
  signature_fr text, signature_en text, signature_de text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_standard_ending ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blog_standard_ending_public_read" ON public.blog_standard_ending;
CREATE POLICY "blog_standard_ending_public_read" ON public.blog_standard_ending FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "blog_standard_ending_admin_all" ON public.blog_standard_ending;
CREATE POLICY "blog_standard_ending_admin_all" ON public.blog_standard_ending FOR ALL TO authenticated
  USING (public.is_mapa_admin()) WITH CHECK (public.is_mapa_admin());
REVOKE ALL ON public.blog_standard_ending FROM anon;
GRANT SELECT ON public.blog_standard_ending TO anon;
GRANT SELECT, INSERT, UPDATE ON public.blog_standard_ending TO authenticated;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS commune text,
  ADD COLUMN IF NOT EXISTS show_standard_ending boolean NOT NULL DEFAULT true;

INSERT INTO public.blog_standard_ending (id, heading_fr, heading_en, heading_de, text_commune_fr, text_commune_en, text_commune_de, text_general_fr, text_general_en, text_general_de, signature_fr, signature_en, signature_de)
VALUES (1,
  'La position de Mapa Property', 'Mapa Property''s position', 'Die Position von Mapa Property',
  '<p>Nous sommes spécialisés dans cette région et nous connaissons la commune rue par rue : les lotissements, les projets en cours et l''évolution des prix.</p>
<p><strong>Vous vendez votre maison ?</strong> La demande est là, mais les acheteurs comparent. Un prix fixé sur des annonces plutôt que sur des ventes signées fait perdre des semaines, et souvent de l''argent à la fin. Pour estimer votre bien, nous croisons plusieurs méthodes d''estimation professionnelles. Lorsque nous disposons de ventes récentes que nous avons réalisées pour des biens comparables, ces prix réels sont utilisés en priorité dans la pondération, avec les autres modèles. Lorsque ce n''est pas le cas, les autres méthodes prennent le relais, toujours croisées entre elles, pour arriver à la valeur la plus juste. Nous présentons ensuite votre bien en priorité aux acquéreurs que nous accompagnons déjà, parfois sans aucune publicité. <a href="/fr/services/estimer" rel="noopener noreferrer">Demandez une estimation</a>.</p>
<p><strong>Vous cherchez une maison ?</strong> Une partie des biens de la commune se vend sans passer par les portails. Avec un mandat de recherche, nous suivons le marché pour vous, y compris les maisons qui ne sont jamais publiées, et nous ne vous faisons visiter que ce qui correspond vraiment à votre projet.</p>',
  '<p>We specialise in this region and know the commune street by street: the residential developments, the projects under way and how prices are moving.</p>
<p><strong>Selling your house?</strong> Demand is there, but buyers compare. A price set on listings rather than on signed sales costs weeks, and often money in the end. To value your property, we cross-check several professional valuation methods. When we have recent sales of our own for comparable properties, those real prices are given priority in the weighting, alongside the other models. When we do not, the other methods take over, always cross-checked against each other, to reach the most accurate value. We then present your property first to the buyers we already work with, sometimes without any advertising. <a href="/en/services/estimer" rel="noopener noreferrer">Request a valuation</a>.</p>
<p><strong>Looking for a house?</strong> Some properties in the commune sell without ever appearing on the portals. With a search mandate, we follow the market for you, including houses that are never advertised, and we only show you what genuinely fits your project.</p>',
  '<p>Wir sind auf diese Region spezialisiert und kennen die Gemeinde Straße für Straße: die Wohnsiedlungen, die laufenden Projekte und die Preisentwicklung.</p>
<p><strong>Sie verkaufen Ihr Haus?</strong> Die Nachfrage ist da, aber Käufer vergleichen. Ein Preis, der sich an Inseraten statt an unterzeichneten Verkäufen orientiert, kostet Wochen und am Ende oft Geld. Für die Bewertung Ihrer Immobilie kombinieren wir mehrere professionelle Bewertungsmethoden. Wenn uns aktuelle eigene Verkäufe vergleichbarer Immobilien vorliegen, fließen diese realen Preise vorrangig in die Gewichtung ein, zusammen mit den anderen Modellen. Ist das nicht der Fall, übernehmen die anderen Methoden, stets miteinander abgeglichen, um den genauesten Wert zu ermitteln. Anschließend stellen wir Ihre Immobilie zuerst den Käufern vor, die wir bereits begleiten, manchmal ganz ohne Werbung. <a href="/de/services/estimer" rel="noopener noreferrer">Bewertung anfragen</a>.</p>
<p><strong>Sie suchen ein Haus?</strong> Ein Teil der Immobilien in der Gemeinde wird verkauft, ohne je auf den Portalen zu erscheinen. Mit einem Suchauftrag verfolgen wir den Markt für Sie, auch Häuser, die nie inseriert werden, und zeigen Ihnen nur, was wirklich zu Ihrem Vorhaben passt.</p>',
  '<p>Nous connaissons le marché luxembourgeois commune par commune : les lotissements, les projets en cours et l''évolution des prix.</p>
<p><strong>Vous vendez votre maison ?</strong> La demande est là, mais les acheteurs comparent. Un prix fixé sur des annonces plutôt que sur des ventes signées fait perdre des semaines, et souvent de l''argent à la fin. Pour estimer votre bien, nous croisons plusieurs méthodes d''estimation professionnelles. Lorsque nous disposons de ventes récentes que nous avons réalisées pour des biens comparables, ces prix réels sont utilisés en priorité dans la pondération, avec les autres modèles. Lorsque ce n''est pas le cas, les autres méthodes prennent le relais, toujours croisées entre elles, pour arriver à la valeur la plus juste. Nous présentons ensuite votre bien en priorité aux acquéreurs que nous accompagnons déjà, parfois sans aucune publicité. <a href="/fr/services/estimer" rel="noopener noreferrer">Demandez une estimation</a>.</p>
<p><strong>Vous cherchez une maison ?</strong> Une partie des biens se vend sans passer par les portails. Avec un mandat de recherche, nous suivons le marché pour vous, y compris les maisons qui ne sont jamais publiées, et nous ne vous faisons visiter que ce qui correspond vraiment à votre projet.</p>',
  '<p>We know the Luxembourg market commune by commune: the residential developments, the projects under way and how prices are moving.</p>
<p><strong>Selling your house?</strong> Demand is there, but buyers compare. A price set on listings rather than on signed sales costs weeks, and often money in the end. To value your property, we cross-check several professional valuation methods. When we have recent sales of our own for comparable properties, those real prices are given priority in the weighting, alongside the other models. When we do not, the other methods take over, always cross-checked against each other, to reach the most accurate value. We then present your property first to the buyers we already work with, sometimes without any advertising. <a href="/en/services/estimer" rel="noopener noreferrer">Request a valuation</a>.</p>
<p><strong>Looking for a house?</strong> Some properties sell without ever appearing on the portals. With a search mandate, we follow the market for you, including houses that are never advertised, and we only show you what genuinely fits your project.</p>',
  '<p>Wir kennen den luxemburgischen Markt Gemeinde für Gemeinde: die Wohnsiedlungen, die laufenden Projekte und die Preisentwicklung.</p>
<p><strong>Sie verkaufen Ihr Haus?</strong> Die Nachfrage ist da, aber Käufer vergleichen. Ein Preis, der sich an Inseraten statt an unterzeichneten Verkäufen orientiert, kostet Wochen und am Ende oft Geld. Für die Bewertung Ihrer Immobilie kombinieren wir mehrere professionelle Bewertungsmethoden. Wenn uns aktuelle eigene Verkäufe vergleichbarer Immobilien vorliegen, fließen diese realen Preise vorrangig in die Gewichtung ein, zusammen mit den anderen Modellen. Ist das nicht der Fall, übernehmen die anderen Methoden, stets miteinander abgeglichen, um den genauesten Wert zu ermitteln. Anschließend stellen wir Ihre Immobilie zuerst den Käufern vor, die wir bereits begleiten, manchmal ganz ohne Werbung. <a href="/de/services/estimer" rel="noopener noreferrer">Bewertung anfragen</a>.</p>
<p><strong>Sie suchen ein Haus?</strong> Ein Teil der Immobilien wird verkauft, ohne je auf den Portalen zu erscheinen. Mit einem Suchauftrag verfolgen wir den Markt für Sie, auch Häuser, die nie inseriert werden, und zeigen Ihnen nur, was wirklich zu Ihrem Vorhaben passt.</p>',
  'Julien Brebion, Real Estate Director, Mapa Property', 'Julien Brebion, Real Estate Director, Mapa Property', 'Julien Brebion, Real Estate Director, Mapa Property')
ON CONFLICT (id) DO NOTHING;

COMMIT;

SELECT 'table blog_standard_ending (attendu 1 ligne)' AS controle, (SELECT count(*)::text FROM public.blog_standard_ending) AS etat
UNION ALL
SELECT 'regles d''acces (attendu 2)', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blog_standard_ending')
UNION ALL
SELECT 'colonnes blog_posts commune et show_standard_ending (attendu 2)', (SELECT count(*)::text FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name IN ('commune', 'show_standard_ending'))
UNION ALL
SELECT 'titre FR', heading_fr FROM public.blog_standard_ending WHERE id = 1;
