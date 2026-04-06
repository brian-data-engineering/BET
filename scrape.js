const { createClient } = require('@supabase/supabase-client');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sports = [
  { id: 1, name: 'Football' },
  { id: 3, name: 'Basketball' },
  { id: 2, name: 'Ice Hockey' },
  { id: 4, name: 'Tennis' },
  { id: 10, name: 'Table Tennis' }
];

async function syncLinebet() {
  const date = new Date().toISOString().split('T')[0]; // Current date YYYY-MM-DD

  for (const sport of sports) {
    console.log(`Fetching ${sport.name}...`);
    
    const url = `https://linebet.com/service-api/result/web/api/v2/champs?dateFrom=${date}&dateTo=${date}&lng=en&ref=189&sportIds=${sport.id}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      // Linebet returns a list of championships (leagues)
      const championships = data.data || [];
      
      let allGames = [];

      championships.forEach(champ => {
        champ.games.forEach(game => {
          allGames.push({
            event_id: game.id.toString(),
            event_timestamp: new Date(game.start).toISOString(),
            sport_type: sport.name,
            league_name: champ.name, // This captures the League!
            home_team: game.opp1,
            away_team: game.opp2,
            home_score: game.score1 || 0,
            away_score: game.score2 || 0,
            metadata: game // Keeps the raw data just in case
          });
        });
      });

      if (allGames.length > 0) {
        const { error } = await supabase
          .from('linebetresults')
          .upsert(allGames, { onConflict: 'event_id' });

        if (error) throw error;
        console.log(`Successfully synced ${allGames.length} games for ${sport.name}`);
      }
    } catch (err) {
      console.error(`Failed ${sport.name}:`, err.message);
    }
  }
}

syncLinebet();
