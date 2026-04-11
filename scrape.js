const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTargetedResults() {
  console.log("--- 🕵️ STEP 1: SCANNING PENDING SELECTIONS ---");

  // 1. Get the sports/leagues we are actually looking for
  const { data: pendingLeagues, error: pendingError } = await supabase
    .from('newselections')
    .select('league, sport')
    .eq('status', 'pending');

  if (pendingError || !pendingLeagues?.length) {
    console.log("📭 No pending tickets found. Skipping.");
    return;
  }

  // Get unique internal sport names to know which Sport IDs to discover
  const internalSports = [...new Set(pendingLeagues.map(p => p.sport))];
  const targetLeagues = [...new Set(pendingLeagues.map(p => p.league))];

  // Map internal names to Linebet Sport IDs (Extend this as needed)
  const sportIdMap = { 'tennis': 4, 'soccer': 1, 'basketball': 3 };

  // --- THE ZERO-OFFSET WINDOW ---
  const now = Math.floor(Date.now() / 1000);
  const roundedTo = Math.floor(now / 3600) * 3600;
  const roundedFrom = roundedTo - 86400;

  console.log(`\n--- 🔎 STEP 2: DISCOVERY PHASE (Irregardless of Endpoint) ---`);

  for (const sportName of internalSports) {
    const sId = sportIdMap[sportName.toLowerCase()];
    if (!sId) continue;

    console.log(`\n📊 SCANNING ${sportName.toUpperCase()} (ID: ${sId})`);

    // Fetch all active championships for this sport
    const champUrl = `https://linebet.com/service-api/result/web/api/v2/champs?dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189&sportIds=${sId}`;
    
    try {
      const champRes = await fetch(champUrl);
      const champData = await champRes.json();
      const discoveredItems = champData.items || [];

      // Find all endpoints that match our target leagues (e.g., contains "Billie Jean")
      const matchingEndpoints = discoveredItems.filter(item => 
        targetLeagues.some(tl => item.name.toLowerCase().includes(tl.toLowerCase()))
      );

      if (matchingEndpoints.length === 0) {
        console.log(`  ⚪ No active endpoints found for ${sportName} targets.`);
        continue;
      }

      for (const endpoint of matchingEndpoints) {
        console.log(`  🚀 Found Endpoint: ${endpoint.name} (ID: ${endpoint.id})`);

        // Fetch games for this specific endpoint
        const gamesUrl = `https://linebet.com/service-api/result/web/api/v3/games?champId=${endpoint.id}&dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189`;
        
        const gamesRes = await fetch(gamesUrl);
        if (!gamesRes.ok) continue;

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
            sport_key: sportName,
            league_name: endpoint.name,
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
            console.log(`     ✅ Synced ${resultsToUpsert.length} matches from ${endpoint.name}.`);
          }
        } else {
          console.log(`     ⚪ No scored results in ${endpoint.name}.`);
        }
      }
    } catch (err) {
      console.error(`❌ Discovery failed for ${sportName}:`, err.message);
    }
  }
}

syncTargetedResults();
