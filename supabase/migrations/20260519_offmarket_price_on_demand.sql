-- POL2-9 — Prix off-market pilotable depuis le back-office.
--
-- Ajoute un drapeau booléen `price_on_demand` sur properties_offmarket.
--   - DEFAULT false  ⇒ le prix réel est affiché publiquement (comportement
--     par défaut voulu : inversion DÉLIBÉRÉE de BUG 1 qui forçait
--     "Prix sur demande" partout en dur).
--   - true           ⇒ le composant public masque le prix et affiche
--     "Prix sur demande" (localisé fr/en/de).
--
-- Idempotent. NON appliqué automatiquement — Julien l'exécute via la
-- console Supabase / CLI. Tant que la colonne n'existe pas, le code
-- public traite l'absence/undefined comme false (prix affiché) sans
-- planter.

ALTER TABLE properties_offmarket
  ADD COLUMN IF NOT EXISTS price_on_demand boolean DEFAULT false;
