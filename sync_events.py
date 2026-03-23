import os
import requests
from supabase import create_client

# --- CONFIGURATION ---
API_KEY = "c42b69e32cda7bd0e13fb473448cebd0fc31510d714850aa0fdf4969b0dd4a65"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Broadest possible list for Lucra
LUCRA_SPORTS = [
    "football", "basketball", "tennis", "ice-hockey", 
    "boxing", "handball", "volleyball", "table-tennis", 
    "rugby", "cricket", "beach-volleyball", "badminton"
]

def fetch_and_sync_all():
    print(f"🚀 Launching Lucra Full-Spectrum Sync (No Filters)...")
    total_synced = 0

    for sport in LUCRA_SPORTS:
        try:
            # V3 Events endpoint - Fetching 1000 per sport to ensure we get past/present/future
            url = f"https://api.odds-api.io/v3/events?apiKey={API_KEY}&sport={sport}&limit=1000"
            
            print(f"📡 Pulling all data for {sport.upper()}...")
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                print(f"❌ API Error for {sport}: {response.status_code}")
                continue

            data = response.json()
            if not data or not isinstance(data, list):
                continue

            sport_batch = []
            for item in data:
                # --- LEAGUE NAME EXTRACTION (Simplest Version) ---
                # No more waterfall - just take the league name or the sport title
                league_name = item.get('league', {}).get('name') or item.get('sport_title') or sport.title()

                # --- ODDS EXTRACTION (1xBet) ---
                bookmakers = item.get('bookmakers', {})
                one_x_bet = bookmakers.get('1xbet', [])
                h_odds, d_odds, a_odds = None, None, None
                
                if one_x_bet:
                    for market in one_x_bet:
                        if market.get('name') == 'ML':
                            # Extracting odds from the first market match
                            o = market.get('odds', [{}])[0]
                            h_odds = o.get('home')
                            d_odds = o.get('draw')
                            a_odds = o.get('away')

                # --- BUILD OBJECT (No priority filters) ---
                sport_batch.append({
                    "id": str(item.get('id')),
                    "sport_key": sport,
                    "league_name": league_name,
                    "home_team": item.get('home'),
                    "away_team": item.get('away'),
                    "commence_time": item.get('date'),
                    "status": item.get('status', 'pending'),
                    "home_score": item.get('scores', {}).get('home'),
                    "away_score": item.get('scores', {}).get('away'),
                    "home_odds": h_odds,
                    "draw_odds": d_odds,
                    "away_odds": a_odds,
                    "priority_level": 1 # Setting everything to 1 so they show up immediately
                })

            if sport_batch:
                print(f"📦 Upserting {len(sport_batch)} {sport} matches...")
                # upsert handles "past" games by updating their scores and "future" by adding new rows
                supabase.table("api_events").upsert(sport_batch, on_conflict="id").execute()
                total_synced += len(sport_batch)

        except Exception as e:
            print(f"🚨 Critical Failure on {sport}: {str(e)}")

    print(f"\n✅ FULL SYNC COMPLETE. Total records in database: {total_synced}")

if __name__ == "__main__":
    fetch_and_sync_all()
