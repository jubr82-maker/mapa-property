-- =====================================================================
-- 23 QUESTIONS FREQUENTES (module FAQ)
-- MAPA Property, prepare le 2026-10-16. CREE une table ; ne modifie AUCUNE
-- donnee existante.
--
-- public.faqs : une question et sa reponse en FR, EN et DE, rattachee a
-- une page du site par page_key, ordonnee par position, visible si
-- published. Lecture publique : lignes publiees seulement. Ecriture :
-- admin seulement (public.is_mapa_admin(), comme les autres tables admin).
--
-- page_key : valeurs fermees. "agence", "accueil", "vendre", "acheter",
-- "louer", "estimer", "mandat-recherche", "off-market", "faq-generale",
-- "broker-international",
-- "ville:<adresse de la ville>", "blog:<adresse de l'article>" (adresse en
-- minuscules, chiffres et tirets).
--
-- Rejouable : IF NOT EXISTS, regles et contrainte de page recreees a
-- l'identique (deja execute : la liste des pages est mise a jour).
-- Retour arriere : DROP TABLE public.faqs;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  question_fr text,
  answer_fr text,
  question_en text,
  answer_en text,
  question_de text,
  answer_de text,
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT faqs_page_key_check CHECK (
    page_key IN ('agence', 'accueil', 'vendre', 'acheter', 'louer', 'estimer', 'mandat-recherche', 'off-market', 'faq-generale', 'broker-international')
    OR page_key ~ '^(ville|blog):[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  CONSTRAINT faqs_pairs_complete CHECK (
    (question_fr IS NULL) = (answer_fr IS NULL)
    AND (question_en IS NULL) = (answer_en IS NULL)
    AND (question_de IS NULL) = (answer_de IS NULL)
  )
);

-- Liste des pages : recreee pour qu'une nouvelle execution la mette a jour.
ALTER TABLE public.faqs DROP CONSTRAINT IF EXISTS faqs_page_key_check;
ALTER TABLE public.faqs ADD CONSTRAINT faqs_page_key_check CHECK (
  page_key IN ('agence', 'accueil', 'vendre', 'acheter', 'louer', 'estimer', 'mandat-recherche', 'off-market', 'faq-generale', 'broker-international')
  OR page_key ~ '^(ville|blog):[a-z0-9]+(-[a-z0-9]+)*$'
);

CREATE INDEX IF NOT EXISTS faqs_page_position_idx ON public.faqs (page_key, position);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faqs_public_read" ON public.faqs;
CREATE POLICY "faqs_public_read"
  ON public.faqs FOR SELECT
  TO anon, authenticated
  USING (published);

DROP POLICY IF EXISTS "faqs_admin_all" ON public.faqs;
CREATE POLICY "faqs_admin_all"
  ON public.faqs FOR ALL
  TO authenticated
  USING (public.is_mapa_admin())
  WITH CHECK (public.is_mapa_admin());

REVOKE ALL ON public.faqs FROM anon;
GRANT SELECT ON public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;

COMMIT;

SELECT 'table faqs'::text AS controle,
       CASE WHEN to_regclass('public.faqs') IS NOT NULL THEN 'presente' ELSE 'absente' END::text AS etat
UNION ALL
SELECT 'regles d''acces (attendu 2)', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'faqs')
UNION ALL
SELECT 'ecriture possible par anon (attendu non)',
       CASE WHEN has_table_privilege('anon', 'public.faqs', 'INSERT') THEN 'OUI (A CORRIGER)' ELSE 'non' END;
