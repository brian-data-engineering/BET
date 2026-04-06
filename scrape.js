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
  // --- STEP 1: GENERATE UNIX TIMESTAMPS ---
  // Linebet expects 10-digit numbers, not YYYY-MM-DD
  const now = Math.floor(Date.now() / 1000);
  const twentyFourHoursAgo = now - 86400;

  for (const sport of sports) {
    console.log(`\n--- Fetching ${sport.name} (ID: ${sport.id}) ---`);
    
    // Using your exact URL structure with the corrected dynamic dates
    const url = `https://linebet.com/service-api/result/web/api/v2/champs?dateFrom=${twentyFourHoursAgo}&dateTo=${now}&lng=en&ref=189&sportIds=${sport.id}`;
    
    try {
      const response = await fetch(url);
      const res = await response.json();

      // Based on the JSON you provided, the data is in "items"
      const leagues = res.items || [];
      
      if (leagues.length > 0) {
        console.log(`SUCCESS: Found ${leagues.length} leagues for ${sport.name}`);
        
        // Log the first few leagues so you can see the IDs we will need for Step 2
        leagues.slice(0, 5).forEach(league => {
          console.log(` > LEAGUE DETECTED: [ID: ${league.id}] Name: "${league.name}" (Games: ${league.gamesCount})`);
        });

        // --- STEP 1 LOGIC ONLY ---
        // We are just verifying we see the leagues. 
        // We will add the "fetch games per league ID" logic in Step 2.
        
      } else {
        console.log(`INFO: No leagues found for ${sport.name} in this time window.`);
        // Logging the URL helps you verify it in your browser if it fails
        console.log(`Checked URL: ${url}`);
      }

    } catch (err) {
      console.error(`❌ ERROR fetching ${sport.name}:`, err.message);
    }
  }
}

syncLinebet();
