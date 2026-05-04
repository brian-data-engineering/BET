const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTargetedResults() {
  console.log("--- 🕵️ STEP 1: SCANNING PRINT TABLE ---");

  const { data: printedTickets, error: fetchError } = await supabase
    .from('print')
    .select('selections')
    .eq('status', 'pending');

  if (fetchError) {
    console.error("❌ Database Fetch Error:", fetchError.message);
    return;
  }

  if (!printedTickets?.length) {
    console.log("📭 No pending tickets found. Skipping.");
    return;
  }

  const leagueMap = new Map();
  printedTickets.forEach(ticket => {
    if (Array.isArray(ticket.selections)) {
      ticket.selections.forEach(item => {
        if (item.league_id) {
          leagueMap.set(item.league_id, {
            id: item.league_id,
            name: item.display_league || 'Unknown League',
            sport: item.sport_key || 'soccer'
          });
        }
      });
    }
  });

  const targetLeagues = Array.from(leagueMap.values());
  console.log(`🎯 Found ${targetLeagues.length} unique leagues.`);

  // --- PRECISE API TIMING ---
  // API needs exact start/end of day timestamps to avoid 400 errors
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const dateFrom = Math.floor(startOfToday.getTime() / 1000) - 86400; // Yesterday 00:00:00
  const dateTo = Math.floor(startOfToday.getTime() / 1000) + 86400;   // Today 23:59:59 (approx)

  console.log(`⏰ API Window: ${dateFrom} -> ${dateTo}`);

  for (const league of targetLeagues) {
    const gamesUrl = `https://1xbet.co.ke/service-api/result/web/api/v3/games?champId=${league.id}&dateFrom=${dateFrom}&dateTo=${dateTo}&lng=en&ref=61`;
    
    console.log(`\n📡 Fetching: ${league.name} (${league.id})`);
    
    try {
      const response = await fetch(gamesUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.log(`   ❌ API Rejected with Status ${response.status}`);
        // Log the URL for manual verification if it fails
        console.log(`   🔗 URL: ${gamesUrl}`);
        continue;
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) {
        console.log(`   ⚪ No games found in this period.`);
        continue;
      }

      const resultsToUpsert = items
        .filter(game => game.score && game.score.includes(':')) 
        .map(game => {
          let cleanScore = game.score.replace(/\s\(([^)]+)\).*/, '').split(';')[0].trim();
          const mainScorePart = cleanScore.split(' ')[0];
          const [h, a] = mainScorePart.split(':').map(n => parseInt(n) || 0);

          const periodMatch = game.score.match(/\(([^)]+)\)/);
          const periods = {};
          if (periodMatch) {
            periodMatch[1].split(',').forEach((val, i) => {
              periods[`p${i + 1}`] = val.trim();
            });
          }

          return {
            match_id: String(game.id),
            league_id: String(league.id),
            sport_key: league.sport,
            display_league: league.name,
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
          console.log(`   ✅ Synced ${resultsToUpsert.length} results.`);
        } else {
          console.error(`   ❌ Supabase Error: ${upsertError.message}`);
        }
      } else {
        console.log(`   ⏳ No completed scores found yet.`);
      }

      await new Promise(r => setTimeout(r, 1500)); // Slightly longer delay for safety

    } catch (err) {
      console.error(`   ❌ Fetch Failure:`, err.message);
    }
  }
  console.log("\n--- ✅ SCRAPE SESSION COMPLETE ---");
}

syncTargetedResults();
