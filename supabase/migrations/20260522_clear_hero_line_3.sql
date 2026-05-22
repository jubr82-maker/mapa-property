-- MAPA Property — CHARLIE (Sprint 1 multi-agent)
-- Vide la clé CMS home.hero.title_line_3 dans site_content pour les 3
-- locales. Cause : l'override CMS Supabase contenait encore "TOTAL
-- CONTRÔLE." / "TOTAL CONTROL." / "VOLLE KONTROLLE.", qui prenait le pas
-- sur le fallback i18n (messages/*.json déjà mis à "" en STEP3c-1-bis).
-- Le Hero affiche désormais 2 lignes (L'IMMOBILIER / TROIS ÉTAPES,) sans
-- 3e ligne.
--
-- À APPLIQUER MANUELLEMENT par Julien dans Supabase Studio (SQL Editor).
-- Aucune écriture DB automatique côté code (règle projet).
--
-- Schema rappel : public.site_content (key TEXT, locale TEXT CHECK
-- ('fr','en','de'), content TEXT NOT NULL, content_type TEXT…).
-- NB : content est NOT NULL → on met chaîne vide '' (pas NULL).

UPDATE public.site_content
SET content = ''
WHERE key = 'home.hero.title_line_3'
  AND locale IN ('fr', 'en', 'de');

-- Vérification post-update (optionnel) :
-- SELECT key, locale, content FROM public.site_content
-- WHERE key = 'home.hero.title_line_3';
