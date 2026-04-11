const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTargetedResults() {
  console.log("--- 🕵️ STEP 1: SCANNING PENDING SELECTIONS ---");

  // Fetch pending bets joined with their verified mappings
  const { data: targets, error: targetError } = await supabase
    .from('newselections')
    .select(`
      sport,
      league,
      status,
      league_mappings!inner (
        linebet_sport_id,
        linebet_league_id,
        linebet_league_name,
        is_verified
      )
    `)
    .eq('status', 'pending')
    .eq('league_mappings.is_verified', true);

  if (targetError) {
    console.error("❌ Database Error:", targetError.message);
    return;
  }

  if (!targets || !targets.length) {
    console.log("📭 No verified pending leagues found in DB. Skipping.");
    return;
  }

  // --- STEP 2: GROUP BY SPORT & LEAGUE (Avoiding Useless Calls) ---
  const sportGroups = {};

  targets.forEach(item => {
    const map = item.league_mappings;
    const sId = map.linebet_sport_id;
    
    if (!sportGroups[sId]) {
      sportGroups[sId] = { name: item.sport, leagues: new Map() };
    }
    
    // Keying by league_id ensures we only call Linebet once per league
    sportGroups[sId].leagues.set(map.linebet_league_id, map.linebet_league_name);
  });

  const now = Math.floor(Date.now() / 1000);
  const roundedTo = now; // Current time
  const roundedFrom = now - (86400 * 2); // Check last 48 hours for safety

  for (const [sportId, info] of Object.entries(sportGroups)) {
    console.log(`\n--- 📊 SCRAPING ${info.name.toUpperCase()} (ID: ${sportId}) ---`);

    for (const [leagueId, leagueName] of info.leagues) {
      const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${leagueId}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
      
      console.log(`🔎 Target: ${leagueName}`);
      console.log(`🔗 URL: ${gamesUrl}`);

      try {
        const gamesRes = await fetch(gamesUrl);
        if (!gamesRes.ok) throw new Error(`HTTP Error: ${gamesRes.status}`);
        
        const gamesData = await gamesRes.json();
        const items = gamesData.items || [];

        const resultsToUpsert = items.filter(game => game.score).map(game => {
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
            console.error(` ⚠️ Upsert Error:`, upsertError.message);
          } else {
            console.log(`   ✅ Synced ${resultsToUpsert.length} matches.`);
          }
        } else {
          console.log(`   ⚪ No completed results found yet for this league.`);
        }
      } catch (err) {
        console.error(`❌ API Error for League ${leagueId}:`, err.message);
      }
    }
  }
}

syncTargetedResults();
