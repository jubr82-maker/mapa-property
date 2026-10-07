-- =====================================================================
-- 18 NOS RECHERCHES EN COURS
-- MAPA Property, prepare le 2026-10-07. CREE deux tables ; ne modifie
-- AUCUNE donnee existante. A executer apres 17_modeles_annonces.sql.
--
-- 1. public.property_searches : champs PUBLICS d'une recherche (type,
--    communes, budget en fourchette, criteres, delai, textes en 3 langues,
--    statut). Lecture publique (site) : seulement les recherches publiees
--    ou trouvees ET dont le client a donne son accord, et seulement les
--    colonnes publiques (droits par colonne). Ecriture : admin seulement.
-- 2. public.property_search_private : nom, e-mail, telephone, budget
--    exact, adresse actuelle du client, notes, mandat d'origine. Admin
--    seulement (lecture et ecriture) ; rien pour anon.
-- 3. Contrainte : une recherche ne peut etre publiee (ou marquee trouvee)
--    sans l'accord du client pour une publication anonyme.
-- 4. listing_templates accepte aussi les parties "search_title" et
--    "search" (modele des recherches).
--
-- Rejouable : IF NOT EXISTS, regles recreees a l'identique.
-- Retour arriere : DROP TABLE public.property_search_private;
--                  DROP TABLE public.property_searches;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.property_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE CHECK (reference ~ '^R-[0-9]{4}-[0-9]{3,5}$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'found', 'withdrawn')),
  transaction text NOT NULL DEFAULT 'sale' CHECK (transaction IN ('sale', 'rent')),
  property_type text NOT NULL,
  communes text[] NOT NULL DEFAULT '{}',
  budget_min integer CHECK (budget_min IS NULL OR budget_min > 0),
  budget_max integer CHECK (budget_max IS NULL OR budget_max > 0),
  bedrooms_min integer CHECK (bedrooms_min IS NULL OR bedrooms_min BETWEEN 0 AND 50),
  surface_min integer CHECK (surface_min IS NULL OR surface_min BETWEEN 0 AND 100000),
  land_min integer CHECK (land_min IS NULL OR land_min BETWEEN 0 AND 10000000),
  delay text CHECK (delay IS NULL OR delay IN ('immediate', '3_months', '6_months', '12_months', 'flexible')),
  criteria_fr text,
  criteria_en text,
  criteria_de text,
  title_fr text,
  title_en text,
  title_de text,
  description_fr text,
  description_en text,
  description_de text,
  search_data jsonb,
  consent_anonymous boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  published_at timestamptz,
  found_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_searches_consent_to_publish CHECK (status NOT IN ('published', 'found') OR consent_anonymous)
);

CREATE INDEX IF NOT EXISTS property_searches_status_idx ON public.property_searches (status);
CREATE INDEX IF NOT EXISTS property_searches_communes_idx ON public.property_searches USING gin (communes);

CREATE TABLE IF NOT EXISTS public.property_search_private (
  search_id uuid PRIMARY KEY REFERENCES public.property_searches (id) ON DELETE CASCADE,
  client_name text,
  client_email text,
  client_phone text,
  budget_exact integer CHECK (budget_exact IS NULL OR budget_exact > 0),
  current_address text,
  notes text,
  source_mandate_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Regles d'acces : recherches publiques.
ALTER TABLE public.property_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_searches_public_read" ON public.property_searches;
CREATE POLICY "property_searches_public_read"
  ON public.property_searches FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'found') AND consent_anonymous);

DROP POLICY IF EXISTS "property_searches_admin_all" ON public.property_searches;
CREATE POLICY "property_searches_admin_all"
  ON public.property_searches FOR ALL
  TO authenticated
  USING (public.is_mapa_admin())
  WITH CHECK (public.is_mapa_admin());

-- Droits par colonne : le site ne lit que les colonnes publiques.
REVOKE ALL ON public.property_searches FROM anon;
GRANT SELECT (id, reference, status, transaction, property_type, communes, budget_min, budget_max,
              bedrooms_min, surface_min, land_min, delay, criteria_fr, criteria_en, criteria_de,
              title_fr, title_en, title_de, description_fr, description_en, description_de,
              consent_anonymous, published_at, found_at, updated_at)
  ON public.property_searches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_searches TO authenticated;

-- Regles d'acces : donnees du client, admin seulement.
ALTER TABLE public.property_search_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_search_private_admin_all" ON public.property_search_private;
CREATE POLICY "property_search_private_admin_all"
  ON public.property_search_private FOR ALL
  TO authenticated
  USING (public.is_mapa_admin())
  WITH CHECK (public.is_mapa_admin());

REVOKE ALL ON public.property_search_private FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_search_private TO authenticated;

-- Modele des recherches dans listing_templates (SQL 17).
DO $$
BEGIN
  IF to_regclass('public.listing_templates') IS NOT NULL THEN
    ALTER TABLE public.listing_templates DROP CONSTRAINT IF EXISTS listing_templates_part_check;
    ALTER TABLE public.listing_templates ADD CONSTRAINT listing_templates_part_check
      CHECK (part IN ('title', 'tronc', 'appartement', 'maison', 'villa', 'prestige', 'terrain', 'commercial', 'parking', 'penthouse', 'search_title', 'search'));
  END IF;
END $$;

COMMIT;

-- Tableau final (seul affiche) : tables, regles et droits.
SELECT 'property_searches : RLS active'::text AS controle,
       CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.property_searches'::regclass) THEN 'oui' ELSE 'non' END::text AS etat
UNION ALL
SELECT 'property_search_private : RLS active',
       CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.property_search_private'::regclass) THEN 'oui' ELSE 'non' END
UNION ALL
SELECT 'regle ' || polrelid::regclass::text || ' ' || polname, CASE polcmd WHEN '*' THEN 'toutes operations' WHEN 'r' THEN 'lecture' ELSE polcmd::text END
FROM pg_policy WHERE polrelid IN ('public.property_searches'::regclass, 'public.property_search_private'::regclass)
UNION ALL
SELECT 'anon lit property_search_private',
       CASE WHEN has_table_privilege('anon', 'public.property_search_private', 'SELECT') THEN 'OUI (A CORRIGER)' ELSE 'non' END
UNION ALL
SELECT 'anon lit search_data (interne)',
       CASE WHEN has_column_privilege('anon', 'public.property_searches', 'search_data', 'SELECT') THEN 'OUI (A CORRIGER)' ELSE 'non' END
UNION ALL
SELECT 'anon lit consent_at (interne)',
       CASE WHEN has_column_privilege('anon', 'public.property_searches', 'consent_at', 'SELECT') THEN 'OUI (A CORRIGER)' ELSE 'non' END
ORDER BY 1;
