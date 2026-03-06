-- ============================================
-- MIGRATION V5: Feedback "klaar" + Async Dot Voting
-- Run dit in de Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/vgnozkdrndjmqeqrmhhh/sql/new
-- ============================================

-- 1. Member ready tracking voor feedback rondes
ALTER TABLE feedback_rounds ADD COLUMN IF NOT EXISTS member_ready JSONB DEFAULT '[]';

-- 2. Dot votes tabel voor async dot voting
CREATE TABLE IF NOT EXISTS dot_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  dots INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, member_name, cluster_id)
);

-- 3. Ready status voor dot voting
CREATE TABLE IF NOT EXISTS dot_voting_ready (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, member_name)
);

-- 4. RLS policies
ALTER TABLE dot_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dot_voting_ready ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for dot_votes" ON dot_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for dot_voting_ready" ON dot_voting_ready FOR ALL USING (true) WITH CHECK (true);
