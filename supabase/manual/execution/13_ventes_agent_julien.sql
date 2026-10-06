-- =====================================================================
-- 13 VENTES REALISEES : JULIEN BREBION, SEUL AGENT
-- MAPA Property, prepare le 2026-10-06. MODIFIE public.mapa_historical_sales.
--
-- Frederic Mannis ne realise aucune vente : toute vente enregistree avec
-- agent = 'frederic' est reattribuee a Julien Brebion (agent = 'julien').
-- Aucune autre colonne n'est modifiee (updated_at est mis a jour par le
-- declencheur existant de la table).
--
-- Rejouable : la sauvegarde n'est creee qu'a la premiere execution
-- (public.mapa_historical_sales_sauvegarde_agent_20261006, copie complete
-- de la table AVANT toute modification, controlee ligne a ligne) ; une
-- seconde execution ne trouve plus aucune vente a reattribuer.
-- La regle de la table (agent IN ('julien', 'frederic')) n'est pas
-- modifiee ici ; le site n'accepte plus que 'julien' depuis oct. 2026.
--
-- Retour arriere : UPDATE public.mapa_historical_sales v SET agent = s.agent
-- FROM public.mapa_historical_sales_sauvegarde_agent_20261006 s
-- WHERE s.id = v.id;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

-- 1. Comptage avant modification.
DROP TABLE IF EXISTS pg_temp.ventes_par_agent;
CREATE TEMP TABLE ventes_par_agent (
  agent text PRIMARY KEY,
  avant bigint NOT NULL DEFAULT 0,
  apres bigint NOT NULL DEFAULT 0
) ON COMMIT PRESERVE ROWS;

INSERT INTO ventes_par_agent (agent, avant)
SELECT agent, count(*) FROM public.mapa_historical_sales GROUP BY agent;

-- 2. Sauvegarde prealable (premiere execution seulement), controlee.
DO $$
DECLARE
  n_copie bigint;
  n_source bigint;
BEGIN
  IF to_regclass('public.mapa_historical_sales_sauvegarde_agent_20261006') IS NULL THEN
    CREATE TABLE public.mapa_historical_sales_sauvegarde_agent_20261006 AS TABLE public.mapa_historical_sales;
    SELECT count(*) INTO n_copie FROM public.mapa_historical_sales_sauvegarde_agent_20261006;
    SELECT count(*) INTO n_source FROM public.mapa_historical_sales;
    IF n_copie <> n_source THEN
      RAISE EXCEPTION 'Sauvegarde incomplete : % lignes copiees sur %', n_copie, n_source;
    END IF;
    -- Table de sauvegarde : jamais lisible depuis le site.
    ALTER TABLE public.mapa_historical_sales_sauvegarde_agent_20261006 ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.mapa_historical_sales_sauvegarde_agent_20261006 FROM anon, authenticated;
  END IF;
END $$;

-- 3. Reattribution.
UPDATE public.mapa_historical_sales
SET agent = 'julien'
WHERE agent = 'frederic';

-- 4. Comptage apres modification.
INSERT INTO ventes_par_agent (agent, apres)
SELECT agent, count(*) FROM public.mapa_historical_sales GROUP BY agent
ON CONFLICT (agent) DO UPDATE SET apres = EXCLUDED.apres;

COMMIT;

-- 5. Tableau final (seul affiche) : nombre de ventes par agent, avant et
--    apres. Attendu : aucune vente pour 'frederic' apres.
SELECT (CASE agent WHEN 'julien' THEN 'Julien Brebion' WHEN 'frederic' THEN 'frederic (ancienne valeur)' ELSE agent END)::text AS agent,
       avant::text AS ventes_avant,
       apres::text AS ventes_apres
FROM ventes_par_agent
ORDER BY agent;
