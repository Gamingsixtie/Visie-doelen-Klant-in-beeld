// Import sessie backup data naar Supabase
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://vgnozkdrndjmqeqrmhhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbm96a2RybmRqbXFlcXJtaGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTkyMTIsImV4cCI6MjA4Nzc3NTIxMn0.gYWWZXiCB2bp18ducAfmpDIoRqjxgcmT-5v3YF1N1wI';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  ERROR inserting into ${table}:`, err);
    return null;
  }
  const result = await res.json();
  console.log(`  OK: inserted ${Array.isArray(data) ? data.length : 1} row(s) into ${table}`);
  return result;
}

async function main() {
  console.log('Reading backup file...');
  const backup = JSON.parse(readFileSync('public/sessies-backup.json', 'utf-8'));

  // 1. Import sessions
  console.log('\n=== IMPORTING SESSIONS ===');
  const sessions = backup.kib_sessions || [];
  for (const s of sessions) {
    await supabaseInsert('sessions', {
      id: s.id,
      name: s.name,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      status: s.status,
      current_step: s.currentStep
    });
  }

  // 2. Import documents
  console.log('\n=== IMPORTING DOCUMENTS ===');
  const documents = backup.kib_documents || [];
  for (const d of documents) {
    await supabaseInsert('documents', {
      id: d.id,
      session_id: d.sessionId,
      filename: d.filename,
      respondent_id: d.respondentId,
      respondent_name: d.respondentId,
      raw_text: d.rawText,
      uploaded_at: d.uploadedAt,
      parsed_responses: d.parsedResponses
    });
  }

  // 3. Import analyses
  console.log('\n=== IMPORTING ANALYSES ===');
  const analyses = backup.kib_analyses || [];
  for (const a of analyses) {
    await supabaseInsert('analyses', {
      id: a.id,
      session_id: a.sessionId,
      question_type: a.questionType,
      analyzed_at: a.analyzedAt,
      themes: a.themes || [],
      quick_wins: a.quickWins || [],
      discussion_points: a.discussionPoints || []
    });
  }

  // 4. Import proposals
  console.log('\n=== IMPORTING PROPOSALS ===');
  const proposals = backup.kib_proposals || [];
  for (const p of proposals) {
    await supabaseInsert('proposals', {
      id: p.id,
      session_id: p.sessionId,
      question_type: p.questionType,
      theme_id: p.themeId || null,
      variants: p.variants || [],
      status: p.status,
      created_at: p.createdAt,
      approved_at: p.approvedAt || null,
      approved_variant_id: p.approvedVariantId || null,
      recommendation: p.recommendation || null,
      recommendation_rationale: p.recommendationRationale || null
    });
  }

  // 5. Import votes
  console.log('\n=== IMPORTING VOTES ===');
  const votes = backup.kib_votes || [];
  for (const v of votes) {
    await supabaseInsert('votes', {
      id: v.id,
      session_id: v.sessionId,
      proposal_id: v.proposalId,
      variant_id: v.variantId,
      respondent_id: v.respondentId,
      value: v.value,
      comment: v.comment || null,
      voted_at: v.votedAt
    });
  }

  // 6. Import approved texts
  console.log('\n=== IMPORTING APPROVED TEXTS ===');
  const approvedTexts = backup.kib_approved_texts || [];
  for (const t of approvedTexts) {
    await supabaseInsert('approved_texts', {
      id: t.id,
      session_id: t.sessionId,
      question_type: t.questionType,
      text: t.text,
      approved_at: t.approvedAt,
      based_on_proposal_id: t.basedOnProposalId,
      based_on_variant_id: t.basedOnVariantId
    });
  }

  console.log('\n=== IMPORT COMPLETE ===');

  // Verify
  console.log('\nVerifying...');
  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/sessions?select=id,name,created_at,status`, { headers });
  const verifySessions = await verifyRes.json();
  console.log(`Sessions in Supabase: ${verifySessions.length}`);
  verifySessions.forEach(s => console.log(`  - ${s.name} (${s.status}) - ${s.created_at}`));
}

main().catch(console.error);
