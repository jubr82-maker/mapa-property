-- =====================================================================
-- 08 TITRES DE BIENS CONTENANT UN TIRET LONG OU MOYEN : LECTURE SEULE
-- MAPA Property, prepare le 2026-10-05. Ne modifie RIEN.
--
-- Colonnes lues, toutes utilisees par le code de l'admin :
--   public.properties : id, slug, title_fr, title_en, title_de
--   public.properties_offmarket : id, reference, title
-- Caracteres recherches : U+2014 (tiret long) et U+2013 (tiret moyen),
-- ecrits ici par leur code pour que ce fichier n'en contienne aucun.
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- Correction : dans l'admin, rubrique Biens ou Off-Market, fiche du bien.
-- =====================================================================

WITH motif AS (
  SELECT '[' || chr(8212) || chr(8211) || ']' AS re
)
SELECT ('Biens / ' || coalesce(p.slug, p.id::text))::text AS bien,
       l.langue::text AS langue,
       l.titre::text AS titre
FROM public.properties p
CROSS JOIN LATERAL (VALUES ('fr', p.title_fr), ('en', p.title_en), ('de', p.title_de)) AS l(langue, titre)
CROSS JOIN motif m
WHERE l.titre ~ m.re
UNION ALL
SELECT ('Off-Market / ' || coalesce(o.reference, o.id::text))::text,
       'fr'::text,
       o.title::text
FROM public.properties_offmarket o
CROSS JOIN motif m
WHERE o.title ~ m.re
ORDER BY 1, 2;
