// Populate goal clusters with original respondent goals
// Maps each respondent's goal_1, goal_2, goal_3 to the appropriate AI-generated clusters

const SUPABASE_URL = 'https://vgnozkdrndjmqeqrmhhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbm96a2RybmRqbXFlcXJtaGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTkyMTIsImV4cCI6MjA4Nzc3NTIxMn0.gYWWZXiCB2bp18ducAfmpDIoRqjxgcmT-5v3YF1N1wI';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const SESSION_ID = '019c0235-39e6-46c7-b906-e6483aeea52e';

// Original goals from the 4 respondents
const respondentGoals = {
  'Saila/Jasper': {
    respondentId: 'Canvas_Saila_Jasper_zakelijk_Final',
    goal_1: '(Zeer) relevant zijn voor (de vraagstukken/uitdagingen van) onze klanten',
    goal_2: 'Structureel hogere (of hoge indien huidige status onbekend) klanttevredenheid, van minimaal een 8. Significante stijging in het aantal doorgevoerde verbeterinitiatieven / redesigns vanuit de klantreis (groei in vernieuwing / nieuwe producten / verbetering van de dienstverlening, kortere time to market)',
    goal_3: 'Voldoende klantinzicht om een ambassadeursprogramma vorm te kunnen geven (klantpanels, klantverhalen, cocreatie, kto-respons, klantendagen etc). Hygienevoorwaarden: één integraal klantbeeld + medewerkers die zich competent voelen + een uniforme aanpak.'
  },
  'Cornelis': {
    respondentId: 'Cornelis Richter',
    goal_1: 'We beloven wat we uitdragen in onze missie: we maken leren zichtbaar.',
    goal_2: 'We gebruiken de beschikbare data over het leerproces in nieuwe proposities in de vorm van modules/features in bestaande producten.',
    goal_3: 'We besteden max 25% van onze ontwikkelcapaciteit voor het onderhouden van onze digitale producten. Dit is inclusief het ondersteunen van reguliere campagnes.'
  },
  'Leontine': {
    respondentId: 'Leontine (Sectormanager PO)',
    goal_1: 'Medewerkers voelen zich competent en zelfverzekerd in outside-in werken. Ze kunnen de juiste vragen stellen en doorvragen naar de vraag achter de vraag.',
    goal_2: 'Eén integraal en toegankelijk klantbeeld beschikbaar voor alle medewerkers met klantcontact.',
    goal_3: 'Nieuwe proposities ontwikkelen en valideren samen met klanten. Cito durft te experimenteren en betrekt klanten structureel bij het toetsen van nieuwe ideeën, inclusief het ophalen van wensen en tevredenheid.'
  },
  'Bert Thijs': {
    respondentId: 'Bert Thijs (Sectormanager VO)',
    goal_1: 'Marktleider worden in Leerling in Beeld voor het VO, met een succesvolle migratie naar Woots in 2028. We hebben structureel goed zicht op klantwensen en klantbehoeften en durven meer te experimenteren met nieuwe mogelijkheden.',
    goal_2: 'De KLT-markt vasthouden en tegelijkertijd doorontwikkelen in examens. We werken iteratief aan nieuwe typen opgaven en examens, in samenwerking met partnerscholen.',
    goal_3: 'Medewerkers voelen zich competent in outside-in werken. Concreet betekent dit onder andere dat alle toetsdeskundigen verplicht schoolbezoeken afleggen om de praktijk te ervaren.'
  }
};

// Mapping: which respondent goals belong to which cluster
const clusterGoalMapping = {
  'goal-cluster-1': [ // Outside-in competenties ontwikkelen
    { respondent: 'Leontine', goalKey: 'goal_1', priority: 1 },
    { respondent: 'Bert Thijs', goalKey: 'goal_3', priority: 3 }
  ],
  'goal-cluster-2': [ // Eén integraal klantbeeld realiseren
    { respondent: 'Leontine', goalKey: 'goal_2', priority: 2 }
  ],
  'goal-cluster-3': [ // Klantrelevantie en waardecreatie maximaliseren
    { respondent: 'Saila/Jasper', goalKey: 'goal_1', priority: 1 },
    { respondent: 'Cornelis', goalKey: 'goal_1', priority: 1 }
  ],
  'goal-cluster-4': [ // Structureel hogere klanttevredenheid behalen
    { respondent: 'Saila/Jasper', goalKey: 'goal_2', priority: 2 }
  ],
  'goal-cluster-5': [ // Co-creatie en klantpartnerschap opbouwen
    { respondent: 'Leontine', goalKey: 'goal_3', priority: 3 },
    { respondent: 'Saila/Jasper', goalKey: 'goal_3', priority: 3 }
  ],
  'goal-cluster-6': [ // Data-gedreven innovatie doorvoeren
    { respondent: 'Cornelis', goalKey: 'goal_2', priority: 2 }
  ],
  'goal-cluster-7': [ // Marktpositie verstevigen en uitbreiden
    { respondent: 'Bert Thijs', goalKey: 'goal_1', priority: 1 },
    { respondent: 'Bert Thijs', goalKey: 'goal_2', priority: 2 }
  ],
  'goal-cluster-8': [ // Ontwikkelefficiëntie optimaliseren
    { respondent: 'Cornelis', goalKey: 'goal_3', priority: 3 }
  ]
};

async function main() {
  // 1. Fetch current session flow_state from Supabase
  console.log('Fetching current session data...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${SESSION_ID}&select=id,name,flow_state`, {
    headers
  });
  const sessions = await res.json();
  if (!sessions.length) {
    console.error('Session not found!');
    return;
  }

  const session = sessions[0];
  console.log(`Session: ${session.name}`);

  const flowStateData = session.flow_state || {};
  const goalClusters = flowStateData.goalClusters || {};
  const clusters = goalClusters.clusters || [];

  console.log(`Found ${clusters.length} clusters`);

  // 2. Populate goals arrays in each cluster
  for (const cluster of clusters) {
    const mapping = clusterGoalMapping[cluster.id];
    if (!mapping) {
      console.log(`  No mapping for cluster: ${cluster.id} (${cluster.name})`);
      continue;
    }

    cluster.goals = mapping.map(m => ({
      respondentId: respondentGoals[m.respondent].respondentId,
      respondentName: m.respondent,
      text: respondentGoals[m.respondent][m.goalKey],
      priority: m.priority
    }));

    console.log(`  ${cluster.name}: ${cluster.goals.length} goals added`);
    for (const g of cluster.goals) {
      console.log(`    - ${g.respondentName} (prio ${g.priority}): ${g.text.substring(0, 60)}...`);
    }
  }

  // 3. Write updated flow_state back to Supabase
  goalClusters.clusters = clusters;
  flowStateData.goalClusters = goalClusters;

  console.log('\nUpdating Supabase...');
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${SESSION_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ flow_state: flowStateData })
  });

  if (!updateRes.ok) {
    console.error('ERROR:', await updateRes.text());
  } else {
    const result = await updateRes.json();
    console.log('OK: Goal clusters updated with original respondent goals!');

    // Verify
    const verifyGoals = result[0]?.flow_state?.goalClusters?.clusters;
    if (verifyGoals) {
      let totalGoals = 0;
      for (const c of verifyGoals) {
        totalGoals += (c.goals || []).length;
      }
      console.log(`Verification: ${totalGoals} goals across ${verifyGoals.length} clusters`);
    }
  }
}

main();
