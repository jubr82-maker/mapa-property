-- ============================================================================
-- MAPA Property — Table documents (Chantier C7)
-- 11 mai 2026. Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  file_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents (category);
CREATE INDEX IF NOT EXISTS idx_documents_is_public
  ON public.documents (is_public)
  WHERE is_public = TRUE;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_public_read" ON public.documents;
CREATE POLICY "documents_public_read"
  ON public.documents FOR SELECT
  USING (is_public = TRUE);

DROP POLICY IF EXISTS "documents_admin_all" ON public.documents;
CREATE POLICY "documents_admin_all"
  ON public.documents FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Bucket Storage documents (privé)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_storage_public_read" ON storage.objects;
CREATE POLICY "documents_storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_storage_admin_write" ON storage.objects;
CREATE POLICY "documents_storage_admin_write"
  ON storage.objects FOR ALL
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
