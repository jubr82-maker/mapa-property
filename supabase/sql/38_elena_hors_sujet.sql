-- 38_elena_hors_sujet.sql (13/11/2026)
-- Ajoute les nouvelles formulations de la reponse "hors sujet" d'Elena
-- (meteo, sport, recette, blague...) a la ligne deja inseree par le fichier 37.
-- Aucun texte de reponse ne change. Sans effet si la ligne n'existe pas.
UPDATE public.faqs
SET variants_fr = ARRAY['météo', 'recette', 'sport', 'politique', 'blague', 'quel temps fera-t-il', 'météo demain', 'il va pleuvoir', 'match de foot', 'résultat du match', 'recette de cuisine', 'raconte une blague', 'élections', 'weather', 'football', 'recipe', 'joke', 'Wetter', 'Fußball', 'Rezept', 'Witz']::text[]
WHERE page_key = 'elena'
  AND question_fr = 'Question sans rapport avec l''immobilier';

-- Controle : doit afficher 1 ligne avec 21 formulations.
SELECT question_fr, cardinality(variants_fr) AS nb_formulations
FROM public.faqs
WHERE page_key = 'elena' AND question_fr = 'Question sans rapport avec l''immobilier';
