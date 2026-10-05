-- =====================================================================
-- AUDIT DE SECURITE COMPLET : CORRECTIONS BASE ET STOCKAGE
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
-- A executer par Julien dans l'editeur SQL Supabase, BLOC PAR BLOC,
-- chaque bloc suivi de sa verification. Chaque bloc a son retour arriere.
--
-- Ordre recommande :
--   0. 20261005_audit_regles_acces.sql (lecture seule) : garder le resultat
--   1. 20261005_correction_regles_acces.sql BLOC A (deja prepare)
--   2. ce fichier, BLOC D (search_path)
--   3. 20261005_correction_regles_acces.sql BLOC B, APRES l'inscription de
--      la double authentification par les deux comptes admin
--   4. ce fichier, BLOCS E et F : UNIQUEMENT apres accord explicite
--      (effets fonctionnels decrits dans chaque bloc)
-- =====================================================================


-- =====================================================================
-- BLOC D : search_path fixe sur les 8 fonctions du depot
-- OWASP ASVS 14.2 (configuration sure des composants), alerte
-- "function_search_path_mutable" du linter Supabase.
-- Risque fonctionnel : nul. Les fonctions lisent public et auth (noms
-- qualifies ou schema public) ; pg_catalog reste toujours accessible.
-- =====================================================================

BEGIN;
ALTER FUNCTION public.bump_offmarket_requests_count()          SET search_path = public, pg_temp;
ALTER FUNCTION public.estimation_requests_touch_updated_at()   SET search_path = public, pg_temp;
ALTER FUNCTION public.is_mapa_admin()                          SET search_path = public, pg_temp;
ALTER FUNCTION public.lu_market_prices_touch_updated_at()      SET search_path = public, pg_temp;
ALTER FUNCTION public.mapa_historical_sales_touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at()                         SET search_path = public, pg_temp;
ALTER FUNCTION public.site_content_touch_updated_at()          SET search_path = public, pg_temp;
ALTER FUNCTION public.site_design_tokens_touch_updated_at()    SET search_path = public, pg_temp;
COMMIT;

-- Verification : 8 lignes, chacune avec search_path=public, pg_temp.
SELECT p.proname, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
  'bump_offmarket_requests_count', 'estimation_requests_touch_updated_at',
  'is_mapa_admin', 'lu_market_prices_touch_updated_at',
  'mapa_historical_sales_touch_updated_at', 'set_updated_at',
  'site_content_touch_updated_at', 'site_design_tokens_touch_updated_at')
ORDER BY 1;

-- RETOUR ARRIERE DU BLOC D
-- BEGIN;
-- ALTER FUNCTION public.bump_offmarket_requests_count()          RESET search_path;
-- ALTER FUNCTION public.estimation_requests_touch_updated_at()   RESET search_path;
-- ALTER FUNCTION public.is_mapa_admin()                          RESET search_path;
-- ALTER FUNCTION public.lu_market_prices_touch_updated_at()      RESET search_path;
-- ALTER FUNCTION public.mapa_historical_sales_touch_updated_at() RESET search_path;
-- ALTER FUNCTION public.set_updated_at()                         RESET search_path;
-- ALTER FUNCTION public.site_content_touch_updated_at()          RESET search_path;
-- ALTER FUNCTION public.site_design_tokens_touch_updated_at()    RESET search_path;
-- COMMIT;


-- =====================================================================
-- BLOC E : bucket "documents" en lecture privee. ACCORD REQUIS.
-- OWASP ASVS 12.4.1 (fichiers non publics servis avec controle d'acces).
-- Aujourd'hui : tout document admin est lisible par quiconque connait son
-- URL publique (lib/admin/documents.ts construit getPublicUrl).
-- RISQUE : les liens existants vers ces documents cessent de fonctionner
-- (e-mails deja envoyes, favoris). Le code doit d'abord passer aux URL
-- signees (lib/storage-signed-url.ts existe deja pour offmarket-photos),
-- ce qui n'est PAS fait dans ce commit. Ne pas executer avant.
-- =====================================================================

-- UPDATE storage.buckets SET public = false WHERE id = 'documents';
-- Verification :
-- SELECT id, public FROM storage.buckets WHERE id = 'documents';

-- RETOUR ARRIERE DU BLOC E
-- UPDATE storage.buckets SET public = true WHERE id = 'documents';


-- =====================================================================
-- BLOC F : duree de conservation des donnees personnelles. ACCORD REQUIS.
-- OWASP ASVS 8.3.4 et RGPD art. 5.1.e (limitation de la conservation).
-- Durees PROPOSEES, a valider par Julien (aucune n'est imposee par le code) :
--   journal des connexions admin  : 12 mois
--   statistiques de visite        : 13 mois (recommandation CNIL)
--   journaux du chatbot           : 6 mois
-- Les prospects (leads, estimations, mandats, demandes off-market, NDA,
-- liste d'attente) ne sont PAS purges ici : la duree releve du metier
-- (relation commerciale, obligations AML) et doit etre decidee d'abord.
-- RISQUE : suppression definitive. Faire une sauvegarde R2 avant.
-- Colonnes : created_at (migrations et code), viewed_at pour property_views
-- (app/api/admin/analytics/supabase/route.ts:56) ; verifier avec la requete 2 de
-- l'audit pour les tables creees hors depot.
-- =====================================================================

-- Apercu (lecture seule) : nombre de lignes concernees.
-- SELECT 'admin_auth_log' AS t, count(*) FROM public.admin_auth_log WHERE created_at < now() - interval '12 months'
-- UNION ALL SELECT 'property_views', count(*) FROM public.property_views WHERE viewed_at < now() - interval '13 months'
-- UNION ALL SELECT 'tracking_events', count(*) FROM public.tracking_events WHERE created_at < now() - interval '13 months'
-- UNION ALL SELECT 'chatbot_logs', count(*) FROM public.chatbot_logs WHERE created_at < now() - interval '6 months';

-- Purge :
-- BEGIN;
-- DELETE FROM public.admin_auth_log  WHERE created_at < now() - interval '12 months';
-- DELETE FROM public.property_views  WHERE viewed_at < now() - interval '13 months';
-- DELETE FROM public.tracking_events WHERE created_at < now() - interval '13 months';
-- DELETE FROM public.chatbot_logs    WHERE created_at < now() - interval '6 months';
-- COMMIT;

-- RETOUR ARRIERE DU BLOC F : aucun (suppression definitive). Seule la
-- restauration de la sauvegarde R2 prise avant permet de revenir.
