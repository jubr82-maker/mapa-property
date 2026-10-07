-- =====================================================================
-- 11 IMAGES DES ARTICLES DU BLOG : LECTURE SEULE
-- MAPA Property, prepare le 2026-10-06. Ne modifie RIEN (SELECT seul).
--
-- Pour chaque article : la couverture (blog_posts.cover_image) et chaque
-- image du texte (balises <img> de content_fr, content_en, content_de,
-- attribut src ou data-src), sa nature, et pour une image du stockage
-- Supabase, si le fichier existe vraiment dans storage.objects.
-- En fin de tableau : le bucket blog-covers (public ou non) et ses regles
-- d'acces (envoi des couvertures depuis l'admin).
--
-- Lecture du tableau, colonne "constat" :
--   aucune image                    : rien a afficher (le site v28
--                                     montrait alors une image Unsplash
--                                     par defaut, le nouveau site rien)
--   relative ou non https           : jamais affichable
--   stockage Supabase, bucket X     : voir "fichier_present" et la ligne
--                                     du bucket (public ou non)
--   hote optimise par le site       : passe par next/image
--   autre hote                      : affichee sans optimisation depuis
--                                     la seconde passe (oct. 2026)
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

WITH images AS (
  SELECT p.slug, p.is_published, 'couverture'::text AS emplacement, p.cover_image AS adresse
  FROM public.blog_posts p
  UNION ALL
  SELECT p.slug, p.is_published, ('texte ' || l.langue || ' ' || m[1])::text, m[2]
  FROM public.blog_posts p
  CROSS JOIN LATERAL (VALUES ('fr', p.content_fr), ('en', p.content_en), ('de', p.content_de)) AS l(langue, html)
  CROSS JOIN LATERAL regexp_matches(coalesce(l.html, ''), '<img[^>]*?\s(src|data-src)\s*=\s*["'']([^"'']*)["'']', 'gi') AS m
),
diag_images AS (
  SELECT i.*,
         substring(i.adresse from '^https?://([^/:?#]+)') AS hote,
         substring(i.adresse from '/storage/v1/object/public/([^/]+)/') AS bucket,
         substring(i.adresse from '/storage/v1/object/public/[^/]+/([^?#]+)') AS chemin_encode
  FROM images i
),
decode AS (
  SELECT a.*,
         CASE WHEN a.chemin_encode IS NULL THEN NULL ELSE (
           SELECT convert_from(
                    string_agg(
                      CASE WHEN t.tok[1] ~ '^%[0-9A-Fa-f]{2}$' THEN decode(substr(t.tok[1], 2), 'hex')
                           ELSE convert_to(t.tok[1], 'UTF8') END,
                      ''::bytea ORDER BY t.n),
                    'UTF8')
           FROM regexp_matches(a.chemin_encode, '(%[0-9A-Fa-f]{2}|[^%]+|%)', 'g') WITH ORDINALITY AS t(tok, n)
         ) END AS chemin
  FROM diag_images a
)
SELECT ('Article / ' || coalesce(d.slug, '(sans adresse)'))::text AS article,
       (CASE WHEN d.is_published THEN 'publie' ELSE 'brouillon' END)::text AS statut,
       d.emplacement::text AS emplacement,
       coalesce(d.adresse, '')::text AS adresse,
       (CASE
          WHEN d.adresse IS NULL OR btrim(d.adresse) = '' THEN 'aucune image'
          WHEN d.adresse !~* '^https://' AND d.adresse !~ '^/[^/]' THEN 'relative ou non https : jamais affichable'
          WHEN d.hote = 'dutfkblygfvhhwpzxmfz.supabase.co' AND d.bucket IS NOT NULL THEN 'stockage Supabase, bucket ' || d.bucket
          WHEN d.hote = 'dutfkblygfvhhwpzxmfz.supabase.co' THEN 'stockage Supabase, adresse non publique'
          WHEN d.hote IN ('images.unsplash.com', 'media.apimo.pro', 'pub-c9fa8716c00f4a0c965197a93086bdce.r2.dev')
               OR d.hote LIKE '%.apimo.pro' THEN 'hote optimise par le site'
          WHEN d.adresse ~ '^/[^/]' THEN 'fichier du site'
          ELSE 'autre hote : ' || coalesce(d.hote, '?')
        END)::text AS constat,
       (CASE WHEN d.bucket IS NULL THEN ''
             WHEN EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = d.bucket AND o.name = d.chemin) THEN 'oui'
             ELSE 'NON : fichier absent du stockage' END)::text AS fichier_present
FROM decode d
UNION ALL
SELECT 'Bucket blog-covers'::text, ''::text, 'reglage'::text, ''::text,
       coalesce((SELECT CASE WHEN b.public THEN 'public' ELSE 'PRIVE : adresses /object/public/ refusees' END
                 FROM storage.buckets b WHERE b.id = 'blog-covers'), 'ABSENT')::text,
       ''::text
UNION ALL
SELECT 'Bucket blog-covers'::text, ''::text, ('regle ' || pol.cmd)::text, pol.policyname::text,
       ('roles ' || array_to_string(pol.roles, ', ') || ' ; condition ' || coalesce(pol.qual, '') || ' ; controle ' || coalesce(pol.with_check, ''))::text,
       ''::text
FROM pg_policies pol
WHERE pol.schemaname = 'storage' AND pol.tablename = 'objects'
  AND (coalesce(pol.qual, '') ILIKE '%blog-covers%' OR coalesce(pol.with_check, '') ILIKE '%blog-covers%')
ORDER BY 1, 3;
