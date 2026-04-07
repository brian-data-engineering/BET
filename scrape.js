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

async function syncTargetedResults() {
  console.log("--- 🕵️ STEP 1: SCANNING PENDING TICKETS ---");

  // Fetch sport_key and country from pending tickets
  const { data: pendingData, error: pendingError } = await supabase
    .from('print')
    .select('sport_key, country')
    .eq('status', 'pending');

  if (pendingError || !pendingData || !pendingData.length) {
    console.log("📭 No pending tickets found. Skipping sync.");
    return;
  }

  // --- NEW LOGIC: EXPLODE COMMA-SEPARATED STRINGS ---
  
  // 1. Extract and split all sport keys
  const allSportsRaw = pendingData.flatMap(item => 
    item.sport_key ? item.sport_key.split(',').map(s => s.trim().toLowerCase()) : []
  );
  // Filter for unique sports that exist in our mapping
  const activeSports = [...new Set(allSportsRaw)].filter(s => sportMapping[s]);

  // 2. Extract and split all countries
  const activeCountries = [...new Set(
    pendingData.flatMap(item => 
      item.country ? item.country.split(',').map(c => c.trim()) : []
    )
  )].filter(c => c && c !== 'Unknown' && c !== '');

  console.log(`📊 TARGETS: ${activeSports.join(', ')} | ${activeCountries.length} Unique Countries Found`);

  const now = Math.floor(Date.now() / 1000);
  const roundedTo = Math.floor(now / 3600) * 3600; 
  const roundedFrom = roundedTo - 86400; 

  for (const sportKey of activeSports) {
    const sportId = sportMapping[sportKey];
    console.log(`\n--- 📊 SCRAPING ${sportKey.toUpperCase()} ---`);
    
    const champUrl = `https://linebet.com/service-api/result/web/api/v2/champs?dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189&sportIds=${sportId}`;
    
    try {
      const champRes = await fetch(champUrl);
      const champData = await champRes.json();
      const allLeagues = champData.items || [];

      // Filter leagues: Include if league name contains ANY of the target countries
      const targetLeagues = allLeagues.filter(league => 
        activeCountries.length === 0 || activeCountries.some(c => league.name.includes(c))
      );

      console.log(`Found ${allLeagues.length} leagues. Filtering to ${targetLeagues.length} based on your tickets.`);

      for (const league of targetLeagues) {
        const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${league.id}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
        const gamesRes = await fetch(gamesUrl);
        const gamesData = await gamesRes.json();
        const items = gamesData.items || [];

        const resultsToUpsert = items.filter(game => game.score).map(game => {
          // Clean score logic (removes penalties/extra info)
          let cleanScore = game.score.replace(/\s\(\d+\).*/, '').split(';')[0].trim();
          const mainScorePart = cleanScore.split(' ')[0];
          const [h, a] = mainScorePart.split(':').map(n => parseInt(n) || 0);

          // Extract period scores e.g., (1:0, 2:1)
          const periodMatch = cleanScore.match(/\(([^)]+)\)/);
          const periods = {};
          if (periodMatch) {
            periodMatch[1].split(',').forEach((val, i) => {
              periods[`p${i + 1}`] = val.trim();
            });
          }

          return {
            match_id: String(game.id),
            sport_key: sportKey,
            league_name: league.name,
            home_team: game.opp1,
            away_team: game.opp2,
            start_time_eat: new Date(game.dateStart * 1000).toISOString(),
            full_time_score: { home: h, away: a },
            period_scores: periods,
            raw_clean_score: cleanScore
          };
        });

        if (resultsToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('finalresults')
            .upsert(resultsToUpsert, { onConflict: 'match_id' });
          
          if (upsertError) {
            console.error(` ⚠️ Error upserting ${league.name}:`, upsertError.message);
          } else {
            console.log(`   ✅ Synced ${resultsToUpsert.length} matches from ${league.name}`);
          }
        }
      }
    } catch (err) {
      console.error(`❌ ERROR in ${sportKey}:`, err.message);
    }
  }
}

syncTargetedResults();
