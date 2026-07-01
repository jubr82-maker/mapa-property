-- MAPA Property — Nettoyage policies fantomes mapa_historical_sales
-- 1er juillet 2026 (suite de 20260701_ventes_realisees_rls_allowlist.sql).
--
-- CONTEXTE — derive de schema :
--   La table public.mapa_historical_sales portait, EN BASE UNIQUEMENT, 4
--   policies creees a la main (Supabase Studio) et JAMAIS capturees dans une
--   migration :
--     "MAPA admins read sales", "MAPA admins insert sales",
--     "MAPA admins update sales", "MAPA admins delete sales".
--   Elles referencent encore le compte fantome 'f.mannis@mapagroup.org'
--   (jamais cree en auth) et n'incluent pas 'admin@mapagroup.org'.
--
--   Elles sont PERMISSIVE (verifie via pg_policy.polpermissive) : elles ne
--   bloquent donc rien (les policies permissives se combinent en OR), mais
--   elles sont REDONDANTES avec les 2 policies correctes posees par la
--   migration 20260701 :
--     mapa_historical_sales_partners_read  (FOR SELECT)
--     mapa_historical_sales_partners_write (FOR ALL, USING + WITH CHECK)
--   qui couvrent lecture + toutes ecritures pour les emails REELS
--   (admin@mapagroup.org + j.brebion@mapagroup.org).
--
--   Verifie egalement : AUCUNE autre table du projet n'a ce doublon (la
--   derive est limitee a mapa_historical_sales).
--
-- POURQUOI C'EST SUR :
--   - DROP IF EXISTS -> idempotent, aucune erreur si deja absentes.
--   - Policies permissives -> les supprimer ne retire l'acces a AUCUN compte
--     legitime : le seul octroye en propre est f.mannis@ (inexistant) ;
--     j.brebion@ reste couvert par partners_read/write ; admin@ n'etait pas
--     octroye par elles. Aucun utilisateur reel ne perd l'acces.
--   - Supprime la DERNIERE reference a f.mannis@ dans la base (coherent avec
--     l'eradication du compte fantome cote code).
--
-- PORTEE STRICTE : ne DROP que ces 4 policies nommees. Ne touche pas aux 2
-- policies partners_read/write, ni aux donnees (0 ligne), ni a aucune autre
-- table ou policy.
--
-- A APPLIQUER MANUELLEMENT dans Supabase Studio (SQL Editor), coherent avec
-- la convention du projet. Aucune ecriture DB automatique cote code.

DROP POLICY IF EXISTS "MAPA admins read sales"   ON public.mapa_historical_sales;
DROP POLICY IF EXISTS "MAPA admins insert sales" ON public.mapa_historical_sales;
DROP POLICY IF EXISTS "MAPA admins update sales" ON public.mapa_historical_sales;
DROP POLICY IF EXISTS "MAPA admins delete sales" ON public.mapa_historical_sales;

-- Verification post-migration :
--   SELECT polname
--     FROM pg_policy
--    WHERE polrelid = 'public.mapa_historical_sales'::regclass
--    ORDER BY polname;
-- Resultat attendu (exactement 2 lignes, plus aucune "MAPA admins ...") :
--   mapa_historical_sales_partners_read
--   mapa_historical_sales_partners_write
