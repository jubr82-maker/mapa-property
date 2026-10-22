-- =====================================================================
-- 30 TYPE DE MANDAT DES BIENS PUBLIES
-- MAPA Property, prepare le 2026-10-22. MODIFIE une seule colonne de
-- public.properties : mandate_type (SQL 16), pour 12 biens publies
-- reconnus par leur reference Apimo (colonne apimo_id). Aucun autre champ
-- n'est touche (transaction, badge, textes, prix restent tels quels).
--
-- Colonne lue par le site :
--   - fin standard des annonces (lib/listing/generate.ts, listingValues :
--     exclusive = mandate_type = 'exclusive') : "Une exclusivite MAPA
--     Property." et "Annonce diffusee en vente/location exclusive" ;
--   - badge public (lib/listing/families.ts, effectiveBadge) : un bien en
--     mandat exclusif porte le badge "Exclusivite" a la place du badge
--     choisi a la main.
--   exclusive : 86399567, 86388715, 86805935, 86816538, 85566897, 86747780,
--               86339857, 86430704, 84950222
--   simple    : 85603229, 85102753, 86621029
--
-- Deroulement :
--   1. controle : chaque reference doit designer UN seul bien, publie ;
--      sinon arret, rien n'est modifie (exception, transaction annulee) ;
--   2. sauvegarde des valeurs actuelles dans
--      public.properties_mandate_type_avant_30 (identifiant, reference,
--      ancienne valeur, date). Rejouable : la premiere sauvegarde d'un bien
--      n'est jamais ecrasee ;
--   3. mise a jour de mandate_type, dans la meme transaction ;
--   4. tableau final : reference, titre, transaction, mandat avant et apres.
--
-- Apres execution : enregistrer UN bien dans l'admin (meme sans
-- modification) pour rafraichir les fiches et les listes du site.
-- Retour arriere (apres verification du tableau) :
--   UPDATE public.properties p SET mandate_type = s.mandate_type_avant
--   FROM public.properties_mandate_type_avant_30 s WHERE s.property_id = p.id;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

CREATE TEMP TABLE cibles_30 (reference text PRIMARY KEY, mandat text NOT NULL) ON COMMIT DROP;
INSERT INTO cibles_30 (reference, mandat) VALUES
  ('86399567', 'exclusive'),
  ('86388715', 'exclusive'),
  ('86805935', 'exclusive'),
  ('86816538', 'exclusive'),
  ('85566897', 'exclusive'),
  ('86747780', 'exclusive'),
  ('86339857', 'exclusive'),
  ('86430704', 'exclusive'),
  ('84950222', 'exclusive'),
  ('85603229', 'simple'),
  ('85102753', 'simple'),
  ('86621029', 'simple');

-- 1. Controle : une reference introuvable, en double ou non publiee arrete tout.
DO $$
DECLARE
  probleme text;
BEGIN
  SELECT string_agg(c.reference || ' (' || coalesce(n.total, 0) || ' bien(s), ' || coalesce(n.publies, 0) || ' publie(s))', ', ' ORDER BY c.reference)
    INTO probleme
  FROM cibles_30 c
  LEFT JOIN (
    SELECT apimo_id::text AS reference, count(*) AS total, count(*) FILTER (WHERE is_published) AS publies
    FROM public.properties
    WHERE apimo_id IS NOT NULL
    GROUP BY apimo_id::text
  ) n ON n.reference = c.reference
  WHERE coalesce(n.total, 0) <> 1 OR coalesce(n.publies, 0) <> 1;
  IF probleme IS NOT NULL THEN
    RAISE EXCEPTION 'Arret, rien n''est modifie. Reference introuvable, en double ou non publiee : %', probleme;
  END IF;
END $$;

-- 2. Sauvegarde des valeurs actuelles.
CREATE TABLE IF NOT EXISTS public.properties_mandate_type_avant_30 (
  property_id uuid PRIMARY KEY,
  reference text NOT NULL,
  mandate_type_avant text,
  sauvegarde_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.properties_mandate_type_avant_30 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.properties_mandate_type_avant_30 FROM anon, authenticated;

INSERT INTO public.properties_mandate_type_avant_30 (property_id, reference, mandate_type_avant)
SELECT p.id, c.reference, p.mandate_type
FROM public.properties p
JOIN cibles_30 c ON c.reference = p.apimo_id::text
ON CONFLICT (property_id) DO NOTHING;

-- 3. Mise a jour du seul type de mandat.
UPDATE public.properties p
SET mandate_type = c.mandat
FROM cibles_30 c
WHERE c.reference = p.apimo_id::text
  AND p.is_published
  AND p.mandate_type IS DISTINCT FROM c.mandat;

COMMIT;

-- 4. Tableau final (seul affiche) : les 12 biens, avant et apres.
SELECT s.reference,
       p.title_fr AS titre,
       p.transaction,
       coalesce(s.mandate_type_avant, '(vide)') AS mandat_avant,
       coalesce(p.mandate_type, '(vide)') AS mandat_apres,
       s.sauvegarde_le
FROM public.properties_mandate_type_avant_30 s
JOIN public.properties p ON p.id = s.property_id
ORDER BY p.mandate_type, s.reference;
