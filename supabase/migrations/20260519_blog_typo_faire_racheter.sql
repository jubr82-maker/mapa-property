-- POL2-2 — Coquille blog : "faire racheter" → "racheter"
-- Cible : article "Off Market au Luxembourg" (slug
-- off-market-luxembourg-fin-modele-informel). Remplace la tournure
-- "qui tentait de lui faire racheter son propre bien" par
-- "qui tentait de lui racheter son propre bien".
--
-- À APPLIQUER PAR JULIEN (ne pas exécuter automatiquement).
-- Idempotente : le filtre WHERE ... LIKE '%faire racheter son propre bien%'
-- ne touche aucune ligne si la coquille est déjà corrigée (cas observé
-- le 2026-05-19 : le contenu live lit déjà "lui racheter son propre
-- bien", la coquille n'est plus présente — ce script reste utile en
-- cas de re-seed depuis une source antérieure et est sûr à rejouer).
-- Ciblée : ne modifie que les lignes contenant exactement la coquille,
-- via REPLACE() sur la sous-chaîne (le reste du contenu est intact).

UPDATE public.blog_posts
SET content = REPLACE(
  content,
  'qui tentait de lui faire racheter son propre bien',
  'qui tentait de lui racheter son propre bien'
)
WHERE content LIKE '%faire racheter son propre bien%';

-- Vérification (lecture seule, optionnelle) :
-- SELECT slug FROM public.blog_posts
-- WHERE content LIKE '%faire racheter son propre bien%';
-- -> doit renvoyer 0 ligne après application.
