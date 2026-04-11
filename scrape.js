const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTargetedResults() {
  console.log("--- 🕵️ STEP 1: SCANNING PENDING SELECTIONS ---");

  const { data: pendingLeagues, error: pendingError } = await supabase
    .from('newselections')
    .select('league, sport')
    .eq('status', 'pending');

  if (pendingError || !pendingLeagues || !pendingLeagues.length) {
    console.log("📭 No pending tickets found. Skipping.");
    return;
  }

  const uniqueNames = [...new Set(pendingLeagues.map(l => l.league))];

  const { data: mappings, error: mapError } = await supabase
    .from('league_mappings')
    .select('api_display_league, linebet_sport_id, linebet_league_id, linebet_league_name, is_verified')
    .in('api_display_league', uniqueNames)
    .eq('is_verified', true);

  if (mapError || !mappings || !mappings.length) {
    console.log("📭 No verified mappings found.");
    return;
  }

  const sportGroups = {};
  mappings.forEach(map => {
    const sId = map.linebet_sport_id;
    const internalSport = pendingLeagues.find(p => p.league === map.api_display_league)?.sport || 'unknown';
    if (!sportGroups[sId]) {
      sportGroups[sId] = { name: internalSport, leagues: new Map() };
    }
    sportGroups[sId].leagues.set(map.linebet_league_id, map.linebet_league_name);
  });

  // --- STEP 2: TIME CONFIGURATION ---
  const now = Math.floor(Date.now() / 1000);
  
  // To avoid 400 Errors, we query the last 3 days in 24-hour steps
  const dayInSeconds = 86400;
  const timeWindows = [
    { from: now - dayInSeconds, to: now },           // Today
    { from: now - (dayInSeconds * 2), to: now - dayInSeconds }, // Yesterday
    { from: now - (dayInSeconds * 3), to: now - (dayInSeconds * 2) }  // Day before
  ];

  for (const [sportId, info] of Object.entries(sportGroups)) {
    console.log(`\n--- 📊 SCRAPING ${info.name.toUpperCase()} (ID: ${sportId}) ---`);

    for (const [leagueId, leagueName] of info.leagues) {
      
      for (const window of timeWindows) {
        const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${leagueId}&dateFrom=${window.from}&dateTo=${window.to}&lng=en&ref=189`;
        
        console.log(`🔎 Window: ${new Date(window.from * 1000).toLocaleDateString()} | League: ${leagueName}`);

        try {
          const gamesRes = await fetch(gamesUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://linebet.com/en/results/',
              'Accept': 'application/json'
            }
          });

          if (!gamesRes.ok) {
            console.error(`  ❌ HTTP Error ${gamesRes.status} for ${leagueName}`);
            continue;
          }
          
          const gamesData = await gamesRes.json();
          const items = gamesData.items || [];

          const resultsToUpsert = items.filter(game => game.score).map(game => {
            let cleanScore = game.score.replace(/\s\(\d+\).*/, '').split(';')[0].trim();
            const mainScorePart = cleanScore.split(' ')[0];
            const [h, a] = mainScorePart.split(':').map(n => parseInt(n) || 0);

            return {
              match_id: String(game.id),
              sport_key: info.name,
              league_name: leagueName,
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

            if (!upsertError) console.log(`    ✅ Synced ${resultsToUpsert.length} matches from window.`);
          }
        } catch (err) {
          console.error(`  ❌ Request Failed:`, err.message);
        }
      }
    }
  }
  console.log("\n--- ✅ SYNC COMPLETE ---");
}

syncTargetedResults();
