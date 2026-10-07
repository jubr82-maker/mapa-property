-- =====================================================================
-- 19 SANTE DU SITE : CAUSE DU LCP AVEC CHAQUE MESURE PAGESPEED
-- MAPA Property, prepare le 2026-10-07. MODIFIE la STRUCTURE de
-- public.psi_runs (une colonne ajoutee) ; ne modifie AUCUNE donnee.
--
-- psi_runs.lcp_diagnosis (jsonb, vide par defaut), rempli par la tache
-- planifiee a partir de la reponse PageSpeed deja recue :
--   element       : selecteur, extrait et libelle de l'element LCP
--   phases        : ttfb, load_delay, load_time, render_delay (ms)
--   opportunities : trois pistes d'amelioration, titre et gain estime (ms)
-- Lecture : memes regles que la table (admin seulement, is_mapa_admin) ;
-- ecriture par le serveur (cle service_role).
-- Avant execution, les mesures continuent d'etre enregistrees, sans la
-- cause du LCP.
-- Rejouable : ADD COLUMN IF NOT EXISTS.
-- Retour arriere : ALTER TABLE public.psi_runs DROP COLUMN lcp_diagnosis;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.psi_runs ADD COLUMN IF NOT EXISTS lcp_diagnosis jsonb;
COMMENT ON COLUMN public.psi_runs.lcp_diagnosis IS
  'Cause du LCP : element (selecteur, extrait), phases en ms, trois pistes d''amelioration avec gain estime.';

COMMIT;

SELECT 'colonne psi_runs.lcp_diagnosis'::text AS controle,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'psi_runs' AND column_name = 'lcp_diagnosis'
       ) THEN 'presente' ELSE 'absente' END::text AS etat;
