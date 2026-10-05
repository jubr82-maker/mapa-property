-- =====================================================================
-- 10 IMAGES APIMO RESTANTES : LECTURE SEULE, NE MODIFIE RIEN
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau. Rejouable a volonte.
--
-- Source des photos d'une fiche : table public.property_images (colonnes
-- property_id, url, sort), la meme que lit l'admin. Une image Apimo est
-- une ligne dont l'adresse est sur media.apimo.pro (ou un autre hote
-- apimo.pro) ; une photo de l'admin est toute autre ligne (bucket
-- property-images de Supabase, envoyee depuis l'admin).
-- Regle d'affichage depuis le 2026-10-05 (lib/property-images.ts) : des
-- qu'un bien a au moins une photo de l'admin, ses images Apimo ne sont
-- plus affichees ; sinon, la fiche affiche encore les images Apimo.
--
-- Une ligne par bien qui possede encore au moins une image Apimo :
--   bien                   slug, sinon id
--   en_ligne               oui si is_published
--   images_apimo           nombre d'images media.apimo.pro en base
--   photos_admin           nombre de photos envoyees depuis l'admin
--   fiche_publique         ce que la fiche affiche avec la regle ci-dessus
-- Les biens qui affichent encore des images Apimo sont en tete.
-- Aucune image n'est supprimee ni migree.
-- =====================================================================

WITH images AS (
  SELECT i.property_id,
         count(*) FILTER (WHERE i.url ~* '^https?://([a-z0-9-]+\.)*apimo\.pro(/|$)') AS images_apimo,
         count(*) FILTER (WHERE i.url IS NOT NULL AND btrim(i.url) <> ''
                            AND i.url !~* '^https?://([a-z0-9-]+\.)*apimo\.pro(/|$)') AS photos_admin
  FROM public.property_images i
  GROUP BY i.property_id
)
SELECT coalesce(p.slug, p.id::text)::text AS bien,
       (CASE WHEN p.is_published THEN 'oui' ELSE 'non' END)::text AS en_ligne,
       im.images_apimo::text AS images_apimo,
       im.photos_admin::text AS photos_admin,
       (CASE WHEN im.photos_admin > 0 THEN 'photos de l''admin seules (Apimo masquees)'
             ELSE 'images Apimo encore affichees' END)::text AS fiche_publique
FROM images im
JOIN public.properties p ON p.id = im.property_id
WHERE im.images_apimo > 0
ORDER BY (im.photos_admin > 0), p.is_published DESC, coalesce(p.slug, p.id::text);
