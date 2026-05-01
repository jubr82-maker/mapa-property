-- ═══════════════════════════════════════════════════════════════════
-- MAPA Property — Ajout colonnes country/city à la table leads
-- V28 FINAL14g — Demandé par Julien : champs Pays/Ville dans formulaires
-- À exécuter dans Supabase SQL Editor une seule fois
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE leads ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;

-- Index pour recherche/filtre admin
CREATE INDEX IF NOT EXISTS idx_leads_country ON leads (country);

-- Vérification
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND column_name IN ('country', 'city');
