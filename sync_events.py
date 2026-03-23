import os
import requests
from supabase import create_client

# --- CONFIGURATION ---
API_KEY = "c42b69e32cda7bd0e13fb473448cebd0fc31510d714850aa0fdf4969b0dd4a65"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LUCRA_SPORTS = [
    "football", "basketball", "tennis", "ice-hockey", 
    "boxing", "handball", "volleyball", "table-tennis", 
    "rugby", "cricket", "beach-volleyball", "badminton"
]

# Filtering Keywords
SKIP_KEYWORDS = ['Reserve', 'U19', 'U21', 'U23', 'Amateur', 'Youth']
TOP_TIER_LEAGUES = ['Premier League', 'NBA', 'Champions League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1']

def fetch_and_sync():
    print(f"🚀 Starting Lucra Smart-Sync Engine...")
    total_synced = 0

    for sport in LUCRA_SPORTS:
        try:
            # Fetching from V3
            url = f"https://api.odds-api.io/v3/events?apiKey={API_KEY}&sport={sport}&limit=1000"
            
            print(f"📡 Fetching {sport.upper()}...")
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                print(f"❌ API Error for {sport}: {response.status_code}")
                continue

            data = response.json()
            if not data or not isinstance(data, list):
                continue

            sport_batch = []
            for item in data:
                # --- WATERFALL LEAGUE EXTRACTION ---
                # Check for specific league name, then title, then sport key
                raw_league = item.get('league', {}).get('name')
                sport_title = item.get('sport_title')
                
                if raw_league and raw_league not in ["Football", "Soccer"]:
                    league_name = raw_league
                elif sport_title:
                    league_name = sport_title
                else:
                    league_name = sport.replace('-', ' ').title()

                # --- PRIORITY TAGGING ---
                priority = 2 # Standard
                if any(word in league_name for word in SKIP_KEYWORDS):
                    priority = 3 # Low
                if any(top in league_name for top in TOP_TIER_LEAGUES):
                    priority = 1 # High

                # Odds Extraction (1xBet)
                bookmakers = item.get('bookmakers', {})
                one_x_bet = bookmakers.get('1xbet', [])
                h_odds, d_odds, a_odds = None, None, None
                
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
                    "priority_level": priority
                })

            if sport_batch:
                print(f"📦 Upserting {len(sport_batch)} {sport} matches with Smart Leagues...")
                supabase.table("api_events").upsert(sport_batch, on_conflict="id").execute()
                total_synced += len(sport_batch)

        except Exception as e:
            print(f"🚨 Critical Failure on {sport}: {str(e)}")

    print(f"\n✅ DONE. Total records synced: {total_synced}")

if __name__ == "__main__":
    fetch_and_sync()
