-- =====================================================================
-- 05 BLOC B : LA BASE EXIGE LA DOUBLE AUTHENTIFICATION (aal2)
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
-- A executer APRES 02_bloc_A.sql et 03_bloc_D.sql.
--
-- Effet : toute regle fondee sur public.is_mapa_admin() exige un compte de
-- la liste admin ET une session dont le jeton porte aal2. Un compte sans
-- second facteur verifie ne voit plus aucune donnee admin.
--
-- Compatibilite Passkey (regle A2) : le niveau est lu dans le jeton emis
-- par Supabase, jamais ailleurs. Si Supabase attribue aal2 a une
-- connexion par Passkey, l'admin s'ouvre ; s'il attribue aal1, la base
-- refuse tant que le code a 6 chiffres n'a pas ete saisi, exactement comme
-- le site (proxy.ts, lib/admin/admin-access.ts).
--
-- Securites integrees, dans la meme transaction :
--   1. prealable : chaque compte admin a au moins un second facteur
--      verifie, sinon RIEN n'est modifie ;
--   2. apres remplacement, la fonction est testee sur des jetons simules
--      (admin aal1, admin aal2, second admin aal2, compte hors liste,
--      jeton sans niveau) ; au moindre ecart, RIEN n'est conserve.
-- search_path reste fixe (sinon le remplacement annulerait le bloc D).
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau de controle. Rejouable sans erreur.
-- En cas de blocage d'acces : 05_bloc_C_secours.sql.
-- =====================================================================

DROP TABLE IF EXISTS pg_temp.bloc_b_controle;
CREATE TEMP TABLE bloc_b_controle (
  ordre int,
  controle text,
  attendu text,
  obtenu text
);

BEGIN;

-- 1. Prealable : second facteur verifie pour chaque compte admin.
DO $$
DECLARE
  manquants text;
BEGIN
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'mfa_factors'
        AND column_name IN ('user_id', 'status')) = 2 THEN
    EXECUTE $q$
      SELECT string_agg(a.email, ', ')
      FROM (VALUES ('admin@mapagroup.org'), ('j.brebion@mapagroup.org')) AS a(email)
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.mfa_factors f JOIN auth.users u ON u.id = f.user_id
        WHERE lower(u.email) = a.email AND f.status::text = 'verified'
      )
    $q$ INTO manquants;
    IF manquants IS NOT NULL THEN
      RAISE EXCEPTION 'Bloc B annule, rien n''a ete modifie : aucun second facteur verifie pour %', manquants;
    END IF;
    INSERT INTO bloc_b_controle VALUES (0, 'second facteur verifie pour les deux comptes admin', 'oui', 'oui');
  ELSE
    INSERT INTO bloc_b_controle VALUES (0, 'second facteur verifie pour les deux comptes admin', 'oui', 'non verifiable ici : voir Authentication, Users');
  END IF;
END $$;

-- 2. Nouvelle definition.
CREATE OR REPLACE FUNCTION public.is_mapa_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(auth.email(), '') = ANY (ARRAY['admin@mapagroup.org', 'j.brebion@mapagroup.org'])
     AND coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- 3. Test sur jetons simules ; un ecart annule tout le bloc.
DO $$
DECLARE
  c record;
  v boolean;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      (1, 'admin, mot de passe seul ou Passkey en aal1 : refuse', 'admin@mapagroup.org', 'aal1', false),
      (2, 'admin apres code a 6 chiffres, ou Passkey en aal2 : accepte', 'admin@mapagroup.org', 'aal2', true),
      (3, 'second admin en aal2 : accepte', 'j.brebion@mapagroup.org', 'aal2', true),
      (4, 'compte hors liste en aal2 : refuse', 'intrus@example.org', 'aal2', false),
      (5, 'jeton sans niveau : refuse', 'admin@mapagroup.org', NULL, false)
    ) AS t(ordre, cas, email, aal, attendu)
  LOOP
    PERFORM set_config('request.jwt.claim', '', true);
    PERFORM set_config('request.jwt.claim.email', c.email, true);
    PERFORM set_config('request.jwt.claims',
      json_strip_nulls(json_build_object('email', c.email, 'aal', c.aal, 'role', 'authenticated'))::text, true);
    v := public.is_mapa_admin();
    INSERT INTO bloc_b_controle VALUES (c.ordre, c.cas, c.attendu::text, coalesce(v::text, 'null'));
  END LOOP;
  PERFORM set_config('request.jwt.claim.email', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  IF EXISTS (SELECT 1 FROM bloc_b_controle WHERE ordre BETWEEN 1 AND 5 AND attendu <> obtenu) THEN
    RAISE EXCEPTION 'Bloc B annule, rien n''a ete modifie : is_mapa_admin ne se comporte pas comme attendu';
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- CONTROLE (seul tableau affiche)
-- ---------------------------------------------------------------------
SELECT controle::text, attendu::text, obtenu::text, resultat::text FROM (
  SELECT ordre, controle, attendu, obtenu,
         CASE WHEN attendu = obtenu THEN 'OK' ELSE 'A VERIFIER' END AS resultat
  FROM bloc_b_controle
  UNION ALL
  SELECT 6, 'definition : exige aal2', 'oui',
         CASE WHEN pg_get_functiondef(p.oid) ILIKE '%aal2%' THEN 'oui' ELSE 'non' END,
         CASE WHEN pg_get_functiondef(p.oid) ILIKE '%aal2%' THEN 'OK' ELSE 'A FAIRE' END
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.is_mapa_admin()')
  UNION ALL
  SELECT 7, 'definition : search_path fixe', 'public, pg_temp',
         coalesce(array_to_string(p.proconfig, ','), 'non fixe'),
         CASE WHEN array_to_string(p.proconfig, ',') ILIKE '%search_path=%public%pg_temp%' THEN 'OK' ELSE 'A FAIRE' END
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.is_mapa_admin()')
) t
ORDER BY ordre;
