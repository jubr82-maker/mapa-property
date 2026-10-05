-- =====================================================================
-- AUDIT DES REGLES D'ACCES (RLS) : LECTURE SEULE
-- MAPA Property, prepare le 2026-10-05. A executer dans l'editeur SQL
-- Supabase. Ne modifie RIEN. Chaque requete est independante.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. CAS DANGEREUX, PAR ORDRE DE GRAVITE (a lire en premier)
--    gravite 1 : table du schema public sans RLS (lisible et modifiable
--                par l'API publique selon les droits accordes)
--    gravite 2 : regle d'ecriture dont la condition ou la verification
--                vaut true
--    gravite 3 : regle d'ecriture ouverte a anon, authenticated ou public
--                sans is_mapa_admin() (ex. auth.role() = 'authenticated')
--    Les insertions publiques voulues (formulaires du site : estimations,
--    demandes off-market, NDA, liste d'attente, statistiques) apparaissent
--    en gravite 2 : elles sont normales SI la regle est en INSERT seul.
-- ---------------------------------------------------------------------
WITH tables AS (
  SELECT c.oid, n.nspname AS schema_name, c.relname AS table_name,
         c.relrowsecurity AS rls_active, c.relforcerowsecurity AS rls_forcee
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p') AND n.nspname = 'public'
),
policies AS (
  SELECT schemaname, tablename, policyname, permissive, roles, cmd,
         coalesce(qual, '') AS condition, coalesce(with_check, '') AS verification
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
)
SELECT 1 AS gravite, 'TABLE SANS RLS' AS probleme, t.schema_name || '.' || t.table_name AS objet,
       NULL::text AS regle, NULL::text AS operation, NULL::text AS roles,
       NULL::text AS condition, NULL::text AS verification
FROM tables t
WHERE NOT t.rls_active
UNION ALL
SELECT 2, 'ECRITURE AVEC CONDITION true', p.schemaname || '.' || p.tablename, p.policyname, p.cmd,
       array_to_string(p.roles, ','), p.condition, p.verification
FROM policies p
WHERE p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND (lower(trim(p.condition)) = 'true' OR lower(trim(p.verification)) = 'true')
UNION ALL
SELECT 3, 'ECRITURE SANS is_mapa_admin', p.schemaname || '.' || p.tablename, p.policyname, p.cmd,
       array_to_string(p.roles, ','), p.condition, p.verification
FROM policies p
WHERE p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND (p.roles && ARRAY['anon', 'authenticated', 'public']::name[])
  AND (p.condition || ' ' || p.verification) NOT ILIKE '%is_mapa_admin%'
  AND lower(trim(p.condition)) <> 'true' AND lower(trim(p.verification)) <> 'true'
ORDER BY 1, 3, 4;


-- ---------------------------------------------------------------------
-- 2. INVENTAIRE COMPLET : toutes les tables du schema public, RLS active
--    ou non, et chaque regle (role, operation, condition, verification).
-- ---------------------------------------------------------------------
SELECT n.nspname || '.' || c.relname AS table_name,
       c.relrowsecurity AS rls_active,
       p.policyname AS regle,
       p.cmd AS operation,
       array_to_string(p.roles, ',') AS roles,
       p.qual AS condition,
       p.with_check AS verification
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE c.relkind IN ('r', 'p') AND n.nspname = 'public'
ORDER BY 1, 3;


-- ---------------------------------------------------------------------
-- 3. STOCKAGE (storage.objects) : regles par bucket. Attendu : ecriture
--    reservee a is_mapa_admin() pour documents, offmarket-photos et
--    property-images.
-- ---------------------------------------------------------------------
SELECT policyname AS regle, cmd AS operation, array_to_string(roles, ',') AS roles,
       qual AS condition, with_check AS verification
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY 1;

SELECT id AS bucket, public AS lecture_publique FROM storage.buckets ORDER BY 1;


-- ---------------------------------------------------------------------
-- 4. FONCTION is_mapa_admin : definition exacte. Attendu apres correction
--    (fichier 20261005_correction_regles_acces.sql, bloc B) : liste des
--    deux adresses ET niveau d'assurance aal2 (double authentification).
-- ---------------------------------------------------------------------
SELECT p.oid::regprocedure AS fonction,
       p.prosecdef AS security_definer,
       p.provolatile AS volatilite,
       pg_get_functiondef(p.oid) AS definition,
       pg_get_functiondef(p.oid) ILIKE '%aal2%' AS exige_double_authentification
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'is_mapa_admin';


-- ---------------------------------------------------------------------
-- 5. DROITS ACCORDES A anon ET authenticated sur les tables SANS RLS
--    (un droit + pas de RLS = acces direct par l'API publique).
-- ---------------------------------------------------------------------
SELECT g.table_name, g.grantee, string_agg(g.privilege_type, ',' ORDER BY g.privilege_type) AS droits
FROM information_schema.role_table_grants g
JOIN pg_class c ON c.relname = g.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = g.table_schema
WHERE g.table_schema = 'public'
  AND g.grantee IN ('anon', 'authenticated')
  AND c.relkind IN ('r', 'p')
  AND NOT c.relrowsecurity
GROUP BY g.table_name, g.grantee
ORDER BY 1, 2;


-- ---------------------------------------------------------------------
-- 6. VUES DU SCHEMA public : une vue sans security_invoker s'execute avec
--    les droits de son proprietaire et contourne la RLS des tables lues.
--    Verifier que chaque vue exposee filtre elle-meme ce qui est public.
-- ---------------------------------------------------------------------
SELECT c.relname AS vue,
       pg_get_userbyid(c.relowner) AS proprietaire,
       coalesce(c.reloptions::text, '') ILIKE '%security_invoker=true%' AS security_invoker,
       has_table_privilege('anon', c.oid, 'SELECT') AS lisible_par_anon
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' AND n.nspname = 'public'
ORDER BY 1;
