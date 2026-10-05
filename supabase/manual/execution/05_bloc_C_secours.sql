-- =====================================================================
-- 05 BLOC C (SECOURS) : RETOUR ARRIERE DU BLOC B
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- A N'UTILISER QU'EN CAS DE BLOCAGE apres 05_bloc_B.sql : par exemple, un
-- admin connecte avec son code a 6 chiffres voit des listes vides ou des
-- erreurs d'enregistrement dans l'administration.
--
-- INSTRUCTION DE SECOURS :
--   1. Ouvrir le tableau de bord Supabase, menu SQL Editor, New query.
--   2. Coller ce fichier ENTIER, puis Run.
--   3. Le tableau affiche doit montrer OK sur chaque ligne.
--   4. Se deconnecter de l'administration puis se reconnecter.
-- La connexion au site exige toujours le second facteur (proxy.ts) : ce
-- retour arriere ne retire que l'exigence ajoutee cote base.
--
-- Effet : is_mapa_admin() revient a la seule liste des deux adresses
-- admin, sans condition de niveau aal. search_path reste fixe (bloc D).
-- Rejouable sans erreur. Resultat : UN seul tableau de controle.
-- =====================================================================

DROP TABLE IF EXISTS pg_temp.bloc_c_controle;
CREATE TEMP TABLE bloc_c_controle (
  ordre int,
  controle text,
  attendu text,
  obtenu text
);

BEGIN;

CREATE OR REPLACE FUNCTION public.is_mapa_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(auth.email(), '') = ANY (ARRAY['admin@mapagroup.org', 'j.brebion@mapagroup.org'])
$$;

DO $$
DECLARE
  c record;
  v boolean;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      (1, 'admin en aal1 : accepte (comme avant le bloc B)', 'admin@mapagroup.org', 'aal1', true),
      (2, 'admin en aal2 : accepte', 'admin@mapagroup.org', 'aal2', true),
      (3, 'compte hors liste : refuse', 'intrus@example.org', 'aal2', false)
    ) AS t(ordre, cas, email, aal, attendu)
  LOOP
    PERFORM set_config('request.jwt.claim', '', true);
    PERFORM set_config('request.jwt.claim.email', c.email, true);
    PERFORM set_config('request.jwt.claims',
      json_build_object('email', c.email, 'aal', c.aal, 'role', 'authenticated')::text, true);
    v := public.is_mapa_admin();
    INSERT INTO bloc_c_controle VALUES (c.ordre, c.cas, c.attendu::text, coalesce(v::text, 'null'));
  END LOOP;
  PERFORM set_config('request.jwt.claim.email', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  IF EXISTS (SELECT 1 FROM bloc_c_controle WHERE attendu <> obtenu) THEN
    RAISE EXCEPTION 'Retour arriere annule : is_mapa_admin ne se comporte pas comme attendu';
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
SELECT controle::text, attendu::text, obtenu::text, resultat::text FROM (
  SELECT ordre, controle, attendu, obtenu,
         CASE WHEN attendu = obtenu THEN 'OK' ELSE 'A VERIFIER' END AS resultat
  FROM bloc_c_controle
  UNION ALL
  SELECT 4, 'definition : n''exige plus aal2', 'oui',
         CASE WHEN pg_get_functiondef(p.oid) ILIKE '%aal2%' THEN 'non' ELSE 'oui' END,
         CASE WHEN pg_get_functiondef(p.oid) ILIKE '%aal2%' THEN 'A VERIFIER' ELSE 'OK' END
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.is_mapa_admin()')
) t
ORDER BY ordre;
