-- =====================================================================
-- 29 FIN STANDARD DES ANNONCES : LECTURE DU TRONC PAR LE SITE
-- MAPA Property, prepare le 2026-10-18. MODIFIE seulement les DROITS de
-- public.listing_templates (SQL 17) ; ne modifie AUCUNE donnee.
--
-- Les fiches de biens affichent la fin standard (exclusivite, "Pour toute
-- demande", signature, estimation, service multilingue, diffusion,
-- reproduction interdite) tiree du tronc du modele d'annonce. Le site lit
-- avec la cle publique : il doit pouvoir lire les lignes part = 'tronc'
-- (texte public, deja affiche sur chaque annonce), et rien d'autre.
-- Les autres parties (titre, blocs par famille, recherches) restent
-- reservees a l'admin. Ecriture : admin seulement, inchangee.
--
-- Sans ce fichier, le site affiche le tronc PAR DEFAUT (fichiers de
-- messages), meme si le tronc a ete modifie dans l'admin.
-- Rejouable : regle recreee a l'identique.
-- Retour arriere :
--   DROP POLICY "listing_templates_public_tronc" ON public.listing_templates;
--   REVOKE SELECT ON public.listing_templates FROM anon;
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

GRANT SELECT ON public.listing_templates TO anon;

DROP POLICY IF EXISTS "listing_templates_public_tronc" ON public.listing_templates;
CREATE POLICY "listing_templates_public_tronc"
  ON public.listing_templates FOR SELECT
  TO anon
  USING (part = 'tronc');

COMMIT;

-- Tableau final (seul affiche) : regles d'acces et lignes lisibles par le site.
SELECT 'regle ' || polname AS controle,
       CASE polcmd WHEN '*' THEN 'toutes operations' WHEN 'r' THEN 'lecture' ELSE polcmd::text END AS etat
FROM pg_policy WHERE polrelid = 'public.listing_templates'::regclass
UNION ALL
SELECT 'droit de lecture anon',
       CASE WHEN has_table_privilege('anon', 'public.listing_templates', 'SELECT') THEN 'oui (lignes tronc seulement)' ELSE 'non' END
UNION ALL
SELECT 'droit d''ecriture anon',
       CASE WHEN has_table_privilege('anon', 'public.listing_templates', 'INSERT') OR has_table_privilege('anon', 'public.listing_templates', 'UPDATE') OR has_table_privilege('anon', 'public.listing_templates', 'DELETE') THEN 'ECRITURE POSSIBLE' ELSE 'aucun' END
UNION ALL
SELECT 'troncs enregistres (fr, en, de)', coalesce(string_agg(lang, ', ' ORDER BY lang), 'aucun : modele par defaut')
FROM public.listing_templates WHERE part = 'tronc'
ORDER BY 1;
