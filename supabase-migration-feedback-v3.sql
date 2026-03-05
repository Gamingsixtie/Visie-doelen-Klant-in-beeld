-- ============================================
-- MIGRATION V3: Versiegeschiedenis voor geconsolideerde wijzigingen
-- Run dit in de Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/vgnozkdrndjmqeqrmhhh/sql/new
-- ============================================

-- 1. Versiegeschiedenis kolom voor consolidated changes
ALTER TABLE feedback_rounds
  ADD COLUMN IF NOT EXISTS consolidated_changes_history JSONB DEFAULT '[]';
