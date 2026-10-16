-- =====================================================================
-- 25 TITRES ET DESCRIPTIONS GOOGLE DU BLOG, PAR LANGUE
-- MAPA Property, prepare le 2026-10-16. AJOUTE six colonnes a
-- public.blog_posts et remplit quatre articles ; ne modifie aucune autre
-- colonne ni aucun autre article.
--
-- seo_title_fr / _en / _de : "Titre Google" de chaque langue (60
--   caracteres conseilles).
-- seo_description_fr / _en / _de : "Description Google" de chaque langue
--   (155 caracteres conseilles).
-- Le site utilise ces champs pour title, meta description, og:title,
-- og:description, twitter:title et twitter:description. Vides : titre et
-- resume de l'article dans la MEME langue, jamais le francais pour EN et
-- DE, jamais de "..." ajoute.
-- Les anciennes colonnes meta_title et meta_description (une seule langue)
-- ne sont plus lues par le site ; elles restent en place, inchangees.
--
-- Valeurs : fournies par Julien le 2026-10-16, reprises a l'identique.
-- Steinfort : article trouve par son adresse en minuscules, avant comme
-- apres le passage de "Immobilier-Steinfort" a "immobilier-steinfort"
-- (etape 4).
--
-- A EXECUTER AVANT le deploiement du code de l'etape 3 : le formulaire Blog
-- de l'admin enregistre ces colonnes ; sans elles, l'enregistrement d'un
-- article serait refuse.
-- Rejouable : ADD COLUMN IF NOT EXISTS ; les UPDATE reecrivent les memes
-- valeurs.
-- Retour arriere : ALTER TABLE public.blog_posts DROP COLUMN seo_title_fr,
--   DROP COLUMN seo_title_en, DROP COLUMN seo_title_de,
--   DROP COLUMN seo_description_fr, DROP COLUMN seo_description_en,
--   DROP COLUMN seo_description_de;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS seo_title_fr text,
  ADD COLUMN IF NOT EXISTS seo_title_en text,
  ADD COLUMN IF NOT EXISTS seo_title_de text,
  ADD COLUMN IF NOT EXISTS seo_description_fr text,
  ADD COLUMN IF NOT EXISTS seo_description_en text,
  ADD COLUMN IF NOT EXISTS seo_description_de text;

UPDATE public.blog_posts SET
  seo_title_fr = 'Vendre au Luxembourg en 2026 : prix, estimation, erreurs',
  seo_description_fr = 'Vendre un bien au Luxembourg en 2026 : prix réels ou affichés, estimation, normes EVS, performance énergétique et erreurs qui coûtent cher.',
  seo_title_en = 'Selling in Luxembourg in 2026: prices, valuation, mistakes',
  seo_description_en = 'Selling a property in Luxembourg in 2026: real versus asking prices, valuation, EVS standards, energy performance and the mistakes that cost sellers money.',
  seo_title_de = 'Verkaufen in Luxemburg 2026: Preise, Bewertung, Fehler',
  seo_description_de = 'Immobilie in Luxemburg 2026 verkaufen: reale und angebotene Preise, Bewertung, EVS-Standards, Energieeffizienz und Fehler, die Verkäufer Geld kosten.'
WHERE lower(slug) = 'vendre-luxembourg-2026-prix-estimation';

UPDATE public.blog_posts SET
  seo_title_fr = 'Off Market au Luxembourg 2026 : la fin du modèle informel',
  seo_description_fr = 'L''off-market reste le canal privilégié des biens de prestige au Luxembourg, mais il doit se professionnaliser : dérives, risques et nouveaux standards.',
  seo_title_en = 'Off-market in Luxembourg 2026: the end of the informal model',
  seo_description_en = 'Off-market remains the preferred channel for prestige property in Luxembourg, but it must become more professional: pitfalls, risks and new standards.',
  seo_title_de = 'Off-Market in Luxemburg 2026: das Ende des informellen Modells',
  seo_description_de = 'Off-Market bleibt in Luxemburg der bevorzugte Kanal für Prestigeimmobilien, muss aber professioneller werden: Fehlentwicklungen, Risiken, neue Standards.'
WHERE lower(slug) = 'off-market-luxembourg-fin-modele-informel';

UPDATE public.blog_posts SET
  seo_title_fr = 'Vivre au Luxembourg en 2026 : le guide pour les familles',
  seo_description_fr = 'Qualité de vie, communes résidentielles, écoles internationales, mobilité et logement : pourquoi le Luxembourg reste un choix rationnel pour les familles.',
  seo_title_en = 'Living in Luxembourg in 2026: a complete guide for families',
  seo_description_en = 'Quality of life, residential communes, international schools, mobility and housing: why Luxembourg remains a rational choice for families in Europe.',
  seo_title_de = 'Leben in Luxemburg 2026: der Leitfaden für Familien',
  seo_description_de = 'Lebensqualität, Wohngemeinden, internationale Schulen, Mobilität und Wohnen: warum Luxemburg für Familien eine der vernünftigsten Entscheidungen bleibt.'
WHERE lower(slug) = 'vivre-au-luxembourg-choix-rationnel-europe';

UPDATE public.blog_posts SET
  seo_title_fr = 'Steinfort 2026 : prix des maisons, appartements et terrains',
  seo_description_fr = 'Prix des maisons, appartements et terrains à Steinfort, Hagen, Kleinbettingen et Grass en 2026, nos ventes récentes et l''accès à Luxembourg-Ville.',
  seo_title_en = 'Steinfort 2026: house, apartment and building plot prices',
  seo_description_en = 'House, apartment and building plot prices in Steinfort, Hagen, Kleinbettingen and Grass in 2026, our recent sales and access to Luxembourg City.',
  seo_title_de = 'Steinfort 2026: Preise für Häuser, Wohnungen und Grundstücke',
  seo_description_de = 'Preise für Häuser, Wohnungen und Baugrundstücke in Steinfort, Hagen, Kleinbettingen und Grass 2026, mit aktuellen Verkäufen und der Anbindung an Luxemburg-Stadt.'
WHERE lower(slug) = 'immobilier-steinfort';

COMMIT;

-- Controle : un article par ligne, attendu 4 lignes avec les six champs remplis.
SELECT slug AS controle,
       concat_ws(' / ',
         'FR ' || length(seo_title_fr) || ' et ' || length(seo_description_fr),
         'EN ' || length(seo_title_en) || ' et ' || length(seo_description_en),
         'DE ' || length(seo_title_de) || ' et ' || length(seo_description_de)) AS etat
FROM public.blog_posts
WHERE lower(slug) IN ('vendre-luxembourg-2026-prix-estimation', 'off-market-luxembourg-fin-modele-informel', 'vivre-au-luxembourg-choix-rationnel-europe', 'immobilier-steinfort')
ORDER BY slug;
