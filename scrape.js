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

  if (pendingError || !pendingLeagues?.length) {
    console.log("📭 No pending tickets found. Skipping.");
    return;
  }

  const uniqueNames = [...new Set(pendingLeagues.map(l => l.league))];

  const { data: mappings, error: mapError } = await supabase
    .from('league_mappings')
    .select('api_display_league, linebet_sport_id, linebet_league_id, linebet_league_name, is_verified')
    .in('api_display_league', uniqueNames)
    .eq('is_verified', true);

  if (mapError || !mappings?.length) {
    console.log("📭 No verified mappings found.");
    return;
  }

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

  // --- THE CRITICAL FIX: EXACT 24-HOUR WINDOW ---
  const now = Math.floor(Date.now() / 1000);
  const roundedTo = now;
  const roundedFrom = now - 86400; // MUST BE 86400 TO MATCH YOUR WORKING URL

  for (const [sportId, info] of Object.entries(sportGroups)) {
    console.log(`\n--- 📊 SCRAPING ${info.name.toUpperCase()} (ID: ${sportId}) ---`);

    for (const league of info.leagues) {
      const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${league.id}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
      
      console.log(`🔎 Target: ${league.name} | URL: ${gamesUrl}`);

      try {
        const gamesRes = await fetch(gamesUrl);
        if (!gamesRes.ok) {
          console.log(`  ❌ Error ${gamesRes.status}`);
          continue;
        }
        
        const gamesData = await gamesRes.json();
        const items = gamesData.items || [];

        const resultsToUpsert = items.filter(game => game.score).map(game => {
          let cleanScore = game.score.replace(/\s\(\d+\).*/, '').split(';')[0].trim();
          const mainScorePart = cleanScore.split(' ')[0];
          const [h, a] = mainScorePart.split(':').map(n => parseInt(n) || 0);

          // Restore period scores logic (p1, p2, etc)
          const periodMatch = cleanScore.match(/\(([^)]+)\)/);
          const periods = {};
          if (periodMatch) {
            periodMatch[1].split(',').forEach((val, i) => {
              periods[`p${i + 1}`] = val.trim();
            });
          }

          return {
            match_id: String(game.id),
            sport_key: info.name,
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
