ALTER TABLE estimation_requests
  ADD COLUMN IF NOT EXISTS refinement_sent_at timestamptz;
