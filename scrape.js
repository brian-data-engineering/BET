const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sportMapping = {
  'soccer': 1,
  'ice-hockey': 2,
  'basketball': 3,
  'tennis': 4,
  'table-tennis': 10
};

async function syncLinebet() {
  console.log("--- 🔍 DATA STRUCTURE INVESTIGATION START ---");

  const now = Math.floor(Date.now() / 1000);
  const roundedTo = Math.floor(now / 3600) * 3600; 
  const roundedFrom = roundedTo - 86400; 

  for (const [sportKey, sportId] of Object.entries(sportMapping)) {
    console.log(`\n--- 📊 ANALYZING ${sportKey.toUpperCase()} ---`);
    let matchCount = 0;
    
    const champUrl = `https://linebet.com/service-api/result/web/api/v2/champs?dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189&sportIds=${sportId}`;
    
    try {
      const champRes = await fetch(champUrl);
      const champData = await champRes.json();
      const leagues = champData.items || [];

      for (const league of leagues) {
        if (matchCount >= 10) break;

        const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${league.id}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
        const gamesRes = await fetch(gamesUrl);
        const gamesData = await gamesRes.json();
        const items = gamesData.items || [];

        for (const game of items) {
          if (matchCount >= 10) break;
          if (!game.score) continue;

          console.log(`[${sportKey}] ID: ${game.id} | ${game.opp1} vs ${game.opp2}`);
          console.log(`      RAW SCORE: "${game.score}"`);
          
          // Debugging the breakdown
          const periodPart = game.score.match(/\(([^)]+)\)/);
          if (periodPart) {
             console.log(`      BREAKDOWN: ${periodPart[1]}`);
          } else {
             console.log(`      BREAKDOWN: No sub-scores found (check if this is normal for ${sportKey})`);
          }
          console.log('      -----------------------------------');
          
          matchCount++;
        }
      }
    } catch (err) {
      console.error(`❌ ERROR in ${sportKey}:`, err.message);
    }
  }
}

syncLinebet();
