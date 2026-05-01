-- ═══════════════════════════════════════════════════════════════════
-- MAPA Property — Back-office admin setup
-- Session 14 : infrastructure admin (featured, tracking, policies)
-- ═══════════════════════════════════════════════════════════════════

-- ─── Ajout colonnes coups de cœur sur properties ───────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS featured_order SMALLINT;
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties (is_featured, featured_order) WHERE is_featured = true;

-- ─── Colonne statut sur reviews (pending / approved / rejected) ────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_by TEXT;
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status, review_date DESC);

-- Back-fill : si is_published = true alors status = 'approved', sinon 'pending'
UPDATE reviews SET status = CASE WHEN is_published THEN 'approved' ELSE 'pending' END WHERE status IS NULL OR status = 'pending';

-- ─── Colonnes leads : statut + notes admin ─────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status, created_at DESC);

ALTER TABLE mandat_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE mandat_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE mandat_requests ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_mandat_status ON mandat_requests (status, created_at DESC);

ALTER TABLE arcova_waitlist ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE arcova_waitlist ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE arcova_waitlist ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;

-- ─── Audit log (traces des actions admin) ──────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,                 -- 'publish', 'unpublish', 'approve', 'reject', 'create', 'update', 'delete'
  entity_type TEXT NOT NULL,            -- 'property', 'review', 'blog_post', 'lead', 'mandat_request'
  entity_id TEXT,
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_log (entity_type, entity_id);

-- ─── RLS (Row Level Security) pour sécurité admin ──────────────────
-- Note : les tables existantes ont déjà leurs politiques.
-- On s'assure juste que l'écriture admin passe via une policy authentifiée.

-- Active RLS sur audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy : seuls les users authentifiés peuvent insérer dans audit
DROP POLICY IF EXISTS "audit_insert_authenticated" ON admin_audit_log;
CREATE POLICY "audit_insert_authenticated" ON admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Policy : seuls les users authentifiés peuvent lire l'audit
DROP POLICY IF EXISTS "audit_read_authenticated" ON admin_audit_log;
CREATE POLICY "audit_read_authenticated" ON admin_audit_log
  FOR SELECT TO authenticated
  USING (true);

-- ─── Vérification ───────────────────────────────────────────────────
SELECT 'properties' AS table_name, 
       COUNT(*) FILTER (WHERE is_featured = true) AS featured_count,
       COUNT(*) FILTER (WHERE is_published = true) AS published_count,
       COUNT(*) AS total
FROM properties
UNION ALL
SELECT 'reviews', 
       COUNT(*) FILTER (WHERE status = 'approved'),
       COUNT(*) FILTER (WHERE status = 'pending'),
       COUNT(*)
FROM reviews
UNION ALL
SELECT 'leads', 
       COUNT(*) FILTER (WHERE status = 'new'),
       COUNT(*) FILTER (WHERE status = 'handled'),
       COUNT(*)
FROM leads
UNION ALL
SELECT 'mandat_requests', 
       COUNT(*) FILTER (WHERE status = 'new'),
       COUNT(*) FILTER (WHERE status = 'handled'),
       COUNT(*)
FROM mandat_requests;
