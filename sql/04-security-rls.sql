-- ═══════════════════════════════════════════════════════════════════
-- MAPA Property — Renforcement RLS Supabase
-- Session 14 : Protection RGPD + anti-scraping
-- ═══════════════════════════════════════════════════════════════════
--
-- À exécuter UNE FOIS dans le SQL Editor de Supabase.
-- Ce script renforce les Row Level Security (RLS) policies pour que
-- les données privées ne soient JAMAIS exposées via l'API publique.
--
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Table properties : biens immobiliers
-- ─────────────────────────────────────────────────────────────────
-- Policy : n'exposer que les biens `is_published = true` à l'anon role

ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_published" ON properties;
CREATE POLICY "anon_read_published" ON properties
  FOR SELECT
  TO anon
  USING (is_published = true);

-- Interdire l'insert/update/delete à l'anon
DROP POLICY IF EXISTS "anon_no_write" ON properties;

-- ─────────────────────────────────────────────────────────────────
-- 2. Table blog_posts : articles de blog
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_published_blog" ON blog_posts;
CREATE POLICY "anon_read_published_blog" ON blog_posts
  FOR SELECT
  TO anon
  USING (is_published = true);

-- ─────────────────────────────────────────────────────────────────
-- 3. Table reviews : avis clients
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_published_reviews" ON reviews;
CREATE POLICY "anon_read_published_reviews" ON reviews
  FOR SELECT
  TO anon
  USING (is_published = true);

-- ─────────────────────────────────────────────────────────────────
-- 4. Table arcova_waitlist : waitlist ARCOVA
-- ─────────────────────────────────────────────────────────────────
-- anon PEUT insérer (formulaire public) mais ne peut pas lire la liste

ALTER TABLE IF EXISTS arcova_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_waitlist" ON arcova_waitlist;
CREATE POLICY "anon_insert_waitlist" ON arcova_waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_waitlist" ON arcova_waitlist;
CREATE POLICY "auth_read_waitlist" ON arcova_waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- PAS de policy SELECT pour anon → ils ne peuvent jamais lire la waitlist

-- ─────────────────────────────────────────────────────────────────
-- 5. Table property_images : photos des biens
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_images" ON property_images;
CREATE POLICY "anon_read_images" ON property_images
  FOR SELECT
  TO anon
  USING (
    property_id IN (
      SELECT id FROM properties WHERE is_published = true
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- 6. Protection : révoquer les permissions dangereuses de l'anon
-- ─────────────────────────────────────────────────────────────────

-- L'anon ne doit JAMAIS pouvoir modifier quoi que ce soit
REVOKE INSERT, UPDATE, DELETE ON properties FROM anon;
REVOKE INSERT, UPDATE, DELETE ON blog_posts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON reviews FROM anon;
REVOKE UPDATE, DELETE ON arcova_waitlist FROM anon;
REVOKE INSERT, UPDATE, DELETE ON property_images FROM anon;

-- Empêcher l'anon d'exécuter des fonctions dangereuses
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Le seul role qui peut TOUT faire = authenticated (admin back-office)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- 7. Vérification
-- ─────────────────────────────────────────────────────────────────

-- Lister toutes les policies actives
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Vérifier que RLS est activé sur toutes les tables sensibles
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('properties','blog_posts','reviews','arcova_waitlist','property_images');

-- ═══════════════════════════════════════════════════════════════════
-- RÉSUMÉ :
--   - anon (API publique) : peut SEULEMENT lire les données is_published=true
--   - anon : peut INSERT uniquement dans arcova_waitlist (formulaire)
--   - authenticated (back-office admin) : full access
-- ═══════════════════════════════════════════════════════════════════
