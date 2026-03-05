-- ============================================
-- MIGRATION: Feedback tabellen voor async MT doelen-feedback
-- Run dit in de Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/vgnozkdrndjmqeqrmhhh/sql/new
-- ============================================

-- Feedbackronde: snapshot van doelen die ter feedback staan
CREATE TABLE IF NOT EXISTS feedback_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  source_clusters JSONB NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suggesties van MT-leden
CREATE TABLE IF NOT EXISTS feedback_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES feedback_rounds(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('priority', 'text_edit', 'merge', 'comment')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stemmen op suggesties (accept/reject)
CREATE TABLE IF NOT EXISTS suggestion_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES feedback_suggestions(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  value TEXT NOT NULL CHECK (value IN ('accept', 'reject')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suggestion_id, member_name)
);

-- Enable RLS met publieke toegang (zelfde als andere tabellen)
ALTER TABLE feedback_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for feedback_rounds" ON feedback_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for feedback_suggestions" ON feedback_suggestions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for suggestion_votes" ON suggestion_votes FOR ALL USING (true) WITH CHECK (true);
