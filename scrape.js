const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sports = [
  { id: 1, name: 'Football' },
  { id: 3, name: 'Basketball' },
  { id: 2, name: 'Ice Hockey' },
  { id: 4, name: 'Tennis' },
  { id: 10, name: 'Table Tennis' }
];

async function syncLinebet() {
  const now = Math.floor(Date.now() / 1000);
  const roundedTo = Math.floor(now / 3600) * 3600; 
  const roundedFrom = roundedTo - 86400;

  for (const sport of sports) {
    console.log(`\n--- Processing ${sport.name} ---`);
    
    const champUrl = `https://linebet.com/service-api/result/web/api/v2/champs?dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189&sportIds=${sport.id}`;
    
    try {
      const champRes = await fetch(champUrl);
      const champData = await champRes.json();
      const leagues = champData.items || [];
      
      console.log(`Found ${leagues.length} leagues. Fetching games...`);

      for (const league of leagues) {
        // STEP 2 URL: Fetching games for this specific league
        const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${league.id}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
        
        const gamesRes = await fetch(gamesUrl);
        const gamesData = await gamesRes.json();
        const items = gamesData.items || [];

        if (items.length > 0) {
          console.log(` > ${league.name}: Found ${items.length} games.`);
          
          items.forEach(game => {
            // Logic to split "2:0 (2:0,0:0)" into 2 and 0
            const mainScore = game.score.split(' ')[0]; // Gets "2:0"
            const scores = mainScore.split(':');
            const homeScore = parseInt(scores[0]) || 0;
            const awayScore = parseInt(scores[1]) || 0;

            console.log(`   [MATCH] ${game.opp1} ${homeScore} : ${awayScore} ${game.opp2}`);
            
            // We will add the Supabase .upsert() here in Step 3!
          });
        }
      }
    } catch (err) {
      console.error(`❌ ERROR in ${sport.name}:`, err.message);
    }
  }
}

syncLinebet();
