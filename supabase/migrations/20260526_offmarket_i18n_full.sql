-- Sprint I18N — Extension i18n complete pour properties_offmarket.
-- Complement de la migration 20260518_offmarket_i18n_titles.sql (qui
-- avait ajoute title_en/_de) avec les colonnes description et short_pitch
-- listees a l'epoque comme "suite possible non incluse" (cf. commentaire
-- L.23-24 de 20260518).
--
-- Schema cible apres cette migration :
--   properties_offmarket :
--     title             text  (FR, existant)
--     title_en          text  (migration 20260518)
--     title_de          text  (migration 20260518)
--     description       text  (FR, existant)
--     description_en    text  (NEW)
--     description_de    text  (NEW)
--     short_pitch       text  (FR, existant)
--     short_pitch_en    text  (NEW)
--     short_pitch_de    text  (NEW)
--
-- Strategie de remplissage (a venir dans sprints futurs avec DEEPL_API_KEY) :
--   1. Auto-traduction DeepL FR -> EN + DE au save admin
--      (cf. lib/translate.ts + app/admin/offmarket/actions.ts a creer)
--   2. Script one-shot pour remplir les biens existants
--      (cf. scripts/translate-existing-offmarket.mjs a creer)
--
-- Lecture cote rendu : helper lib/i18n-field.ts::getLocalizedField gere
-- deja la cascade locale -> fr -> base. Aucun changement code requis pour
-- que les nouvelles colonnes soient consommees automatiquement.
--
-- IDEMPOTENT : ADD COLUMN IF NOT EXISTS pour permettre replays.

ALTER TABLE public.properties_offmarket
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_de TEXT,
  ADD COLUMN IF NOT EXISTS short_pitch_en TEXT,
  ADD COLUMN IF NOT EXISTS short_pitch_de TEXT;

COMMENT ON COLUMN public.properties_offmarket.description_en IS
  'Description EN — auto-traduite via DeepL au save admin (FR source).';
COMMENT ON COLUMN public.properties_offmarket.description_de IS
  'Description DE — auto-traduite via DeepL au save admin (FR source).';
COMMENT ON COLUMN public.properties_offmarket.short_pitch_en IS
  'Pitch court EN — auto-traduit via DeepL au save admin (FR source).';
COMMENT ON COLUMN public.properties_offmarket.short_pitch_de IS
  'Pitch court DE — auto-traduit via DeepL au save admin (FR source).';
