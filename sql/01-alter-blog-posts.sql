-- ═══════════════════════════════════════════════════════════════════
-- MAPA Property — Session 13 — Évolution table blog_posts
-- Ajout des colonnes multilingues + slug + tags + FAQ structurée
-- À exécuter dans Supabase SQL Editor une seule fois
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS title_fr TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_de TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_fr TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_en TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_de TEXT,
  ADD COLUMN IF NOT EXISTS content_fr TEXT,
  ADD COLUMN IF NOT EXISTS content_en TEXT,
  ADD COLUMN IF NOT EXISTS content_de TEXT,
  ADD COLUMN IF NOT EXISTS primary_tag TEXT,
  ADD COLUMN IF NOT EXISTS primary_tag_en TEXT,
  ADD COLUMN IF NOT EXISTS primary_tag_de TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Julien Brebion',
  ADD COLUMN IF NOT EXISTS faq_fr JSONB,
  ADD COLUMN IF NOT EXISTS faq_en JSONB,
  ADD COLUMN IF NOT EXISTS faq_de JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS meta_title_en TEXT,
  ADD COLUMN IF NOT EXISTS meta_description_en TEXT,
  ADD COLUMN IF NOT EXISTS meta_title_de TEXT,
  ADD COLUMN IF NOT EXISTS meta_description_de TEXT;

-- Index pour la recherche rapide par slug
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
