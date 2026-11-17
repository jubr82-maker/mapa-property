-- =====================================================================
-- 42 RAPPELS CLAUDE (expiration de la cle API et des credits)
-- MAPA Property, prepare le 2026-11-17. NON EXECUTE par Claude.
--
-- Cree (si absente) :
--   public.claude_reminders  reglage unique (ligne 1) :
--     api_key_expires_on  date d'expiration de la cle API "site-traduction"
--                         (31/12/2027 par defaut, modifiable dans la carte
--                         "Consommation Claude"). SEULE LA DATE est gardee :
--                         la cle elle-meme n'est jamais stockee.
--     sent                paliers d'e-mail deja envoyes (J-60, J-15, jour J),
--                         pour ne jamais envoyer deux fois le meme rappel
-- La date d'achat du credit est deja gardee par public.claude_credit
-- (colonne loaded_on, SQL 40) : expiration = date d'achat + 1 an, calculee
-- par le site. Rien a ajouter pour le credit.
-- Acces : RLS active, rien pour le public (anon), lecture et ecriture
-- reservees a public.is_mapa_admin() ; la tache quotidienne passe par la
-- cle service_role. Meme modele que le fichier 40.
-- Tant que ce fichier n'est pas execute : la cle est consideree valable
-- jusqu'au 31/12/2027, les bandeaux s'affichent, aucun e-mail ne part.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle, chaque ligne a OK.
-- Rejouable sans erreur. Retour arriere : en fin de fichier, en commentaire.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.claude_reminders (
  id                 SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key_expires_on DATE NOT NULL DEFAULT DATE '2027-12-31',
  sent               JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.claude_reminders (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.claude_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.claude_reminders FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.claude_reminders TO authenticated;

DROP POLICY IF EXISTS claude_reminders_admin_read ON public.claude_reminders;
DROP POLICY IF EXISTS claude_reminders_admin_write ON public.claude_reminders;
DROP POLICY IF EXISTS claude_reminders_admin_update ON public.claude_reminders;

DO $$
BEGIN
  IF to_regprocedure('public.is_mapa_admin()') IS NOT NULL THEN
    CREATE POLICY claude_reminders_admin_read ON public.claude_reminders FOR SELECT TO authenticated USING (public.is_mapa_admin());
    CREATE POLICY claude_reminders_admin_write ON public.claude_reminders FOR INSERT TO authenticated WITH CHECK (public.is_mapa_admin());
    CREATE POLICY claude_reminders_admin_update ON public.claude_reminders FOR UPDATE TO authenticated USING (public.is_mapa_admin()) WITH CHECK (public.is_mapa_admin());
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche) : chaque ligne doit afficher OK
-- ---------------------------------------------------------------------
SELECT objet, constate, resultat FROM (
  SELECT 1 AS ordre, 'public.claude_reminders' AS objet,
         CASE WHEN to_regclass('public.claude_reminders') IS NULL THEN 'table absente'
              ELSE 'RLS ' || CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.claude_reminders')) THEN 'active' ELSE 'desactivee' END END AS constate,
         CASE WHEN to_regclass('public.claude_reminders') IS NOT NULL
                   AND (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.claude_reminders')) THEN 'OK' ELSE 'A VERIFIER' END AS resultat
  UNION ALL
  SELECT 2, 'regles admin (3 attendues)',
         (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claude_reminders'
            AND (qual ILIKE '%is_mapa_admin%' OR with_check ILIKE '%is_mapa_admin%')),
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claude_reminders'
            AND (qual ILIKE '%is_mapa_admin%' OR with_check ILIKE '%is_mapa_admin%')) = 3 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 3, 'acces public (anon)',
         CASE WHEN has_table_privilege('anon', 'public.claude_reminders', 'SELECT') OR has_table_privilege('anon', 'public.claude_reminders', 'INSERT') THEN 'lecture ou ecriture possible' ELSE 'aucun' END,
         CASE WHEN has_table_privilege('anon', 'public.claude_reminders', 'SELECT') OR has_table_privilege('anon', 'public.claude_reminders', 'INSERT') THEN 'A VERIFIER' ELSE 'OK' END
  UNION ALL
  SELECT 4, 'date d''expiration de la cle',
         COALESCE((SELECT api_key_expires_on::text FROM public.claude_reminders WHERE id = 1), 'ligne absente'),
         CASE WHEN EXISTS (SELECT 1 FROM public.claude_reminders WHERE id = 1) THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 5, 'public.claude_credit (date d''achat du credit, SQL 40)',
         CASE WHEN to_regclass('public.claude_credit') IS NULL THEN 'table absente : executer d''abord le SQL 40' ELSE 'presente' END,
         CASE WHEN to_regclass('public.claude_credit') IS NULL THEN 'A VERIFIER' ELSE 'OK' END
) r
ORDER BY ordre;

-- ---------------------------------------------------------------------
-- RETOUR ARRIERE (ne pas executer sauf decision) :
-- DROP TABLE IF EXISTS public.claude_reminders;
-- ---------------------------------------------------------------------
