import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://vgnozkdrndjmqeqrmhhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbm96a2RybmRqbXFlcXJtaGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTkyMTIsImV4cCI6MjA4Nzc3NTIxMn0.gYWWZXiCB2bp18ducAfmpDIoRqjxgcmT-5v3YF1N1wI';

const data = JSON.parse(readFileSync('public/sessies-backup.json', 'utf-8'));
const texts = data.kib_approved_texts || [];

async function importTexts() {
  for (const t of texts) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/approved_texts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: t.id,
        session_id: t.sessionId,
        question_type: t.questionType,
        text: t.text,
        approved_at: t.approvedAt,
        based_on_proposal_id: null,
        based_on_variant_id: t.basedOnVariantId
      })
    });
    if (!res.ok) {
      console.log('ERROR:', await res.text());
    } else {
      console.log('OK:', t.questionType, '(session:', t.sessionId.substring(0, 8) + '...)');
    }
  }
}

importTexts();
