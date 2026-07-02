-- MAPA Property — Sécurisation off-market, ÉTAPE 3/3 : couper l'accès anon
-- à la TABLE BRUTE properties_offmarket. 1er juillet 2026.
--
-- OBJECTIF : l'anon ne doit plus pouvoir lire la table brute (fuite de
-- city_real, internal_notes, internal_ref, signed_mandate_url, etc.). Il ne
-- lit plus QUE la VIEW redactée properties_offmarket_public.
--
-- Décision Julien : Vision B (teaser public redacté conservé) -> AUCUN filtre
-- is_strict_offmarket ajouté, comportement des biens strict INCHANGÉ. On ne
-- fait que fermer la fuite anon sur la table de base.
--
-- PRÉ-REQUIS (déjà faits) :
--   - Étape 1 : VIEW properties_offmarket_public étendue (appliquée).
--   - Étape 2 : lib/data.ts repointé sur la VIEW (aucun code public ne lit la
--     table brute ; seul l'admin authentifié la lit via offmarket_admin_all).
--
-- ============================================================================
-- POINT CRITIQUE — pourquoi la VIEW continue de fonctionner pour l'anon
-- ============================================================================
-- Une VIEW Postgres créée sans option (cas ici) a security_invoker = FALSE
-- (SECURITY DEFINER) : elle s'exécute avec les droits de son PROPRIÉTAIRE
-- (postgres/supabase_admin, propriétaire de la table qui BYPASSE la RLS ;
-- la table n'a que ENABLE ROW LEVEL SECURITY, pas FORCE). La VIEW lit donc
-- la table de base côté propriétaire, PAS côté anon. Conséquence :
--   - retirer le SELECT anon sur la table de base NE CASSE PAS la VIEW ;
--   - l'anon lit la VIEW (privilège table-level GRANT SELECT sur la vue) et
--     obtient les lignes publiées redactées ;
--   - l'anon NE PEUT PLUS lire la table de base (RLS : plus de policy anon).
-- On fige explicitement security_invoker=false ci-dessous pour lever tout
-- doute (idempotent si déjà le défaut).
--
-- ----------------------------------------------------------------------------
-- CONTRÔLE À LANCER AVANT (état de départ) :
--   -- Policies actuelles de la table (attendu : offmarket_public_read +
--   -- offmarket_admin_all, + repérer une éventuelle policy hors-repo) :
--   SELECT policyname, cmd, roles, qual
--     FROM pg_policies WHERE schemaname='public' AND tablename='properties_offmarket';
--   -- security_invoker de la vue (attendu : NULL/absent ou security_invoker=false) :
--   SELECT relname, reloptions FROM pg_class WHERE relname='properties_offmarket_public';
-- ============================================================================
--
-- A APPLIQUER MANUELLEMENT dans Supabase Studio (SQL Editor).

-- 1. Figer la VIEW en SECURITY DEFINER (bypass RLS de la table de base).
--    Intentionnel : la VIEW EST la frontière de redaction publique. Le linter
--    Supabase peut avertir « security definer view » — c'est voulu ici.
ALTER VIEW public.properties_offmarket_public SET (security_invoker = false);

-- 2. Garantir la lecture publique de la VIEW (privilège table-level, idempotent).
GRANT SELECT ON public.properties_offmarket_public TO anon, authenticated;

-- 3. COUPER l'accès anon à la table BRUTE : retirer la policy de lecture
--    publique. offmarket_admin_all (FOR ALL, authenticated) reste intacte,
--    donc l'admin off-market (lecture/écriture) n'est PAS impacté.
DROP POLICY IF EXISTS "offmarket_public_read" ON public.properties_offmarket;

-- 4. Défense en profondeur : révoquer aussi le privilège SELECT anon sur la
--    table brute. La VIEW (definer) n'en a PAS besoin, donc le public n'est
--    pas cassé ; l'admin (rôle authenticated) conserve son accès.
--    (Optionnel — la seule étape 3 suffit déjà : RLS activée + plus de policy
--    anon = 0 ligne pour anon. Retirer cette ligne si tu préfères minimal.)
REVOKE SELECT ON public.properties_offmarket FROM anon;

-- ============================================================================
-- VÉRIFICATIONS POST-MIGRATION
-- ============================================================================
-- A) Policies restantes (attendu : offmarket_admin_all seule ; plus de
--    offmarket_public_read) :
--   SELECT policyname, cmd, roles FROM pg_policies
--     WHERE schemaname='public' AND tablename='properties_offmarket';
--
-- B) La VIEW est bien en definer :
--   SELECT relname, reloptions FROM pg_class WHERE relname='properties_offmarket_public';
--   -> doit contenir security_invoker=false.
--
-- C) anon NE PEUT PLUS lire la table brute (à exécuter avec la clé anon, ou
--    via curl REST) — doit renvoyer 0 ligne / permission denied :
--   -- SQL (rôle anon) :  SELECT city_real FROM public.properties_offmarket;
--   -- REST : curl "$URL/rest/v1/properties_offmarket?select=city_real,internal_notes" \
--   --          -H "apikey: <ANON_KEY>"   ->  [] (vide)
--
-- D) anon PEUT toujours lire la VIEW (2 biens teaser redactés) :
--   -- REST : curl "$URL/rest/v1/properties_offmarket_public?select=id,city_anonymized" \
--   --          -H "apikey: <ANON_KEY>"   ->  2 lignes, city_anonymized redacté
--
-- E) Puis tester le site : /fr|/en|/de/off-market (liste) + une fiche détail
--    doivent s'afficher normalement (titre, description, prix, ville
--    « Confidentiel », pas de photo). Admin /admin/offmarket inchangé.
