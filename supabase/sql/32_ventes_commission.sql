-- =====================================================================
-- 32 VENTES REALISEES : COMMISSION ET TVA
-- MAPA Property, prepare le 2026-11-03. AJOUTE 4 colonnes a
-- public.mapa_historical_sales ; ne modifie AUCUNE vente enregistree, ne
-- supprime rien (aucun DROP).
--
-- Commission facultative d'une vente :
--   commission_mode  'pourcentage' ou 'montant_fixe' ; vide = non renseignee
--   commission_taux  taux en % (0 a 100, 2 decimales), mode pourcentage seulement
--   commission_ht    commission hors taxes en euros (positive ou nulle,
--                    2 decimales), remplie des qu'un mode est choisi ; en
--                    pourcentage, calculee par le site : prix x taux / 100
--   tva_taux         17, 14, 8, 3 ou 0 (17 par defaut)
-- La TVA et le TTC ne sont pas stockes : le site les calcule (au centime).
--
-- Ventes deja saisies : aucune commission n'existait nulle part, donc
-- aucune reprise. Elles restent sans commission ("Non renseignee"), et
-- tva_taux prend la valeur par defaut 17 (sans effet sans commission).
--
-- Peut etre execute avant ou apres le deploiement du formulaire : sans ce
-- fichier, le site affiche la commission "Non renseignee" et refuse
-- seulement d'enregistrer une commission, avec un message clair.
-- Rejouable (IF NOT EXISTS partout).
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.mapa_historical_sales ADD COLUMN IF NOT EXISTS commission_mode TEXT NULL;
ALTER TABLE public.mapa_historical_sales ADD COLUMN IF NOT EXISTS commission_taux NUMERIC(5,2) NULL;
ALTER TABLE public.mapa_historical_sales ADD COLUMN IF NOT EXISTS commission_ht NUMERIC(12,2) NULL;
ALTER TABLE public.mapa_historical_sales ADD COLUMN IF NOT EXISTS tva_taux SMALLINT NOT NULL DEFAULT 17;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mapa_historical_sales'::regclass AND conname = 'mapa_historical_sales_commission_mode_check') THEN
    ALTER TABLE public.mapa_historical_sales ADD CONSTRAINT mapa_historical_sales_commission_mode_check
      CHECK (commission_mode IS NULL OR commission_mode IN ('pourcentage', 'montant_fixe'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mapa_historical_sales'::regclass AND conname = 'mapa_historical_sales_commission_taux_check') THEN
    ALTER TABLE public.mapa_historical_sales ADD CONSTRAINT mapa_historical_sales_commission_taux_check
      CHECK (commission_taux IS NULL OR (commission_taux >= 0 AND commission_taux <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mapa_historical_sales'::regclass AND conname = 'mapa_historical_sales_commission_ht_check') THEN
    ALTER TABLE public.mapa_historical_sales ADD CONSTRAINT mapa_historical_sales_commission_ht_check
      CHECK (commission_ht IS NULL OR commission_ht >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mapa_historical_sales'::regclass AND conname = 'mapa_historical_sales_tva_taux_check') THEN
    ALTER TABLE public.mapa_historical_sales ADD CONSTRAINT mapa_historical_sales_tva_taux_check
      CHECK (tva_taux IN (17, 14, 8, 3, 0));
  END IF;
  -- Coherence : sans mode, ni taux ni montant ; pourcentage : taux et
  -- montant ; montant fixe : montant seul.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mapa_historical_sales'::regclass AND conname = 'mapa_historical_sales_commission_coherence_check') THEN
    ALTER TABLE public.mapa_historical_sales ADD CONSTRAINT mapa_historical_sales_commission_coherence_check
      CHECK (
        (commission_mode IS NULL AND commission_taux IS NULL AND commission_ht IS NULL)
        OR (commission_mode = 'pourcentage' AND commission_taux IS NOT NULL AND commission_ht IS NOT NULL)
        OR (commission_mode = 'montant_fixe' AND commission_taux IS NULL AND commission_ht IS NOT NULL)
      );
  END IF;
END $$;


COMMIT;

-- Tableau final (seul affiche) : colonnes ajoutees, contraintes, ventes.
SELECT 'colonne ' || column_name AS controle,
       data_type || ', vide ' || CASE WHEN is_nullable = 'YES' THEN 'autorise' ELSE 'interdit' END
         || COALESCE(', defaut ' || column_default, '') AS etat
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'mapa_historical_sales'
  AND column_name IN ('commission_mode', 'commission_taux', 'commission_ht', 'tva_taux')
UNION ALL
SELECT 'contrainte ' || conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.mapa_historical_sales'::regclass AND conname LIKE 'mapa_historical_sales_%commission%'
   OR conrelid = 'public.mapa_historical_sales'::regclass AND conname = 'mapa_historical_sales_tva_taux_check'
UNION ALL
SELECT 'ventes enregistrees', count(*)::text || ' (dont ' || count(commission_mode)::text || ' avec commission)'
FROM public.mapa_historical_sales
ORDER BY 1;
