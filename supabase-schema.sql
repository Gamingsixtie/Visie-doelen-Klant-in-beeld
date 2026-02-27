-- ============================================
-- SUPABASE DATABASE SCHEMA
-- Klant in Beeld - Consolidatie App
-- ============================================

-- Sessions tabel - houdt consolidatie sessies bij
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  current_step TEXT DEFAULT 'upload',
  flow_state JSONB DEFAULT '{}'::jsonb
);

-- Documents tabel - geuploadde MT canvas documenten
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  respondent_id TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  respondent_role TEXT DEFAULT 'Overig',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  raw_text TEXT NOT NULL,
  parsed_responses JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Analyses tabel - AI thema analyses per vraag
CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  tensions JSONB DEFAULT '[]'::jsonb,
  quick_wins JSONB DEFAULT '[]'::jsonb,
  discussion_points JSONB DEFAULT '[]'::jsonb,
  UNIQUE(session_id, question_type)
);

-- Proposals tabel - AI gegenereerde formuleringsvoorstellen
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  theme_id TEXT,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'voting', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_variant_id TEXT,
  recommendation TEXT,
  recommendation_rationale TEXT
);

-- Votes tabel - stemmen op voorstellen
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  respondent_id TEXT NOT NULL,
  value TEXT NOT NULL CHECK (value IN ('agree', 'disagree', 'abstain')),
  comment TEXT,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, variant_id, respondent_id)
);

-- Approved texts tabel - goedgekeurde formuleringen
CREATE TABLE IF NOT EXISTS approved_texts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  text TEXT NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  based_on_proposal_id UUID REFERENCES proposals(id),
  based_on_variant_id TEXT NOT NULL,
  UNIQUE(session_id, question_type)
);

-- Indexes voor snelle queries
CREATE INDEX IF NOT EXISTS idx_documents_session ON documents(session_id);
CREATE INDEX IF NOT EXISTS idx_analyses_session ON analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_proposals_session ON proposals(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_approved_texts_session ON approved_texts(session_id);

-- Row Level Security (RLS) policies
-- Voor nu public access, later aanpassen voor authenticatie

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_texts ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (voor development)
CREATE POLICY "Public access sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access analyses" ON analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access votes" ON votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access approved_texts" ON approved_texts FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger functie
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger voor sessions updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
