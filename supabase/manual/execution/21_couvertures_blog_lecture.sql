-- =====================================================================
-- 21 COUVERTURES DU BLOG : LECTURE SEULE
-- MAPA Property, prepare le 2026-10-07. Ne modifie AUCUNE table (lecture
-- seule).
--
-- Pour chaque article publie : adresse de couverture, fichier correspondant
-- dans Supabase Storage (bucket blog-covers), taille et type declares.
-- Sert a confirmer la cause d'une couverture non affichee : fichier absent,
-- type declare qui n'est pas une image, ou fichier source trop lourd pour
-- l'optimiseur d'images de l'hebergeur (a comparer a sa limite).
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

SELECT p.slug::text AS article,
       p.cover_image::text AS couverture,
       o.name::text AS fichier,
       CASE WHEN o.id IS NULL THEN 'ABSENT' ELSE 'present' END::text AS etat,
       round(coalesce((o.metadata ->> 'size')::numeric, 0) / 1048576, 2) AS taille_mo,
       (o.metadata ->> 'mimetype')::text AS type_declare
FROM public.blog_posts p
LEFT JOIN storage.objects o
  ON o.bucket_id = 'blog-covers'
 AND o.name = substring(p.cover_image from '/storage/v1/object/public/blog-covers/(.*)$')
WHERE p.is_published IS TRUE
ORDER BY 1;
