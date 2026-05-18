-- 20260518_offmarket_i18n_titles.sql — BUG T5 (titres off-market i18n)
--
-- ⚠️ À APPLIQUER MANUELLEMENT par Julien dans Supabase Studio.
-- Idempotent / non destructif. Le code est résilient : tant que ces
-- colonnes n'existent pas, l'app retombe sur `title` (FR) sans erreur
-- (fetchHomeFeatured retente sans title_en/_de ; fetchOffmarket* font
-- déjà SELECT * donc tolérant).
--
-- `properties` (Apimo) a déjà title_fr/title_en/title_de (sync Apimo) —
-- rien à faire côté Apimo. Seule `properties_offmarket` (saisie Julien)
-- n'a qu'un `title` FR : on ajoute les variantes EN/DE. À remplir
-- ensuite via l'admin off-market (hors scope autonomie).

ALTER TABLE IF EXISTS public.properties_offmarket
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_de text;

COMMENT ON COLUMN public.properties_offmarket.title_en IS
  'Titre off-market EN (BUG T5). NULL/vide -> fallback title (FR).';
COMMENT ON COLUMN public.properties_offmarket.title_de IS
  'Titre off-market DE (BUG T5). NULL/vide -> fallback title (FR).';

-- Suite possible (non incluse, documentée RAPPORT) : short_pitch_en/_de,
-- description_en/_de + lecture via getLocalizedField (helper déjà prêt).
