# supabase/migrations — lire avant de faire confiance à ce dossier

Ce dossier **ne fait pas foi** sur l'état réel des droits Postgres (RLS,
GRANT/REVOKE). Un audit (2026-09-18) a prouvé que plusieurs policies
existent en base sans fichier de migration correspondant, et qu'au moins
5 tables (`leads`, `properties`, `property_images`, `reviews`,
`blog_posts`) n'ont aucun fichier de création ici — elles ont été posées
directement dans Supabase Studio ou via le SQL Editor, hors versioning.
**La base est la référence, pas ce dossier.**

Pour relever l'état réel (lecture seule, à exécuter dans le SQL Editor
Supabase, jamais depuis ce dépôt) :

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

## Allowlist admin — deux sources à garder synchronisées

La liste des adresses admin existe à **deux endroits distincts**, qui
doivent toujours contenir les mêmes adresses :

- `lib/admin/admin-emails.ts` (source pour le code applicatif Next.js —
  `requireAdmin`/`requireAdminPage`/`requireAdminRoute`, `sales-auth.ts`).
- la fonction SQL `public.is_mapa_admin()` (source pour les policies RLS
  Postgres — cf. `20260918_rls_admin_allowlist.sql`).

Ajouter ou retirer un admin nécessite de modifier les **deux**, sinon
l'application et la base divergent de nouveau sur qui est admin.
