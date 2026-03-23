import os
import requests
from supabase import create_client

# --- CONFIGURATION ---
API_KEY = "c42b69e32cda7bd0e13fb473448cebd0fc31510d714850aa0fdf4969b0dd4a65"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# The 12 Sports for Lucra
LUCRA_SPORTS = [
    "football", "basketball", "tennis", "ice-hockey", 
    "boxing", "handball", "volleyball", "table-tennis", 
    "rugby", "cricket", "beach-volleyball", "badminton"
]

# Keywords to identify low-quality leagues we want to flag or skip
SKIP_KEYWORDS = ['Reserve', 'U19', 'U21', 'U23', 'Amateur', 'Youth']

def fetch_and_sync():
    print(f"🚀 Starting Lucra High-Speed Sync (with League & Odds support)...")
    total_synced = 0

    for sport in LUCRA_SPORTS:
        try:
            # V3 URL - fetching events with bookmaker data to get initial odds
            url = f"https://api.odds-api.io/v3/events?apiKey={API_KEY}&sport={sport}&limit=1000"
            
            print(f"📡 Fetching {sport.upper()}...")
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                print(f"❌ API Error for {sport}: {response.status_code}")
                continue

            data = response.json()
            if not data or not isinstance(data, list):
                print(f"⚠️ No matches found for {sport}.")
                continue

            sport_batch = []
            for item in data:
                league_name = item.get('league', {}).get('name', 'Unknown League')
                
                # Check for low-quality leagues
                is_low_priority = any(word in league_name for word in SKIP_KEYWORDS)
                
                # Extract Scores (nested in V3)
                scores = item.get('scores', {})
                
                # Extract 1xBet Odds if available in the initial event fetch
                # Note: V3 sometimes includes main line odds in the events list
                bookmakers = item.get('bookmakers', {})
                one_x_bet = bookmakers.get('1xbet', [])
                
                h_odds, d_odds, a_odds = None, None, None
                
                # Try to find 'ML' (Match Winner) in the first bookmaker entry
                if one_x_bet:
                    for market in one_x_bet:
                        if market.get('name') == 'ML':
                            odds_list = market.get('odds', [{}])[0]
                            h_odds = odds_list.get('home')
                            d_odds = odds_list.get('draw')
                            a_odds = odds_list.get('away')

                sport_batch.append({
                    "id": str(item.get('id')),
                    "sport_key": sport,
                    "league_name": league_name, # NEW: Added League Name
                    "home_team": item.get('home'),
                    "away_team": item.get('away'),
                    "commence_time": item.get('date'),
                    "status": item.get('status', 'pending'),
                    "home_score": scores.get('home'),
                    "away_score": scores.get('away'),
                    "home_odds": h_odds,        # NEW: Added Odds support
                    "draw_odds": d_odds,
                    "away_odds": a_odds,
                    "priority_level": 3 if is_low_priority else 2 # NEW: Auto-tagging
                })

            if sport_batch:
                print(f"📦 Upserting {len(sport_batch)} {sport} matches...")
                # Bulk Upsert to api_events
                supabase.table("api_events").upsert(sport_batch, on_conflict="id").execute()
                total_synced += len(sport_batch)

        except Exception as e:
            print(f"🚨 Critical Failure on {sport}: {str(e)}")

    print(f"\n✅ DONE. Total records synced: {total_synced}")

if __name__ == "__main__":
    fetch_and_sync()
