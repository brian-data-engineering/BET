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
  // --- ROUNDING LOGIC ---
  // We round to the nearest hour (3600 seconds) to match your working URL
  const now = Math.floor(Date.now() / 1000);
  const roundedTo = Math.floor(now / 3600) * 3600; 
  const roundedFrom = roundedTo - 86400; // Exactly 24 hours ago

  for (const sport of sports) {
    console.log(`\n--- Fetching ${sport.name} (ID: ${sport.id}) ---`);
    
    // Using the rounded timestamps
    const url = `https://linebet.com/service-api/result/web/api/v2/champs?dateFrom=${roundedFrom}&dateTo=${roundedTo}&lng=en&ref=189&sportIds=${sport.id}`;
    
    try {
      const response = await fetch(url);
      const res = await response.json();

      // Linebet data is in "items"
      const leagues = res.items || [];
      
      if (leagues.length > 0) {
        console.log(`✅ SUCCESS: Found ${leagues.length} leagues for ${sport.name}`);
        
        // Print the first 5 so we can see the IDs for Step 2
        leagues.slice(0, 5).forEach(league => {
          console.log(` > DETECTED: [ID: ${league.id}] ${league.name} (${league.gamesCount} games)`);
        });
      } else {
        console.log(`⚠️ No leagues found. API Response Count: ${res.count || 0}`);
        console.log(`Checked URL: ${url}`);
      }

    } catch (err) {
      console.error(`❌ ERROR:`, err.message);
    }
  }
}

syncLinebet();
