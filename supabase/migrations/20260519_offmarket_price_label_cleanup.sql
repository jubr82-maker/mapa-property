-- POL3-5 — Nettoyage du legacy `price_label` sur properties_offmarket.
--
-- Contexte : la table properties_offmarket porte un historique de
-- colonnes prix. `price_label` (TEXT, DEFAULT 'Prix sur demande' depuis
-- 20260511_admin_offmarket) contenait souvent la chaîne legacy
-- "Prix sur demande" / "Price on request" / "Preis auf Anfrage" même
-- pour des biens dont le prix doit être affiché. Tant que le composant
-- public lisait `price_label`, ce libellé écrasait le bouton admin
-- `price_on_demand` : le prix réel n'apparaissait jamais.
--
-- POL3-5 supprime DÉFINITIVEMENT toute lecture de `price_label` /
-- `price_custom_text` côté affichage public (cf. PropertyPrice.tsx).
-- Cette migration remet à NULL les `price_label` legacy parasites pour
-- les biens dont le prix N'est PAS sur demande, afin que d'éventuels
-- consommateurs résiduels ne réaffichent pas "Prix sur demande".
--
-- Idempotent. NON appliquée automatiquement — Julien l'exécute via la
-- console Supabase / CLI. La clause WHERE ... = false n'agit que si la
-- colonne price_on_demand existe (migration 20260519_offmarket_price_on_demand
-- appliquée). Sans risque sur les biens réellement confidentiels.

UPDATE properties_offmarket
SET price_label = NULL
WHERE price_on_demand = false
  AND price_label IN ('Prix sur demande', 'Price on request', 'Preis auf Anfrage');
