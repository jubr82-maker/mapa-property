-- =====================================================================
-- 22 SAUVEGARDE QUOTIDIENNE : CATALOGUE DU SCHEMA PUBLIC
-- MAPA Property, prepare le 2026-10-07. CREE une fonction en lecture
-- seule ; ne modifie AUCUNE table ni donnee.
--
-- public.mapa_backup_catalog() renvoie, en JSON, la structure de toutes les
-- tables du schema public : colonnes (type, valeur par defaut, NOT NULL,
-- identite), cle primaire, contraintes, index, regles d'acces (RLS) et
-- valeurs des sequences. La sauvegarde nocturne (/api/cron/backup) la lit
-- pour que chaque fichier soit restaurable sans le depot de code.
-- Execution reservee a la cle de service (service_role) : ni anon ni
-- utilisateur connecte. SECURITY DEFINER avec search_path fixe.
-- Non couverts (a recreer depuis supabase/ si besoin) : fonctions,
-- declencheurs, vues, extensions.
-- Rejouable : CREATE OR REPLACE.
-- Retour arriere : DROP FUNCTION public.mapa_backup_catalog();
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.mapa_backup_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'tables', coalesce((
      SELECT jsonb_agg(t ORDER BY t->>'name')
      FROM (
        SELECT jsonb_build_object(
          'name', c.relname,
          'rls', c.relrowsecurity,
          'columns', (
            SELECT jsonb_agg(jsonb_build_object(
              'name', a.attname,
              'type', format_type(a.atttypid, a.atttypmod),
              'not_null', a.attnotnull,
              'default', pg_get_expr(d.adbin, d.adrelid),
              'identity', nullif(a.attidentity::text, '')
            ) ORDER BY a.attnum)
            FROM pg_attribute a
            LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
            WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
          ),
          'primary_key', (
            SELECT jsonb_agg(a.attname ORDER BY array_position(i.indkey::int[], a.attnum::int))
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = c.oid AND i.indisprimary
          ),
          'constraints', coalesce((
            SELECT jsonb_agg(jsonb_build_object('name', co.conname, 'type', co.contype, 'def', pg_get_constraintdef(co.oid)) ORDER BY co.contype, co.conname)
            FROM pg_constraint co WHERE co.conrelid = c.oid
          ), '[]'::jsonb),
          'indexes', coalesce((
            SELECT jsonb_agg(pg_get_indexdef(i.indexrelid))
            FROM pg_index i
            WHERE i.indrelid = c.oid AND NOT i.indisprimary
              AND NOT EXISTS (SELECT 1 FROM pg_constraint co WHERE co.conindid = i.indexrelid)
          ), '[]'::jsonb),
          'policies', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
              'name', p.policyname, 'permissive', p.permissive, 'cmd', p.cmd,
              'roles', p.roles, 'using', p.qual, 'check', p.with_check
            ))
            FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname
          ), '[]'::jsonb)
        ) AS t
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ) s
    ), '[]'::jsonb),
    'sequences', coalesce((
      SELECT jsonb_agg(jsonb_build_object('name', s.sequencename, 'last_value', s.last_value))
      FROM pg_sequences s WHERE s.schemaname = 'public'
    ), '[]'::jsonb),
    'generated_at', now()
  );
$$;

REVOKE ALL ON FUNCTION public.mapa_backup_catalog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mapa_backup_catalog() TO service_role;

SELECT 'fonction mapa_backup_catalog'::text AS controle,
       CASE WHEN to_regprocedure('public.mapa_backup_catalog()') IS NOT NULL THEN 'presente' ELSE 'absente' END::text AS etat
UNION ALL
SELECT 'appel possible par anon',
       CASE WHEN has_function_privilege('anon', 'public.mapa_backup_catalog()', 'EXECUTE') THEN 'OUI (A CORRIGER)' ELSE 'non' END
UNION ALL
SELECT 'tables du schema public couvertes',
       (SELECT count(*)::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p'));
