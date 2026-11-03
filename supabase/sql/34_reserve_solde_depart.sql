-- =====================================================================
-- 34 RESERVE : SOLDE DE DEPART PAR AGENT
-- MAPA Property, prepare le 2026-11-03. AJOUTE 1 colonne a
-- public.mapa_sales_agents ; ne modifie aucune ligne existante, ne
-- supprime rien (aucun DROP, DELETE ni UPDATE).
--
--   solde_depart_reserve  montant qui revient a l'agent a la date de debut
--                         du suivi, hors TVA et hors part de MAPA Property,
--                         apres paiement de tous les salaires precedents.
--                         Positif ou negatif, 0 par defaut.
--
-- Les ventes datees de la date de debut ou apres s'y ajoutent ; les ventes
-- anterieures sont deja comprises dans ce solde.
--
-- Peut etre execute avant ou apres le deploiement : sans ce fichier, le
-- site compte un solde de depart de 0 et refuse seulement d'enregistrer un
-- solde different de 0, avec un message clair. Rejouable (IF NOT EXISTS).
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.mapa_sales_agents ADD COLUMN IF NOT EXISTS solde_depart_reserve NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMIT;

-- Tableau final (seul affiche) : colonne ajoutee et lignes des agents.
SELECT 'colonne ' || column_name AS controle,
       data_type || ' (' || numeric_precision || ',' || numeric_scale || '), vide '
         || CASE WHEN is_nullable = 'YES' THEN 'autorise' ELSE 'interdit' END
         || COALESCE(', defaut ' || column_default, '') AS etat
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'mapa_sales_agents' AND column_name = 'solde_depart_reserve'
UNION ALL
SELECT 'agent ' || agent_key, 'solde de depart ' || solde_depart_reserve::text || ', debut ' || COALESCE(debut_suivi_reserve::text, 'non renseigne')
FROM public.mapa_sales_agents
UNION ALL
SELECT 'lignes mapa_sales_agents', count(*)::text FROM public.mapa_sales_agents
ORDER BY 1;
