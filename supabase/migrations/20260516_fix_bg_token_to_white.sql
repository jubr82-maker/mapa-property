-- Fix : bg token crème (#F5EFE1) → blanc pur (#FFFFFF)
-- Alignement luxe intl (Christie's/Sotheby's/Knight Frank) — décision design P0
-- Le seed initial (20260513_cms_design_tokens.sql) injectait #F5EFE1, ce qui
-- override --bg via le <style> inline dans app/[locale]/layout.tsx (ligne 149)
-- et faisait apparaître tout le site en crème malgré le globals.css blanc.

UPDATE design_tokens
SET value = '#FFFFFF',
    description = 'Background blanc pur (luxe intl)'
WHERE category = 'color' AND key = 'bg';

-- Vérification
SELECT category, key, value, description
FROM design_tokens
WHERE category = 'color' AND key = 'bg';
