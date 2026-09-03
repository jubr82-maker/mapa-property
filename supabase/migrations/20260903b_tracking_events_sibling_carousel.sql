-- ============================================================================
-- MAPA Property — Ajout des événements sibling_carousel_view /
-- sibling_carousel_click au CHECK constraint de tracking_events. 3 sept. 2026.
--
-- NON EXÉCUTÉE PAR CLAUDE. À appliquer manuellement par Julien dans le
-- SQL Editor Supabase.
--
-- OBLIGATOIRE pour que le tracking du carrousel de suggestions fonctionne
-- réellement : app/api/track/route.ts (ligne ~85) insère dans
-- tracking_events sans vérifier l'erreur retournée par Supabase (design
-- volontaire "best-effort", cf. commentaire du fichier — ne jamais casser
-- l'UX visiteur sur un échec de tracking). Concrètement, tant que cette
-- migration n'est pas appliquée : le client envoie bien l'événement,
-- l'API répond 200 OK, MAIS l'INSERT échoue silencieusement côté Postgres
-- (violation du CHECK constraint existant) et AUCUNE ligne n'est écrite.
-- Rien ne le signale dans l'UI — seuls les logs Supabase le montreraient.
--
-- Aucune nouvelle table ni colonne nécessaire : event_data (JSONB)
-- accueille déjà les métadonnées (trigger_types, family, count, property_id,
-- property_slug) sans changement de schéma.
--
-- Idempotente : DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT peut être
-- rejouée sans erreur.
-- ============================================================================

ALTER TABLE public.tracking_events
  DROP CONSTRAINT IF EXISTS tracking_events_event_type_check;

ALTER TABLE public.tracking_events
  ADD CONSTRAINT tracking_events_event_type_check CHECK (event_type IN (
    'page_view',
    'cta_click',
    'form_step_complete',
    'form_submit',
    'contact_reveal',
    'property_view',
    'property_favorite',
    'estimation_compute',
    'emprunt_simulate',
    'rendement_simulate',
    'search_query',
    'scroll_depth_75',
    'exit_intent',
    'bounce',
    'sibling_carousel_view',
    'sibling_carousel_click'
  ));

-- ============================================================================
-- Vérification post-migration (à lancer manuellement, informatif) :
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.tracking_events'::regclass
--   AND contype = 'c';
--
-- Doit lister tracking_events_event_type_check avec les 16 valeurs
-- ci-dessus (14 existantes + 2 nouvelles).
-- ============================================================================
