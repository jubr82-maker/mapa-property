-- MAPA Property — Sprint C3 (colonne subject sur leads)
--
-- Sprint B3 a introduit un <select> name='subject' sur le formulaire
-- /contact avec 6 sujets pre-cadres (mandat_vente, mandat_recherche,
-- estimation, mise_en_location, informations, offmarket_arcova).
--
-- Sprint C3 fix : ContactForm.onSubmit omettait `subject` du payload
-- (corrige). Mais la table leads n'avait PAS de colonne dediee — le
-- sujet n'aurait pas pu etre persiste meme si transmis.
--
-- Cette migration ajoute la colonne `subject` (TEXT NULLABLE pour
-- back-compat avec les formulaires NDA / mandat / offmarket qui
-- n'utilisent pas ce champ).
--
-- Fallback cote app : si la migration n'est pas encore appliquee,
-- /api/lead retire silencieusement le subject de l'INSERT (les autres
-- champs continuent d'etre persistes — jamais d'echec bloquant).
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- Index pour filtrer par sujet cote admin.
CREATE INDEX IF NOT EXISTS idx_leads_subject
  ON public.leads (subject)
  WHERE subject IS NOT NULL;

-- Verification post-migration (optionnel) :
-- SELECT subject, COUNT(*) FROM public.leads
--   WHERE subject IS NOT NULL
--   GROUP BY subject
--   ORDER BY COUNT(*) DESC;
