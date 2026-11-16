-- =====================================================================
-- 40 CONSOMMATION CLAUDE (bouton "Traduire maintenant avec Claude API")
-- MAPA Property, prepare le 2026-11-16. NON EXECUTE par Claude.
--
-- Cree (si absentes) :
--   public.claude_usage    un enregistrement par appel a l'API Claude :
--                          date, usage, modele, jetons lus, jetons ecrits,
--                          cout calcule en dollars et en euros (taux BCE
--                          du jour, vide s'il n'etait pas disponible),
--                          bien concerne, regroupement des appels d'un
--                          meme clic (request_id)
--   public.claude_credit   reglage unique (ligne 1) : credit charge sur la
--                          console Claude (montant en dollars) et date du
--                          chargement, pour le "credit restant estime"
-- Acces : RLS active, rien pour le public (anon), lecture et ecriture
-- reservees a public.is_mapa_admin() (comptes admin en double
-- authentification), meme modele que les tables de pilotage.
-- Tant que ce fichier n'est pas execute, l'admin affiche "base pas encore
-- prete" et la traduction fonctionne quand meme (cout affiche, non garde).
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle. Rejouable sans erreur.
-- Retour arriere : en fin de fichier, en commentaire.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.claude_usage (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  usage         TEXT NOT NULL DEFAULT 'traduction',
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cost_usd      NUMERIC(12, 6) NOT NULL DEFAULT 0,
  cost_eur      NUMERIC(12, 6),
  usd_per_eur   NUMERIC(10, 6),
  property_id   UUID,
  request_id    UUID
);
CREATE INDEX IF NOT EXISTS idx_claude_usage_created_at ON public.claude_usage (created_at DESC);

CREATE TABLE IF NOT EXISTS public.claude_credit (
  id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  amount_usd NUMERIC(12, 2) NOT NULL CHECK (amount_usd >= 0),
  loaded_on  DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Acces : RLS ; rien pour anon ; admin seulement (lecture, ajout, et mise
-- a jour du credit). Aucune suppression par l'API.
ALTER TABLE public.claude_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claude_credit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.claude_usage FROM anon, authenticated;
REVOKE ALL ON public.claude_credit FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.claude_usage_id_seq FROM anon, authenticated;
GRANT SELECT, INSERT ON public.claude_usage TO authenticated;
GRANT USAGE ON SEQUENCE public.claude_usage_id_seq TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.claude_credit TO authenticated;

DROP POLICY IF EXISTS claude_usage_admin_read ON public.claude_usage;
DROP POLICY IF EXISTS claude_usage_admin_insert ON public.claude_usage;
DROP POLICY IF EXISTS claude_credit_admin_read ON public.claude_credit;
DROP POLICY IF EXISTS claude_credit_admin_write ON public.claude_credit;
DROP POLICY IF EXISTS claude_credit_admin_update ON public.claude_credit;

DO $$
BEGIN
  IF to_regprocedure('public.is_mapa_admin()') IS NOT NULL THEN
    CREATE POLICY claude_usage_admin_read ON public.claude_usage FOR SELECT TO authenticated USING (public.is_mapa_admin());
    CREATE POLICY claude_usage_admin_insert ON public.claude_usage FOR INSERT TO authenticated WITH CHECK (public.is_mapa_admin());
    CREATE POLICY claude_credit_admin_read ON public.claude_credit FOR SELECT TO authenticated USING (public.is_mapa_admin());
    CREATE POLICY claude_credit_admin_write ON public.claude_credit FOR INSERT TO authenticated WITH CHECK (public.is_mapa_admin());
    CREATE POLICY claude_credit_admin_update ON public.claude_credit FOR UPDATE TO authenticated USING (public.is_mapa_admin()) WITH CHECK (public.is_mapa_admin());
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
WITH attendu (ordre, nom, regles) AS (
  VALUES (1, 'claude_usage', 2), (2, 'claude_credit', 3)
),
etat AS (
  SELECT a.ordre, a.nom, a.regles, to_regclass('public.' || a.nom) AS oid_table
  FROM attendu a
)
SELECT objet::text, constate::text, resultat::text FROM (
  SELECT e.ordre,
         'public.' || e.nom AS objet,
         CASE WHEN e.oid_table IS NULL THEN 'table absente'
              ELSE 'RLS ' || CASE WHEN c.relrowsecurity THEN 'active' ELSE 'desactivee' END
                   || ', regles admin : ' || (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = e.nom
                          AND (p.qual ILIKE '%is_mapa_admin%' OR p.with_check ILIKE '%is_mapa_admin%'))::text
                   || ' sur ' || e.regles::text
                   || ', lecture anon : ' || CASE WHEN has_table_privilege('anon', e.oid_table, 'SELECT') THEN 'oui' ELSE 'non' END
                   || ', ecriture anon : ' || CASE WHEN has_table_privilege('anon', e.oid_table, 'INSERT') THEN 'oui' ELSE 'non' END
                   || ', suppression authenticated : ' || CASE WHEN has_table_privilege('authenticated', e.oid_table, 'DELETE') THEN 'oui' ELSE 'non' END
         END AS constate,
         CASE WHEN e.oid_table IS NOT NULL AND c.relrowsecurity
                   AND (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = e.nom
                          AND (p.qual ILIKE '%is_mapa_admin%' OR p.with_check ILIKE '%is_mapa_admin%')) = e.regles
                   AND NOT has_table_privilege('anon', e.oid_table, 'SELECT')
                   AND NOT has_table_privilege('anon', e.oid_table, 'INSERT')
                   AND NOT has_table_privilege('authenticated', e.oid_table, 'DELETE') THEN 'OK'
              ELSE 'A VERIFIER' END AS resultat
  FROM etat e
  LEFT JOIN pg_class c ON c.oid = e.oid_table
  UNION ALL
  SELECT 3, 'fonction public.is_mapa_admin()',
         CASE WHEN to_regprocedure('public.is_mapa_admin()') IS NOT NULL THEN 'presente' ELSE 'absente (regles non creees)' END,
         CASE WHEN to_regprocedure('public.is_mapa_admin()') IS NOT NULL THEN 'OK' ELSE 'A VERIFIER' END
) r
ORDER BY ordre;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE (ne pas executer sauf decision) :
-- DROP TABLE IF EXISTS public.claude_usage;
-- DROP TABLE IF EXISTS public.claude_credit;
-- ---------------------------------------------------------------------
