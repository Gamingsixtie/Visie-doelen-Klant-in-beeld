// Import flow_states, generated_vision, and goal_clusters into Supabase sessions.flow_state
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://vgnozkdrndjmqeqrmhhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbm96a2RybmRqbXFlcXJtaGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTkyMTIsImV4cCI6MjA4Nzc3NTIxMn0.gYWWZXiCB2bp18ducAfmpDIoRqjxgcmT-5v3YF1N1wI';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const data = JSON.parse(readFileSync('public/sessies-backup.json', 'utf-8'));

const flowStates = data.kib_flow_states || [];
const visions = data.kib_generated_vision || [];
const goalClusters = data.kib_goal_clusters || [];
const sessions = data.kib_sessions || [];

async function main() {
  for (const session of sessions) {
    const sid = session.id;
    console.log(`\n=== Session: ${session.name} (${sid.substring(0, 8)}) ===`);

    // Build combined flow_state object
    const combined = {};

    // Add flow state
    const fs = flowStates.find(f => f.sessionId === sid);
    if (fs) {
      combined.flowState = fs.state;
      console.log('  Flow state: step =', fs.state?.currentStep);
    }

    // Add generated vision
    const vision = visions.find(v => v.sessionId === sid);
    if (vision) {
      combined.generatedVision = {
        uitgebreid: vision.uitgebreid,
        beknopt: vision.beknopt,
        generatedAt: vision.generatedAt
      };
      console.log('  Vision: found (uitgebreid:', vision.uitgebreid?.length, 'chars)');
    }

    // Add goal clusters
    const gc = goalClusters.find(g => g.sessionId === sid);
    if (gc) {
      combined.goalClusters = {
        clusters: gc.clusters,
        selectedClusterIds: gc.selectedClusterIds,
        allVotes: gc.allVotes,
        ranking: gc.ranking,
        formulations: gc.formulations,
        phase: gc.phase,
        savedAt: gc.savedAt
      };
      console.log('  Goal clusters: found (', gc.clusters?.length, 'clusters)');
    }

    if (Object.keys(combined).length > 0) {
      // Update sessions.flow_state in Supabase
      const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sid}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ flow_state: combined })
      });
      if (!res.ok) {
        console.log('  ERROR:', await res.text());
      } else {
        console.log('  OK: saved to Supabase');
      }
    }
  }

  console.log('\n=== Done ===');
}

main();
