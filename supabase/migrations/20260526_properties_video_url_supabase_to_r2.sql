-- Sprint C11-ter — Migration video_url des fiches biens : Supabase Storage
-- (bucket property-videos) vers Cloudflare R2 (egress illimite).
--
-- Probleme observe : /fr/biens/86388715 charge encore la video Supabase
-- mapa_video_2026-05-19T16-17-29.webm (46 MB) a chaque visite. Source
-- residuelle de Cached Egress apres C11-bis (qui avait migre Hero.tsx +
-- showcase desktop/mobile).
--
-- Approche : remplacer en place l'URL Supabase par l'URL R2 dans les
-- colonnes video_url de public.properties ET public.properties_offmarket.
-- Le composant PropertyVideo reste agnostique (passe-plat), aucune modif
-- code requise.
--
-- IDEMPOTENT :
--  - REPLACE est no-op si la chaine n'est pas trouvee (donc safe au replay)
--  - Le WHERE filtre quand meme pour minimiser les updates inutiles +
--    permettre un comptage exact des rows affectees (lecture des logs).

BEGIN;

-- Table publique principale (biens en vente sur le site).
UPDATE public.properties
SET video_url = REPLACE(
  video_url,
  'https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/property-videos/mapa_video_2026-05-19T16-17-29.webm',
  'https://pub-c9fa8716c00f4a0c965197a93086bdce.r2.dev/mapa-hero-video.mp4'
)
WHERE video_url LIKE '%property-videos/mapa_video_2026-05-19T16-17-29.webm%';

-- Table off-market (acces NDA — meme pattern d'URL eventuel).
UPDATE public.properties_offmarket
SET video_url = REPLACE(
  video_url,
  'https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/property-videos/mapa_video_2026-05-19T16-17-29.webm',
  'https://pub-c9fa8716c00f4a0c965197a93086bdce.r2.dev/mapa-hero-video.mp4'
)
WHERE video_url LIKE '%property-videos/mapa_video_2026-05-19T16-17-29.webm%';

-- Verification post-migration (informationnel uniquement, ne bloque pas
-- le commit). Doit retourner 0 ligne apres execution.
-- SELECT id, video_url FROM public.properties
--   WHERE video_url LIKE '%property-videos%';
-- SELECT id, video_url FROM public.properties_offmarket
--   WHERE video_url LIKE '%property-videos%';

COMMIT;
