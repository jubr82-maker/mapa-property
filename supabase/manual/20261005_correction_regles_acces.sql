-- =====================================================================
-- CORRECTION DES REGLES D'ACCES + JOURNAL DES CONNEXIONS ADMIN
-- MAPA Property, prepare le 2026-10-05. NON EXECUTE par Claude.
-- A executer par Julien dans l'editeur SQL Supabase, BLOC PAR BLOC.
-- Lancer d'abord 20261005_audit_regles_acces.sql et garder son resultat.
--
-- Cas identifies depuis le depot (regles d'ecriture creees sans
-- is_mapa_admin et jamais resserrees par 20260918_rls_admin_allowlist) :
--   public.properties              properties_authenticated_update (true)
--                                  -> deja supprimee par Julien le 2026-10-05
--   public.lu_market_prices_by_commune  lu_market_prices_admin_write
--                                  (auth.role() = 'authenticated')
--   public.mapa_historical_sales   mapa_historical_sales_partners_write
--                                  (liste d'e-mails en dur, sans aal2)
--   storage.objects                documents_storage_admin_write
--                                  offmarket_photos_admin_write
--                                  (auth.role() = 'authenticated')
-- Tout AUTRE cas remonte par l'audit (tables creees hors du depot, bucket
-- property-images) est a traiter au cas par cas : ne pas improviser.
-- =====================================================================


-- =====================================================================
-- BLOC A : a executer tout de suite (aucun risque de blocage : les
-- comptes admin de la liste gardent l'acces, la double authentification
-- n'est pas encore exigee ici)
-- =====================================================================

BEGIN;

-- A1. Faille corrigee aujourd'hui : idempotent si deja fait.
DROP POLICY IF EXISTS "properties_authenticated_update" ON public.properties;

-- A2. Prix de marche (alimentent l'estimateur public).
ALTER POLICY "lu_market_prices_admin_write" ON public.lu_market_prices_by_commune
  USING (public.is_mapa_admin())
  WITH CHECK (public.is_mapa_admin());

-- A3. Ventes realisees : meme fonction que le reste de l'admin (elle
--     portera aussi l'exigence de double authentification, bloc B).
ALTER POLICY "mapa_historical_sales_partners_write" ON public.mapa_historical_sales
  USING (public.is_mapa_admin())
  WITH CHECK (public.is_mapa_admin());

-- A4. Journal des connexions admin. Jamais de mot de passe ni de code :
--     evenement, adresse e-mail saisie, resultat, motif, IP, navigateur.
--     RLS active SANS aucune regle : seul le serveur (service_role) lit et
--     ecrit ; l'API publique n'y a aucun acces.
CREATE TABLE IF NOT EXISTS public.admin_auth_log (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  event       TEXT NOT NULL,
  email       TEXT,
  success     BOOLEAN NOT NULL,
  reason      TEXT,
  ip          TEXT,
  user_agent  TEXT
);
ALTER TABLE public.admin_auth_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_auth_log FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.admin_auth_log_id_seq FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_admin_auth_log_created_at ON public.admin_auth_log (created_at DESC);

COMMIT;

-- A5. Stockage : ecriture reservee aux admins. Si l'editeur SQL refuse
--     ("must be owner of table objects"), faire la meme modification dans
--     Supabase > Storage > Policies (memes conditions).
ALTER POLICY "documents_storage_admin_write" ON storage.objects
  USING (bucket_id = 'documents' AND public.is_mapa_admin())
  WITH CHECK (bucket_id = 'documents' AND public.is_mapa_admin());

ALTER POLICY "offmarket_photos_admin_write" ON storage.objects
  USING (bucket_id = 'offmarket-photos' AND public.is_mapa_admin())
  WITH CHECK (bucket_id = 'offmarket-photos' AND public.is_mapa_admin());

-- Verification : relancer la requete 1 de l'audit. Ces quatre regles ne
-- doivent plus y apparaitre.


-- =====================================================================
-- BLOC B : UNIQUEMENT APRES que LES DEUX comptes admin
-- (admin@mapagroup.org et j.brebion@mapagroup.org) ont inscrit et verifie
-- leur double authentification dans /admin/securite.
-- Effet : toute regle fondee sur is_mapa_admin() exige une session aal2.
-- Un compte sans second facteur verifie ne voit plus aucune donnee admin.
-- =====================================================================

-- CREATE OR REPLACE FUNCTION public.is_mapa_admin()
-- RETURNS boolean
-- LANGUAGE sql
-- STABLE
-- AS $$
--   SELECT coalesce(auth.email(), '') = ANY (ARRAY['admin@mapagroup.org', 'j.brebion@mapagroup.org'])
--      AND coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
-- $$;

-- Verification : la requete 4 de l'audit doit afficher
-- exige_double_authentification = true.


-- =====================================================================
-- BLOC C : RETOUR ARRIERE DU BLOC B (en cas de blocage d'acces)
-- =====================================================================

-- CREATE OR REPLACE FUNCTION public.is_mapa_admin()
-- RETURNS boolean
-- LANGUAGE sql
-- STABLE
-- AS $$
--   SELECT coalesce(auth.email(), '') = ANY (ARRAY['admin@mapagroup.org', 'j.brebion@mapagroup.org'])
-- $$;
