-- =====================================================================
-- 16 TYPE DE MANDAT ET PASSEPORT ENERGETIQUE
-- MAPA Property, prepare le 2026-10-07. MODIFIE la STRUCTURE de
-- public.properties (une colonne ajoutee) ; ne modifie AUCUNE donnee.
--
-- 1. Ajoute properties.mandate_type (texte, vide par defaut), limite a :
--    exclusive, semi_exclusive, simple, autonomous. Choisi dans la fiche
--    admin par quatre boutons ; "exclusive" affiche le badge "Exclusivite"
--    sur la carte et la fiche publiques. Lisible par le site comme les
--    autres colonnes de properties (memes droits, aucune regle ajoutee).
-- 2. Documente energy et thermal : classe d'efficacite energetique et
--    classe d'isolation thermique du passeport energetique luxembourgeois
--    (A+ a I). Aucune contrainte posee : d'anciennes valeurs hors liste
--    restent lisibles ; la fiche admin n'accepte plus que A+ a I.
--
-- Avant execution, la fiche admin reste utilisable : les boutons du mandat
-- sont desactives et le site affiche les biens sans ce badge.
-- Rejouable : ADD COLUMN IF NOT EXISTS, contrainte creee une seule fois.
-- Retour arriere : ALTER TABLE public.properties DROP COLUMN mandate_type;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS mandate_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_mandate_type_check'
      AND conrelid = 'public.properties'::regclass
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_mandate_type_check
      CHECK (mandate_type IS NULL OR mandate_type IN ('exclusive', 'semi_exclusive', 'simple', 'autonomous'));
  END IF;
END $$;

COMMENT ON COLUMN public.properties.mandate_type IS
  'Type de mandat : exclusive, semi_exclusive, simple, autonomous (vide si non renseigne).';
COMMENT ON COLUMN public.properties.energy IS
  'Passeport energetique luxembourgeois : classe d''efficacite energetique (A+ a I).';
COMMENT ON COLUMN public.properties.thermal IS
  'Passeport energetique luxembourgeois : classe d''isolation thermique (A+ a I).';

COMMIT;

-- Tableau final (seul affiche) : etat de la colonne et valeurs a revoir.
--   colonne mandate_type : presente ou absente
--   badge Exclusivite    : biens qui portent deja ce badge a la main (le
--                          mandat exclusif est a choisir dans leur fiche)
--   energy / thermal     : valeurs actuelles hors de la liste A+ a I, a
--                          corriger dans la fiche
SELECT 'colonne mandate_type'::text AS controle,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'mandate_type'
       ) THEN 'presente' ELSE 'absente' END::text AS valeur,
       NULL::bigint AS biens
UNION ALL
SELECT 'badge Exclusivite pose a la main', '', count(*)
FROM public.properties WHERE badge = 'Exclusivit' || chr(233)
UNION ALL
SELECT 'energy hors liste', coalesce(energy, ''), count(*)
FROM public.properties
WHERE energy IS NOT NULL AND btrim(energy) <> ''
  AND energy NOT IN ('A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')
GROUP BY energy
UNION ALL
SELECT 'thermal hors liste', coalesce(thermal, ''), count(*)
FROM public.properties
WHERE thermal IS NOT NULL AND btrim(thermal) <> ''
  AND thermal NOT IN ('A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')
GROUP BY thermal
ORDER BY 1, 2;
