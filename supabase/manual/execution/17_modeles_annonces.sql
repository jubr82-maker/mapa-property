-- =====================================================================
-- 17 MODELES D'ANNONCES
-- MAPA Property, prepare le 2026-10-07. MODIFIE la STRUCTURE (une colonne
-- ajoutee a public.properties, une table creee) ; ne modifie AUCUNE
-- donnee existante.
--
-- 1. properties.listing_data (jsonb, vide par defaut) : champs du modele
--    d'annonce d'un bien (qualificatif, phrase d'ambiance, pieces par
--    niveau, atouts, donnees factuelles) et textes qui suivent encore le
--    modele. Contenu redige pour l'annonce publique : aucune donnee de
--    client. Lisible comme les autres colonnes de properties.
-- 2. public.listing_templates : modifications des modeles faites dans
--    Parametres > Modeles d'annonces (une ligne par langue et par partie :
--    title, tronc, appartement, maison, villa, prestige, terrain,
--    commercial, parking, penthouse). Sans ligne, le modele par defaut du
--    site s'applique. Lecture et ecriture : admin seulement
--    (is_mapa_admin, session aal2) ; rien pour anon.
--
-- Avant execution, la fiche admin reste utilisable : la section Annonce
-- l'indique et rien n'est envoye pour listing_data.
-- Rejouable : IF NOT EXISTS partout, regles recreees a l'identique.
-- Retour arriere : DROP TABLE public.listing_templates;
--                  ALTER TABLE public.properties DROP COLUMN listing_data;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_data jsonb;
COMMENT ON COLUMN public.properties.listing_data IS
  'Modele d''annonce : champs rediges, pieces par niveau, donnees factuelles, textes suivant le modele.';

CREATE TABLE IF NOT EXISTS public.listing_templates (
  lang text NOT NULL CHECK (lang IN ('fr', 'en', 'de')),
  part text NOT NULL CHECK (part IN ('title', 'tronc', 'appartement', 'maison', 'villa', 'prestige', 'terrain', 'commercial', 'parking', 'penthouse')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 20000),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lang, part)
);

ALTER TABLE public.listing_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_templates_admin_all" ON public.listing_templates;
CREATE POLICY "listing_templates_admin_all"
  ON public.listing_templates FOR ALL
  TO authenticated
  USING (public.is_mapa_admin())
  WITH CHECK (public.is_mapa_admin());

REVOKE ALL ON public.listing_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_templates TO authenticated;

COMMIT;

-- Tableau final (seul affiche) : etat de la colonne, de la table et des
-- regles d'acces.
SELECT 'colonne properties.listing_data'::text AS controle,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'listing_data'
       ) THEN 'presente' ELSE 'absente' END::text AS etat
UNION ALL
SELECT 'table listing_templates, RLS active',
       CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.listing_templates'::regclass) THEN 'oui' ELSE 'non' END
UNION ALL
SELECT 'regle ' || polname, CASE polcmd WHEN '*' THEN 'toutes operations' ELSE polcmd::text END
FROM pg_policy WHERE polrelid = 'public.listing_templates'::regclass
UNION ALL
SELECT 'droits anon sur listing_templates',
       CASE WHEN has_table_privilege('anon', 'public.listing_templates', 'SELECT') THEN 'LECTURE POSSIBLE' ELSE 'aucun' END
ORDER BY 1;
