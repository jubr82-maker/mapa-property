-- =====================================================================
-- 01 AUDIT DES REGLES D'ACCES : LECTURE SEULE, NE MODIFIE RIEN
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
--
-- Mode d'emploi : coller ce fichier ENTIER dans l'editeur SQL Supabase,
-- puis Run. Resultat : UN seul tableau (categorie, objet, detail,
-- gravite), cas dangereux en tete. Rejouable a volonte.
--
-- Gravite : 1 critique, 2 haute, 3 moyenne, 4 info, 5 inventaire.
-- Les insertions publiques voulues (formulaires du site) apparaissent en
-- 4 info quand la regle est en INSERT seul.
-- Aucune table n'est lue sans verification prealable de son existence.
-- =====================================================================

WITH
tables_public AS (
  SELECT c.oid, c.relname, c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
pol AS (
  SELECT schemaname, tablename, policyname, cmd, roles,
         array_to_string(roles, ',') AS roles_txt,
         coalesce(qual, '') AS cond,
         coalesce(with_check, '') AS verif
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
),
fonctions AS (
  SELECT p.oid, p.proname, p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), '') AS config,
         pg_get_functiondef(p.oid) AS def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
),
vues AS (
  SELECT c.oid, c.relname,
         coalesce(c.reloptions::text, '') ILIKE '%security_invoker=true%' AS invoker
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'v'
),
conservation (tbl, col, delai) AS (
  VALUES ('admin_auth_log', 'created_at', '12 months'),
         ('property_views', 'viewed_at', '13 months'),
         ('tracking_events', 'created_at', '13 months'),
         ('chatbot_logs', 'created_at', '6 months')
),
conservation_presente AS (
  SELECT k.tbl, k.col, k.delai
  FROM conservation k
  WHERE EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = k.tbl AND ic.column_name = k.col
  )
),
mfa_disponible AS (
  SELECT count(*) = 3 AS ok
  FROM information_schema.columns
  WHERE table_schema = 'auth' AND table_name = 'mfa_factors' AND column_name IN ('user_id', 'status', 'factor_type')
),
admins (email) AS (
  VALUES ('admin@mapagroup.org'), ('j.brebion@mapagroup.org')
),
lignes AS (
  -- 1. Tables sans RLS
  SELECT 'table sans RLS' AS categorie,
         'public.' || t.relname AS objet,
         'RLS desactivee : acces direct par l''API publique selon les droits accordes' AS detail,
         '1 critique' AS gravite
  FROM tables_public t
  WHERE NOT t.relrowsecurity

  UNION ALL
  -- 2. Regles d'ecriture avec condition true
  SELECT 'regle ecriture ouverte',
         p.schemaname || '.' || p.tablename || ' / ' || p.policyname,
         p.cmd || ' pour ' || p.roles_txt || ', condition : ' || p.cond || ', verification : ' || p.verif,
         CASE WHEN p.cmd = 'INSERT' THEN '4 info' ELSE '1 critique' END
  FROM pol p
  WHERE p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    AND (lower(trim(p.cond)) = 'true' OR lower(trim(p.verif)) = 'true')

  UNION ALL
  -- 3. Regles d'ecriture sans is_mapa_admin
  SELECT 'regle ecriture sans is_mapa_admin',
         p.schemaname || '.' || p.tablename || ' / ' || p.policyname,
         p.cmd || ' pour ' || p.roles_txt || ', condition : ' || p.cond || ', verification : ' || p.verif,
         '2 haute'
  FROM pol p
  WHERE p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    AND (p.roles && ARRAY['anon', 'authenticated', 'public']::name[])
    AND (p.cond || ' ' || p.verif) NOT ILIKE '%is_mapa_admin%'
    AND lower(trim(p.cond)) <> 'true' AND lower(trim(p.verif)) <> 'true'

  UNION ALL
  -- 4. Droits anon / authenticated sur les tables sans RLS
  SELECT 'droits sur table sans RLS',
         'public.' || g.table_name || ' / ' || g.grantee,
         string_agg(g.privilege_type, ',' ORDER BY g.privilege_type),
         '1 critique'
  FROM information_schema.role_table_grants g
  JOIN tables_public t ON t.relname = g.table_name
  WHERE g.table_schema = 'public' AND g.grantee IN ('anon', 'authenticated') AND NOT t.relrowsecurity
  GROUP BY g.table_name, g.grantee

  UNION ALL
  -- 5. Fonction is_mapa_admin
  SELECT 'fonction is_mapa_admin',
         'public.is_mapa_admin()',
         CASE WHEN f.oid IS NULL THEN 'absente'
              ELSE 'exige aal2 : ' || CASE WHEN f.def ILIKE '%aal2%' THEN 'oui' ELSE 'non' END
                   || ', search_path : ' || CASE WHEN f.config ILIKE '%search_path%' THEN f.config ELSE 'non fixe' END
                   || ', security definer : ' || CASE WHEN f.prosecdef THEN 'oui' ELSE 'non' END
         END,
         CASE WHEN f.oid IS NULL THEN '1 critique'
              WHEN f.def NOT ILIKE '%aal2%' THEN '2 haute'
              WHEN f.config NOT ILIKE '%search_path%' THEN '3 moyenne'
              ELSE '4 info' END
  FROM (SELECT 1) x
  LEFT JOIN fonctions f ON f.proname = 'is_mapa_admin'

  UNION ALL
  -- 6. Autres fonctions sans search_path fixe
  SELECT 'fonction sans search_path',
         'public.' || f.proname,
         CASE WHEN f.prosecdef THEN 'SECURITY DEFINER sans search_path fixe' ELSE 'search_path non fixe (bloc D)' END,
         CASE WHEN f.prosecdef THEN '2 haute' ELSE '3 moyenne' END
  FROM fonctions f
  WHERE f.proname <> 'is_mapa_admin' AND f.config NOT ILIKE '%search_path%'

  UNION ALL
  -- 7. Vues
  SELECT 'vue',
         'public.' || v.relname,
         'security_invoker : ' || CASE WHEN v.invoker THEN 'oui' ELSE 'non' END
         || ', lisible par anon : ' || CASE WHEN has_table_privilege('anon', v.oid, 'SELECT') THEN 'oui' ELSE 'non' END,
         CASE WHEN NOT v.invoker AND has_table_privilege('anon', v.oid, 'SELECT') THEN '3 moyenne' ELSE '4 info' END
  FROM vues v

  UNION ALL
  -- 8. Buckets de stockage
  SELECT 'bucket',
         b.id,
         CASE WHEN b.public THEN 'lecture publique' ELSE 'prive' END,
         '4 info'
  FROM storage.buckets b

  UNION ALL
  -- 9. Double authentification des comptes admin (prealable du bloc B)
  SELECT 'double authentification',
         a.email,
         CASE WHEN NOT m.ok THEN 'table auth.mfa_factors non lisible : verifier dans Authentication, Users'
              ELSE coalesce((xpath('/row/n/text()', query_to_xml(format(
                     'SELECT count(*) AS n FROM auth.mfa_factors f JOIN auth.users u ON u.id = f.user_id WHERE lower(u.email) = %L AND f.status = %L',
                     a.email, 'verified'), false, true, '')))[1]::text, '0') || ' facteur(s) verifie(s)'
         END,
         '4 info'
  FROM admins a CROSS JOIN mfa_disponible m

  UNION ALL
  -- 10. Apercu du bloc F : lignes qui seraient supprimees
  SELECT 'conservation (apercu bloc F)',
         'public.' || k.tbl || ' (' || k.col || ', ' || k.delai || ')',
         (xpath('/row/n/text()', query_to_xml(format(
            'SELECT count(*) AS n FROM public.%I WHERE %I < now() - %L::interval', k.tbl, k.col, k.delai), false, true, '')))[1]::text
         || ' ligne(s) seraient supprimees, sur '
         || (xpath('/row/n/text()', query_to_xml(format(
            'SELECT count(*) AS n FROM public.%I', k.tbl), false, true, '')))[1]::text,
         '4 info'
  FROM conservation_presente k

  UNION ALL
  SELECT 'conservation (apercu bloc F)',
         'public.' || k.tbl || ' (' || k.col || ')',
         'table ou colonne absente : rien a supprimer',
         '4 info'
  FROM conservation k
  WHERE NOT EXISTS (SELECT 1 FROM conservation_presente p WHERE p.tbl = k.tbl)

  UNION ALL
  -- 11. Inventaire complet des tables
  SELECT 'inventaire table',
         'public.' || t.relname,
         'RLS ' || CASE WHEN t.relrowsecurity THEN 'active' ELSE 'desactivee' END,
         '5 inventaire'
  FROM tables_public t

  UNION ALL
  -- 12. Inventaire complet des regles
  SELECT 'inventaire regle',
         p.schemaname || '.' || p.tablename || ' / ' || p.policyname,
         p.cmd || ' pour ' || p.roles_txt || ', condition : ' || p.cond || ', verification : ' || p.verif,
         '5 inventaire'
  FROM pol p
)
SELECT categorie::text, objet::text, detail::text, gravite::text
FROM lignes
ORDER BY gravite, categorie, objet;
