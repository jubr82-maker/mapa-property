-- =====================================================================
-- 33 REMUNERATION : REGLAGES DES AGENTS ET DE L'EMPLOYEUR
-- MAPA Property, prepare le 2026-11-03. CREE 2 tables vides ; ne modifie
-- aucune table existante, n'ajoute ni ne supprime aucune ligne (aucun
-- DROP, DELETE, UPDATE ni INSERT).
--
-- public.mapa_sales_agents : une ligne par agent, reliee a la colonne
--   agent des ventes realisees (agent_key = 'julien').
--   part_agent_pct           part de l'agent dans la commission HT (80)
--   paie_charges_patronales  la part de l'agent couvre aussi les charges
--                            patronales (oui par defaut)
--   classe_impot             classe de la retenue mensuelle : 1 ou 2
--   frais_deplacement_annuels deduction annuelle en euros (0)
--   niveau_ssm               salaire social minimum : non_qualifie ou qualifie
--   net_mensuel_actuel       net mensuel actuel (facultatif)
--   debut_suivi_reserve      debut du suivi de la reserve (facultatif)
-- public.mapa_employer_settings : une seule ligne (id = 1).
--   mutualite_taux   0.23, 0.95, 1.56 ou 2.66 (%), 0.23 par defaut
--   facteur_accident 0.85, 1, 1.1, 1.3 ou 1.5 (bonus-malus AAA), 1 par defaut
--
-- Acces : RLS active, une seule regle par table, la meme fonction que les
-- ventes realisees (public.is_mapa_admin : comptes admin et double
-- authentification). Aucun acces pour le visiteur anonyme.
--
-- Tables vides apres execution : le site utilise les reglages par defaut
-- (Julien, 80 %, mutualite 0,23 %, facteur 1) jusqu'au premier
-- enregistrement de la page de reglages. Peut etre execute avant ou apres
-- le deploiement. Rejouable (IF NOT EXISTS partout).
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.mapa_sales_agents (
  agent_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  part_agent_pct NUMERIC(5,2) NOT NULL DEFAULT 80,
  paie_charges_patronales BOOLEAN NOT NULL DEFAULT true,
  classe_impot SMALLINT NOT NULL DEFAULT 1,
  frais_deplacement_annuels NUMERIC(10,2) NOT NULL DEFAULT 0,
  niveau_ssm TEXT NOT NULL DEFAULT 'non_qualifie',
  net_mensuel_actuel NUMERIC(10,2) NULL,
  debut_suivi_reserve DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mapa_sales_agents_key_check CHECK (agent_key ~ '^[a-z][a-z0-9_]{1,30}$'),
  CONSTRAINT mapa_sales_agents_name_check CHECK (length(btrim(display_name)) BETWEEN 1 AND 80),
  CONSTRAINT mapa_sales_agents_part_check CHECK (part_agent_pct >= 0 AND part_agent_pct <= 100),
  CONSTRAINT mapa_sales_agents_classe_check CHECK (classe_impot IN (1, 2)),
  CONSTRAINT mapa_sales_agents_frais_check CHECK (frais_deplacement_annuels >= 0),
  CONSTRAINT mapa_sales_agents_ssm_check CHECK (niveau_ssm IN ('non_qualifie', 'qualifie')),
  CONSTRAINT mapa_sales_agents_net_check CHECK (net_mensuel_actuel IS NULL OR net_mensuel_actuel >= 0)
);

CREATE TABLE IF NOT EXISTS public.mapa_employer_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  mutualite_taux NUMERIC(4,2) NOT NULL DEFAULT 0.23,
  facteur_accident NUMERIC(4,2) NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mapa_employer_settings_single_check CHECK (id = 1),
  CONSTRAINT mapa_employer_settings_mutualite_check CHECK (mutualite_taux IN (0.23, 0.95, 1.56, 2.66)),
  CONSTRAINT mapa_employer_settings_facteur_check CHECK (facteur_accident IN (0.85, 1, 1.1, 1.3, 1.5))
);

ALTER TABLE public.mapa_sales_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapa_employer_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mapa_sales_agents' AND policyname = 'mapa_sales_agents_admin_all') THEN
    CREATE POLICY mapa_sales_agents_admin_all ON public.mapa_sales_agents
      FOR ALL TO authenticated
      USING (public.is_mapa_admin())
      WITH CHECK (public.is_mapa_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mapa_employer_settings' AND policyname = 'mapa_employer_settings_admin_all') THEN
    CREATE POLICY mapa_employer_settings_admin_all ON public.mapa_employer_settings
      FOR ALL TO authenticated
      USING (public.is_mapa_admin())
      WITH CHECK (public.is_mapa_admin());
  END IF;
END $$;

COMMIT;

-- Tableau final (seul affiche) : tables, acces, regles, contraintes, lignes.
SELECT 'table ' || c.relname AS controle,
       'RLS ' || CASE WHEN c.relrowsecurity THEN 'active' ELSE 'INACTIVE' END AS etat
FROM pg_class c
WHERE c.oid IN ('public.mapa_sales_agents'::regclass, 'public.mapa_employer_settings'::regclass)
UNION ALL
SELECT 'regle ' || policyname, cmd || ' pour ' || array_to_string(roles, ', ') || ' si ' || qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('mapa_sales_agents', 'mapa_employer_settings')
UNION ALL
SELECT 'contrainte ' || conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('public.mapa_sales_agents'::regclass, 'public.mapa_employer_settings'::regclass) AND contype = 'c'
UNION ALL
SELECT 'lignes mapa_sales_agents', count(*)::text FROM public.mapa_sales_agents
UNION ALL
SELECT 'lignes mapa_employer_settings', count(*)::text FROM public.mapa_employer_settings
ORDER BY 1;
