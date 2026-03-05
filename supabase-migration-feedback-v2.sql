-- ============================================
-- MIGRATION V2: Feedback systeem upgrade met fases, facilitator, AI consolidatie
-- Run dit in de Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/vgnozkdrndjmqeqrmhhh/sql/new
-- ============================================

-- 1. Nieuwe kolommen aan feedback_rounds
ALTER TABLE feedback_rounds
  ADD COLUMN IF NOT EXISTS facilitator_name TEXT,
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'collecting',
  ADD COLUMN IF NOT EXISTS consolidated_changes JSONB;

-- 2. Migreer bestaande data
UPDATE feedback_rounds SET phase = 'collecting' WHERE status = 'open' AND phase IS NULL;
UPDATE feedback_rounds SET phase = 'approved' WHERE status = 'closed' AND phase IS NULL;

-- 3. Nieuwe tabel voor stemmen op geconsolideerde wijzigingen
CREATE TABLE IF NOT EXISTS change_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES feedback_rounds(id) ON DELETE CASCADE,
  change_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  value TEXT NOT NULL CHECK (value IN ('agree', 'disagree', 'abstain')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, change_id, member_name)
);

-- 4. RLS voor change_votes
ALTER TABLE change_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for change_votes" ON change_votes FOR ALL USING (true) WITH CHECK (true);
