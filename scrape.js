const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTargetedResults() {
  console.log("--- 🕵️ STEP 1: SCANNING PENDING SELECTIONS VIA MAPPINGS ---");

  // Fetch unique league mappings for pending bets
  // We join newselections with league_mappings based on the league name
  const { data: targets, error: targetError } = await supabase
    .from('newselections')
    .select(`
      sport,
      league,
      league_mappings!inner (
        linebet_sport_id,
        linebet_league_id,
        linebet_league_name,
        is_verified,
        is_ignored
      )
    `)
    .eq('status', 'pending')
    .eq('league_mappings.is_verified', true)
    .eq('league_mappings.is_ignored', false);

  if (targetError || !targets || !targets.length) {
    console.log("📭 No verified pending leagues found. Skipping.");
    return;
  }

  // --- STEP 2: GROUP BY SPORT TO AVOID DUPLICATE CALLS ---
  const sportGroups = targets.reduce((acc, curr) => {
    const sId = curr.league_mappings.linebet_sport_id;
    if (!acc[sId]) acc[sId] = { name: curr.sport, leagues: new Map() };
    
    // Using a Map for leagues to automatically handle "similarities" (duplicates)
    acc[sId].leagues.set(curr.league_mappings.linebet_league_id, curr.league_mappings.linebet_league_name);
    return acc;
  }, {});

  const now = Math.floor(Date.now() / 1000);
  const roundedTo = Math.floor(now / 3600) * 3600;
  const roundedFrom = roundedTo - 86400; // Last 24 hours

  for (const [sportId, info] of Object.entries(sportGroups)) {
    console.log(`\n--- 📊 SCRAPING ${info.name.toUpperCase()} (ID: ${sportId}) ---`);

    for (const [leagueId, leagueName] of info.leagues) {
      console.log(`🔎 Target: ${leagueName} (ID: ${leagueId})`);

      const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${leagueId}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
      
      try {
        const gamesRes = await fetch(gamesUrl);
        const gamesData = await gamesRes.json();
        const items = gamesData.items || [];

        const resultsToUpsert = items.filter(game => game.score).map(game => {
          // Clean score logic
          let cleanScore = game.score.replace(/\s\(\d+\).*/, '').split(';')[0].trim();
          const mainScorePart = cleanScore.split(' ')[0];
          const [h, a] = mainScorePart.split(':').map(n => parseInt(n) || 0);

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
            league_name: leagueName,
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
            console.error(` ⚠️ Error for ${leagueName}:`, upsertError.message);
          } else {
            console.log(`   ✅ Synced ${resultsToUpsert.length} matches for ${leagueName}`);
          }
        }
      } catch (err) {
        console.error(`❌ API Error for League ${leagueId}:`, err.message);
      }
    }
  }
}

syncTargetedResults();
