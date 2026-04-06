const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapping your Internal sport_key to Linebet IDs
const sportMapping = {
  'soccer': 1,
  'basketball': 3,
  'ice-hockey': 2,
  'tennis': 4,
  'table-tennis': 10
};

async function syncLinebet() {
  console.log("--- 🏁 STARTING TARGETED SYNC ---");

  // STEP 1: Get unique sports and countries from pending tickets
  const { data: pendingTickets, error: ticketError } = await supabase
    .from('print')
    .select('sport_key, country')
    .eq('status', 'pending');

  if (ticketError || !pendingTickets.length) {
    console.log("No pending tickets found. Skipping sync.");
    return;
  }

  // Gracefully handle nulls and extract unique values
  const activeSports = [...new Set(pendingTickets
    .map(t => t.sport_key?.toLowerCase())
    .filter(s => s && sportMapping[s])
  )];

  const activeCountries = [...new Set(pendingTickets
    .flatMap(t => t.country ? t.country.split(', ') : [])
    .filter(c => c && c !== 'Unknown')
  )];

  console.log(`📊 WORKLOAD: ${activeSports.length} Sports | ${activeCountries.length} Countries`);
  console.log(`🎯 TARGET COUNTRIES: ${activeCountries.join(', ') || 'Global Scan'}`);

  const now = Math.floor(Date.now() / 1000);
  const roundedTo = Math.floor(now / 3600) * 3600; 
  const roundedFrom = roundedTo - 86400; // Last 24 hours

  // STEP 2: Loop only through active sports
  for (const sportKey of activeSports) {
    const sportId = sportMapping[sportKey];
    console.log(`\n--- ⚽ Processing ${sportKey.toUpperCase()} (ID: ${sportId}) ---`);
    
    const champUrl = `https://linebet.com/service-api/result/web/api/v2/champs?dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189&sportIds=${sportId}`;
    
    try {
      const champRes = await fetch(champUrl);
      const champData = await champRes.json();
      const allLeagues = champData.items || [];
      
      // STEP 3: Filter leagues by active countries
      const filteredLeagues = allLeagues.filter(league => {
        if (activeCountries.length === 0) return true; // Global scan if no countries specified
        return activeCountries.some(country => league.name.includes(country));
      });

      console.log(`Filtered ${allLeagues.length} leagues down to ${filteredLeagues.length} matching countries.`);

      for (const league of filteredLeagues) {
        const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${league.id}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
        
        const gamesRes = await fetch(gamesUrl);
        const gamesData = await gamesRes.json();
        const items = gamesData.items || [];

        if (items.length > 0) {
          console.log(` > ${league.name}: Found ${items.length} games.`);
          
          for (const game of items) {
            if (!game.score) continue; // Skip if game hasn't finished/has no score

            const mainScore = game.score.split(' ')[0]; 
            const scores = mainScore.split(':');
            const homeScore = parseInt(scores[0]);
            const awayScore = parseInt(scores[1]);

            // Logic to verify we have actual numbers
            if (!isNaN(homeScore) && !isNaN(awayScore)) {
               console.log(`   [RESULT] ${game.opp1} ${homeScore}:${awayScore} ${game.opp2} (ID: ${game.id})`);
               
               // Here we will call the settlement function in the next step
               // await updateMatchResults(game.id, homeScore, awayScore);
            }
          }
        }
      }
    } catch (err) {
      console.error(`❌ ERROR in ${sportKey}:`, err.message);
    }
  }
}

syncLinebet();
