-- ============================================================================
-- MAPA Property — Migration property_type vers les slugs de la taxonomie
-- unique (lib/taxonomy/property-types.ts). 3 septembre 2026.
--
-- NON EXÉCUTÉE PAR CLAUDE. À appliquer manuellement par Julien dans le
-- SQL Editor Supabase après relecture, une fois le code de la taxonomie
-- hiérarchique déployé (sinon la recherche publique casserait entre le
-- moment où les valeurs legacy sont réécrites et le moment où le code qui
-- les comprend est en ligne).
--
-- Contexte : property_type contenait jusqu'ici les libellés bruts issus
-- de la synchro Apimo (désormais désactivée, cf. NOTES_APIMO_CRON_DESACTIVE.md)
-- — Capitalized, avec espaces, accents. Le nouveau système de recherche
-- (lib/property-types.ts + lib/taxonomy/property-types.ts) attend des
-- slugs kebab-case ASCII identiques à ceux de la taxonomie. Cette
-- migration réécrit UNIQUEMENT les 11 valeurs distinctes constatées en
-- base (cf. chantier d'audit précédent) vers leur slug équivalent.
--
-- Idempotente : les valeurs déjà migrées (slugs) ne matchent plus aucune
-- des valeurs WHEN ci-dessous, donc un second run est sans effet.
-- ============================================================================

BEGIN;

UPDATE public.properties
SET property_type = CASE property_type
  WHEN 'Appartement' THEN 'appartement'
  WHEN 'Bureau' THEN 'bureau'
  WHEN 'Local et fonds de commerce' THEN 'fonds-de-commerce'
  WHEN 'Penthouse' THEN 'penthouse'
  WHEN 'Terrain constructible' THEN 'terrain-constructible'
  WHEN 'Villa' THEN 'villa'
  WHEN 'Ensemble immobilier' THEN 'ensemble-immobilier'
  WHEN 'Maison' THEN 'maison'
  WHEN 'Maison jumelée' THEN 'maison-jumelee'
  WHEN 'Local commercial' THEN 'local-commercial'
  WHEN 'Duplex' THEN 'duplex'
  ELSE property_type
END
WHERE property_type IN (
  'Appartement',
  'Bureau',
  'Local et fonds de commerce',
  'Penthouse',
  'Terrain constructible',
  'Villa',
  'Ensemble immobilier',
  'Maison',
  'Maison jumelée',
  'Local commercial',
  'Duplex'
);

COMMIT;

-- ============================================================================
-- Vérification post-migration (à lancer manuellement, informatif seulement) :
--
-- SELECT property_type, COUNT(*) AS nb
-- FROM public.properties
-- WHERE is_published = true
-- GROUP BY property_type
-- ORDER BY nb DESC;
--
-- Chaque property_type restant doit désormais être un slug kebab-case
-- (ex. "maison-jumelee"), pas une valeur Capitalized avec espaces. Si une
-- valeur inattendue subsiste (ni dans la liste WHEN ci-dessus, ni déjà un
-- slug), elle n'a pas été touchée par cette migration — à traiter au cas
-- par cas (le contrat strict de app/[locale]/biens/page.tsx exclut de
-- toute façon un property_type qui ne matche aucun slug connu des
-- résultats filtrés, sans planter).
-- ============================================================================
