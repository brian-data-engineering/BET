const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTargetedResults() {
  console.log("--- 🕵️ STEP 1: SCANNING PENDING SELECTIONS ---");

  // 1. Get unique pending leagues from your new table
  const { data: pendingLeagues, error: pendingError } = await supabase
    .from('newselections')
    .select('league, sport')
    .eq('status', 'pending');

  if (pendingError || !pendingLeagues?.length) {
    console.log("📭 No pending tickets found. Skipping.");
    return;
  }

  const uniqueNames = [...new Set(pendingLeagues.map(l => l.league))];

  // 2. Get the specific mappings for these leagues
  const { data: mappings, error: mapError } = await supabase
    .from('league_mappings')
    .select('api_display_league, linebet_sport_id, linebet_league_id, linebet_league_name, is_verified')
    .in('api_display_league', uniqueNames)
    .eq('is_verified', true);

  if (mapError || !mappings?.length) {
    console.log("📭 No verified mappings found.");
    return;
  }

  // Group by Sport ID to reduce API calls
  const sportGroups = {};
  mappings.forEach(map => {
    const sId = map.linebet_sport_id;
    const internalSport = pendingLeagues.find(p => p.league === map.api_display_league)?.sport || 'unknown';
    if (!sportGroups[sId]) {
      sportGroups[sId] = { name: internalSport, leagues: [] };
    }
    sportGroups[sId].leagues.push({
      id: map.linebet_league_id,
      name: map.linebet_league_name
    });
  });

  // Time window: Stick to the 24-hour window that we know works
  const now = Math.floor(Date.now() / 1000);
  const roundedTo = now;
  const roundedFrom = now - 86400; // 24 hours ago

  for (const [sportId, info] of Object.entries(sportGroups)) {
    console.log(`\n--- 📊 SCRAPING ${info.name.toUpperCase()} (ID: ${sportId}) ---`);

    for (const league of info.leagues) {
      // Use the exact URL format from your working manual test
      const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${league.id}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
      
      console.log(`🔎 Target: ${league.name} | URL: ${gamesUrl}`);

      try {
        const gamesRes = await fetch(gamesUrl);
        if (!gamesRes.ok) continue;
        
        const gamesData = await gamesRes.json();
        const items = gamesData.items || [];

        const resultsToUpsert = items.filter(game => game.score).map(game => {
          // Keep your original clean score logic
          let cleanScore = game.score.replace(/\s\(\d+\).*/, '').split(';')[0].trim();
          const mainScorePart = cleanScore.split(' ')[0];
          const [h, a] = mainScorePart.split(':').map(n => parseInt(n) || 0);

          return {
            match_id: String(game.id),
            sport_key: info.name,
            league_name: league.name,
            home_team: game.opp1,
            away_team: game.opp2,
            start_time_eat: new Date(game.dateStart * 1000).toISOString(),
            full_time_score: { home: h, away: a },
            raw_clean_score: cleanScore
          };
        });

        if (resultsToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('finalresults')
            .upsert(resultsToUpsert, { onConflict: 'match_id' });

          if (!upsertError) {
            console.log(`   ✅ Synced ${resultsToUpsert.length} matches.`);
          }
        }
      } catch (err) {
        console.error(`❌ Request Failed for ${league.name}`);
      }
    }
  }
}

syncTargetedResults();
