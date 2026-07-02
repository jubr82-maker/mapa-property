-- MAPA Property — Sécurisation off-market, ÉTAPE 1/3 : étendre la VIEW publique
-- 1er juillet 2026.
--
-- OBJECTIF (étape 1 seulement) : ajouter à properties_offmarket_public les
-- champs publics dont la fiche détail a besoin (texte i18n, description,
-- highlights, prix, médias), REDACTÉS, pour qu'à l'étape 2 les fetchers
-- puissent lire UNIQUEMENT la vue au lieu de la table brute, puis à l'étape 3
-- couper l'anon sur la table de base.
--
-- CETTE ÉTAPE NE COUPE RIEN et NE CASSE RIEN : on ne fait qu'AJOUTER des
-- colonnes à la vue (CREATE OR REPLACE). Les fetchers (lib/data.ts) et les
-- policies RLS ne sont PAS touchés ici (étapes 2 et 3).
--
-- RÈGLES DE REDACTION :
--   - ville      : COALESCE(city_label, 'Confidentiel')  [inchangé]
--   - médias     : cover/gallery/video -> NULL si photos_locked
--   - prix exact : price_estimate/min/max -> NULL si price_on_demand
--   - JAMAIS exposés : city_real, district_label, internal_notes, internal_ref,
--     signed_mandate_url, created_by, views_count, requests_count,
--     last_request_at, exclusive_until, is_strict_offmarket,
--     show_to_qualified_only, apartments_details, office_details,
--     mixed_breakdown, floors_breakdown.
--
-- Tous les champs ajoutés ont été vérifiés présents dans la table de base.
--
-- POURQUOI DROP + CREATE (et pas CREATE OR REPLACE) :
--   CREATE OR REPLACE VIEW ne peut qu'AJOUTER des colonnes A LA FIN, sans
--   reordonner/renommer les existantes. Comme on insère des champs au milieu
--   (i18n, prix, médias), Postgres refuse ("cannot change name of view column
--   ... to ..."). On recrée donc proprement la vue.
--
-- DÉPENDANCES : aucun objet SQL ne dépend de cette vue (seuls les fetchers TS
--   la lisent via l'API REST, ce qui n'est pas une dépendance SQL). LANCER LA
--   REQUÊTE DE CONTRÔLE ci-dessous AVANT le DROP : elle doit renvoyer 0 ligne.
--   NE PAS utiliser DROP ... CASCADE.
--
--   -- Contrôle dépendances (doit renvoyer 0 ligne) :
--   SELECT DISTINCT dependent.relname AS objet_dependant, dependent.relkind
--     FROM pg_depend d
--     JOIN pg_rewrite r   ON r.oid = d.objid
--     JOIN pg_class dependent ON dependent.oid = r.ev_class
--     JOIN pg_class src   ON src.oid = d.refobjid
--    WHERE src.relname = 'properties_offmarket_public'
--      AND dependent.relname <> 'properties_offmarket_public';
--
-- A APPLIQUER MANUELLEMENT dans Supabase Studio (SQL Editor).

DROP VIEW IF EXISTS public.properties_offmarket_public;

CREATE VIEW public.properties_offmarket_public AS
SELECT
  id,
  reference,
  country,
  -- Redaction ville (inchangé) : jamais city_real ni district_label.
  COALESCE(city_label, 'Confidentiel') AS city_anonymized,
  property_type,
  sub_type,
  COALESCE(surface_hab, 0)             AS surface_habitable,
  surface_utile,
  surface_ponderee,
  surface_terrain,
  bedrooms                              AS chambres,
  bureaux,
  bathrooms                             AS salles_de_bain,
  douches,
  wc,
  cuisine,
  cuisine_m2,
  locaux_stockage,
  buanderie,
  dressing,
  terrasse_m2,
  balcon_m2,
  jardin_m2,
  has_piscine,
  parking_exterieur,
  parking_interieur,
  box,
  garage,
  energy_class                          AS classe_energetique,

  -- ── Texte public (base FR déjà exposée) + variantes i18n AJOUTÉES ──
  title,
  title_en,
  title_de,
  COALESCE(short_pitch, '')             AS short_description,
  short_pitch_en,
  short_pitch_de,
  description,
  description_en,
  description_de,
  highlights,
  highlights_en,
  highlights_de,

  -- ── Prix : label public + AJOUT des champs bruts, exacts redactés si "sur demande" ──
  price_mode,
  COALESCE(price_label, price_display, 'Prix sur demande') AS price_label,
  price_display,
  price_custom_text,
  price_on_demand,
  CASE WHEN price_on_demand THEN NULL ELSE price_estimate END AS price_estimate,
  CASE WHEN price_on_demand THEN NULL ELSE price_min END      AS price_min,
  CASE WHEN price_on_demand THEN NULL ELSE price_max END      AS price_max,

  -- ── Médias : gated sur photos_locked (cover inchangé, gallery + video AJOUTÉS) ──
  CASE WHEN photos_locked THEN NULL ELSE cover_image_url END AS cover_image_url,
  CASE WHEN photos_locked THEN NULL ELSE gallery_urls END    AS gallery_urls,
  CASE WHEN photos_locked THEN NULL ELSE video_url END       AS video_url,

  status,
  created_at,
  display_order,
  is_coup_de_coeur,
  -- Composition immeuble : agrégats publics uniquement (les *_details JSONB
  -- confidentiels ne sont JAMAIS exposés).
  composition_commerces,
  composition_bureaux,
  composition_logements
FROM public.properties_offmarket
WHERE is_published = TRUE AND status = 'published';

-- ── Vérifications post-migration ──
-- 1) Colonnes exposées (doit inclure les nouveaux champs, PAS les internes) :
--    SELECT * FROM public.properties_offmarket_public LIMIT 1;
-- 2) Aucune colonne interne ne doit exister dans la vue :
--    SELECT column_name FROM information_schema.columns
--      WHERE table_name = 'properties_offmarket_public'
--        AND column_name IN ('city_real','district_label','internal_notes',
--          'internal_ref','signed_mandate_url','created_by','views_count',
--          'requests_count','last_request_at','exclusive_until',
--          'is_strict_offmarket','show_to_qualified_only','apartments_details',
--          'office_details','mixed_breakdown','floors_breakdown');
--    -> doit renvoyer 0 ligne.
