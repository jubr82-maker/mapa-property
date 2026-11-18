-- =====================================================================
-- 43 INDEXATION DEMANDEE ET BUDGET MENSUEL CLAUDE
-- MAPA Property, prepare le 2026-11-18. NON EXECUTE par Claude.
--
-- Cree (si absentes) :
--   public.index_requests  une ligne par adresse pour laquelle Julien a
--                          demande l'indexation dans Search Console :
--                          adresse et date de la demande (case
--                          « Indexation demandee », page Controle Google).
--                          Decochee : la ligne est retiree.
--   public.claude_budget   reglage unique (ligne 1) : budget mensuel Claude
--                          en dollars, 200 par defaut (carte
--                          « Consommation Claude »).
-- Ajout uniquement : aucune table existante n'est modifiee.
-- Acces : RLS active, rien pour le public (anon), lecture et ecriture
-- reservees a public.is_mapa_admin(). Meme modele que les fichiers 40 et 42.
-- Tant que ce fichier n'est pas execute : la case est grisee avec la
-- mention « executer le fichier SQL 43 », le budget de 200 $ s'applique,
-- rien ne plante.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle, chaque ligne a OK.
-- Rejouable sans erreur. Retour arriere : en fin de fichier, en commentaire.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.index_requests (
  url          TEXT PRIMARY KEY CHECK (url ~ '^https?://' AND length(url) <= 2000),
  requested_on DATE NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.claude_budget (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  monthly_usd NUMERIC(12, 2) NOT NULL DEFAULT 200 CHECK (monthly_usd > 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.claude_budget (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.index_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claude_budget ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.index_requests FROM anon, authenticated;
REVOKE ALL ON public.claude_budget FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.index_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.claude_budget TO authenticated;

DROP POLICY IF EXISTS index_requests_admin_read ON public.index_requests;
DROP POLICY IF EXISTS index_requests_admin_insert ON public.index_requests;
DROP POLICY IF EXISTS index_requests_admin_update ON public.index_requests;
DROP POLICY IF EXISTS index_requests_admin_delete ON public.index_requests;
DROP POLICY IF EXISTS claude_budget_admin_read ON public.claude_budget;
DROP POLICY IF EXISTS claude_budget_admin_write ON public.claude_budget;
DROP POLICY IF EXISTS claude_budget_admin_update ON public.claude_budget;

DO $$
BEGIN
  IF to_regprocedure('public.is_mapa_admin()') IS NOT NULL THEN
    CREATE POLICY index_requests_admin_read ON public.index_requests FOR SELECT TO authenticated USING (public.is_mapa_admin());
    CREATE POLICY index_requests_admin_insert ON public.index_requests FOR INSERT TO authenticated WITH CHECK (public.is_mapa_admin());
    CREATE POLICY index_requests_admin_update ON public.index_requests FOR UPDATE TO authenticated USING (public.is_mapa_admin()) WITH CHECK (public.is_mapa_admin());
    CREATE POLICY index_requests_admin_delete ON public.index_requests FOR DELETE TO authenticated USING (public.is_mapa_admin());
    CREATE POLICY claude_budget_admin_read ON public.claude_budget FOR SELECT TO authenticated USING (public.is_mapa_admin());
    CREATE POLICY claude_budget_admin_write ON public.claude_budget FOR INSERT TO authenticated WITH CHECK (public.is_mapa_admin());
    CREATE POLICY claude_budget_admin_update ON public.claude_budget FOR UPDATE TO authenticated USING (public.is_mapa_admin()) WITH CHECK (public.is_mapa_admin());
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche) : chaque ligne doit afficher OK
-- ---------------------------------------------------------------------
SELECT objet, constate, resultat FROM (
  SELECT 1 AS ordre, 'public.index_requests' AS objet,
         CASE WHEN to_regclass('public.index_requests') IS NULL THEN 'table absente'
              ELSE 'RLS ' || CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.index_requests')) THEN 'active' ELSE 'desactivee' END END AS constate,
         CASE WHEN to_regclass('public.index_requests') IS NOT NULL
                   AND (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.index_requests')) THEN 'OK' ELSE 'A VERIFIER' END AS resultat
  UNION ALL
  SELECT 2, 'regles admin index_requests (4 attendues)',
         (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'index_requests'
            AND (qual ILIKE '%is_mapa_admin%' OR with_check ILIKE '%is_mapa_admin%')),
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'index_requests'
            AND (qual ILIKE '%is_mapa_admin%' OR with_check ILIKE '%is_mapa_admin%')) = 4 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 3, 'public.claude_budget',
         CASE WHEN to_regclass('public.claude_budget') IS NULL THEN 'table absente'
              ELSE 'RLS ' || CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.claude_budget')) THEN 'active' ELSE 'desactivee' END END,
         CASE WHEN to_regclass('public.claude_budget') IS NOT NULL
                   AND (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.claude_budget')) THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 4, 'regles admin claude_budget (3 attendues)',
         (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claude_budget'
            AND (qual ILIKE '%is_mapa_admin%' OR with_check ILIKE '%is_mapa_admin%')),
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claude_budget'
            AND (qual ILIKE '%is_mapa_admin%' OR with_check ILIKE '%is_mapa_admin%')) = 3 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 5, 'acces public (anon)',
         CASE WHEN has_table_privilege('anon', 'public.index_requests', 'SELECT') OR has_table_privilege('anon', 'public.index_requests', 'INSERT')
                OR has_table_privilege('anon', 'public.claude_budget', 'SELECT') OR has_table_privilege('anon', 'public.claude_budget', 'INSERT')
              THEN 'lecture ou ecriture possible' ELSE 'aucun' END,
         CASE WHEN has_table_privilege('anon', 'public.index_requests', 'SELECT') OR has_table_privilege('anon', 'public.index_requests', 'INSERT')
                OR has_table_privilege('anon', 'public.claude_budget', 'SELECT') OR has_table_privilege('anon', 'public.claude_budget', 'INSERT')
              THEN 'A VERIFIER' ELSE 'OK' END
  UNION ALL
  SELECT 6, 'budget mensuel (dollars)',
         COALESCE((SELECT monthly_usd::text FROM public.claude_budget WHERE id = 1), 'ligne absente'),
         CASE WHEN EXISTS (SELECT 1 FROM public.claude_budget WHERE id = 1) THEN 'OK' ELSE 'A VERIFIER' END
) r
ORDER BY ordre;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE (ne pas executer sauf decision) :
-- DROP TABLE IF EXISTS public.index_requests;
-- DROP TABLE IF EXISTS public.claude_budget;
-- ---------------------------------------------------------------------
