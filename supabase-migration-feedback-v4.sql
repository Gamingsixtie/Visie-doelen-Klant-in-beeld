-- Migration v4: Add step_type to feedback_rounds for generic step feedback
ALTER TABLE feedback_rounds ADD COLUMN IF NOT EXISTS step_type TEXT DEFAULT 'doelen';
