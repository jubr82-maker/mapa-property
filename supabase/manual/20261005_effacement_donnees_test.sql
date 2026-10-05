-- =====================================================================
-- EFFACEMENT DES DONNEES DE TEST : estimations, leads, mandats
-- MAPA Property, prepare le 2026-10-05. NE PAS APPLIQUER COMME MIGRATION.
--
-- A executer par Julien dans l'editeur SQL Supabase, BLOC PAR BLOC, dans
-- l'ordre, en relisant le resultat de chaque bloc avant le suivant.
--
-- Decision (Julien) : tout l'historique des estimations, des leads et des
-- mandats est constitue de tests faits par Julien et Frederic.
--
-- Tables concernees (code et migrations du depot) :
--   public.estimation_requests  estimations du simulateur
--                               (migration 20260514120100_estimation_requests)
--   public.leads                tous les leads : contact, demandes off-market,
--                               NDA, liste d'attente, chatbot (colonne source)
--                               (table creee hors du depot ; colonnes connues
--                               par les migrations 20260512, 20260518, 20260527)
--   public.mandats              mandats vente / recherche / location
--                               (ex mandats_recherche, migration 20260603)
-- Tables liees :
--   public.leads_notifications  lead_id sans cle etrangere : notifications
--                               internes des leads, videe avec les leads.
--   public.offmarket_requests   lead_id sans cle etrangere : les demandes
--                               off-market sont CONSERVEES, leur lead_id est
--                               remis a NULL (aucune ligne supprimee).
--   mandats.lead_id -> leads.id ON DELETE SET NULL (seule cle etrangere
--                               connue) : mandats supprimes avant les leads.
-- Le bloc 2 liste TOUTES les cles etrangeres reelles vers ces trois tables :
-- si une table inconnue du depot y apparait, s'arreter et la signaler.
--
-- NE SONT PAS TOUCHES : properties, property_images, properties_offmarket,
-- mapa_historical_sales (ventes realisees), reviews, blog_posts, documents,
-- site_content, site_design_tokens, interest_rates, lu_market_prices_*,
-- tracking_events, property_views, chatbot_logs, nda_requests,
-- arcova_waitlist, mandate_requests, mandates_requests, offmarket_audit_log,
-- bo_audit_log, auth.users, et tout le stockage (Supabase Storage, R2).
-- =====================================================================


-- =====================================================================
-- BLOC 1 : SAUVEGARDE (copie complete dans la meme base)
-- Tables de sauvegarde inaccessibles a l'API publique (RLS active, droits
-- retires a anon et authenticated) : elles contiennent des donnees
-- personnelles.
-- =====================================================================

CREATE TABLE public.estimation_requests_backup_20261002 AS TABLE public.estimation_requests;
CREATE TABLE public.leads_backup_20261002               AS TABLE public.leads;
CREATE TABLE public.mandats_backup_20261002             AS TABLE public.mandats;
CREATE TABLE public.leads_notifications_backup_20261002 AS TABLE public.leads_notifications;
CREATE TABLE public.offmarket_requests_backup_20261002  AS TABLE public.offmarket_requests;

ALTER TABLE public.estimation_requests_backup_20261002 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_backup_20261002               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandats_backup_20261002             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_notifications_backup_20261002 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offmarket_requests_backup_20261002  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.estimation_requests_backup_20261002 FROM anon, authenticated;
REVOKE ALL ON public.leads_backup_20261002               FROM anon, authenticated;
REVOKE ALL ON public.mandats_backup_20261002             FROM anon, authenticated;
REVOKE ALL ON public.leads_notifications_backup_20261002 FROM anon, authenticated;
REVOKE ALL ON public.offmarket_requests_backup_20261002  FROM anon, authenticated;

-- Verification : chaque sauvegarde doit avoir exactement le meme nombre de
-- lignes que sa table d'origine (colonne "identique" = true partout).
SELECT 'estimation_requests' AS table_name,
       (SELECT count(*) FROM public.estimation_requests) AS origine,
       (SELECT count(*) FROM public.estimation_requests_backup_20261002) AS sauvegarde,
       (SELECT count(*) FROM public.estimation_requests) = (SELECT count(*) FROM public.estimation_requests_backup_20261002) AS identique
UNION ALL
SELECT 'leads',
       (SELECT count(*) FROM public.leads),
       (SELECT count(*) FROM public.leads_backup_20261002),
       (SELECT count(*) FROM public.leads) = (SELECT count(*) FROM public.leads_backup_20261002)
UNION ALL
SELECT 'mandats',
       (SELECT count(*) FROM public.mandats),
       (SELECT count(*) FROM public.mandats_backup_20261002),
       (SELECT count(*) FROM public.mandats) = (SELECT count(*) FROM public.mandats_backup_20261002)
UNION ALL
SELECT 'leads_notifications',
       (SELECT count(*) FROM public.leads_notifications),
       (SELECT count(*) FROM public.leads_notifications_backup_20261002),
       (SELECT count(*) FROM public.leads_notifications) = (SELECT count(*) FROM public.leads_notifications_backup_20261002)
UNION ALL
SELECT 'offmarket_requests',
       (SELECT count(*) FROM public.offmarket_requests),
       (SELECT count(*) FROM public.offmarket_requests_backup_20261002),
       (SELECT count(*) FROM public.offmarket_requests) = (SELECT count(*) FROM public.offmarket_requests_backup_20261002);


-- =====================================================================
-- BLOC 2 : CONTROLE (lecture seule)
-- A relire attentivement : il ne doit y avoir QUE des tests.
-- =====================================================================

-- 2a. Nombre de lignes par table.
SELECT 'estimation_requests' AS table_name, count(*) AS lignes FROM public.estimation_requests
UNION ALL SELECT 'leads', count(*) FROM public.leads
UNION ALL SELECT 'mandats', count(*) FROM public.mandats
UNION ALL SELECT 'leads_notifications', count(*) FROM public.leads_notifications
UNION ALL SELECT 'offmarket_requests avec lead_id', count(*) FROM public.offmarket_requests WHERE lead_id IS NOT NULL;

-- 2b. Leads : adresses e-mail distinctes et nombre de lignes, par source.
SELECT lower(email) AS email, count(*) AS lignes,
       string_agg(DISTINCT coalesce(source, '(sans source)'), ', ') AS sources,
       min(created_at) AS premiere, max(created_at) AS derniere
FROM public.leads
GROUP BY lower(email)
ORDER BY lignes DESC, email;

-- 2c. Estimations : adresses e-mail distinctes et nombre de lignes.
SELECT coalesce(lower(contact_email), '(sans e-mail)') AS email, count(*) AS lignes,
       min(created_at) AS premiere, max(created_at) AS derniere
FROM public.estimation_requests
GROUP BY coalesce(lower(contact_email), '(sans e-mail)')
ORDER BY lignes DESC, email;

-- 2d. Mandats : adresses e-mail des clients et nombre de lignes, par section.
SELECT coalesce(lower(client_email), '(sans e-mail)') AS email, type_transaction,
       count(*) AS lignes, min(created_at) AS premiere, max(created_at) AS derniere
FROM public.mandats
GROUP BY coalesce(lower(client_email), '(sans e-mail)'), type_transaction
ORDER BY lignes DESC, email;

-- 2e. TOUTES les cles etrangeres qui pointent vers les trois tables, telles
--     qu'elles existent reellement en base. Attendu : uniquement
--     mandats -> leads (confdeltype = 'n', SET NULL). Toute autre ligne :
--     s'arreter et la signaler avant le bloc 3.
SELECT c.conrelid::regclass  AS table_enfant,
       c.conname             AS contrainte,
       c.confrelid::regclass AS table_parente,
       c.confdeltype         AS sur_suppression -- a=no action r=restrict c=cascade n=set null d=set default
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.confrelid IN ('public.leads'::regclass,
                      'public.estimation_requests'::regclass,
                      'public.mandats'::regclass)
ORDER BY 1, 2;


-- =====================================================================
-- BLOC 3 : EFFACEMENT (transaction unique)
-- Ordre : notifications des leads, liens off-market, mandats (enfants des
-- leads), leads, estimations. Si une suppression echoue (cle etrangere
-- inattendue), toute la transaction est annulee : rien n'est efface.
-- Le controle final annule aussi tout si une table n'est pas vide.
-- =====================================================================

BEGIN;

DELETE FROM public.leads_notifications;

UPDATE public.offmarket_requests
   SET lead_id = NULL
 WHERE lead_id IS NOT NULL;

DELETE FROM public.mandats;
DELETE FROM public.leads;
DELETE FROM public.estimation_requests;

DO $$
DECLARE
  restant bigint;
BEGIN
  SELECT (SELECT count(*) FROM public.estimation_requests)
       + (SELECT count(*) FROM public.leads)
       + (SELECT count(*) FROM public.mandats)
       + (SELECT count(*) FROM public.leads_notifications)
       + (SELECT count(*) FROM public.offmarket_requests WHERE lead_id IS NOT NULL)
    INTO restant;
  IF restant <> 0 THEN
    RAISE EXCEPTION 'Effacement incomplet (% ligne(s) restante(s)) : transaction annulee', restant;
  END IF;
END
$$;

COMMIT;

-- Recomptage apres validation : chaque ligne doit afficher 0.
SELECT 'estimation_requests' AS table_name, count(*) AS lignes FROM public.estimation_requests
UNION ALL SELECT 'leads', count(*) FROM public.leads
UNION ALL SELECT 'mandats', count(*) FROM public.mandats
UNION ALL SELECT 'leads_notifications', count(*) FROM public.leads_notifications
UNION ALL SELECT 'offmarket_requests avec lead_id', count(*) FROM public.offmarket_requests WHERE lead_id IS NOT NULL;


-- =====================================================================
-- BLOC 4 (FACULTATIF, PLUS TARD) : suppression des sauvegardes
-- Uniquement quand Julien est rassure (admin verifie, aucun manque).
-- Irreversible : les copies de sauvegarde disparaissent.
-- =====================================================================

-- DROP TABLE public.estimation_requests_backup_20261002;
-- DROP TABLE public.leads_backup_20261002;
-- DROP TABLE public.mandats_backup_20261002;
-- DROP TABLE public.leads_notifications_backup_20261002;
-- DROP TABLE public.offmarket_requests_backup_20261002;
