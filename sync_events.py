import os
import requests
from supabase import create_client

# --- CONFIGURATION ---
API_KEY = "c42b69e32cda7bd0e13fb473448cebd0fc31510d714850aa0fdf4969b0dd4a65"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def sync_football():
    print(f"🚀 Starting Football-Only Sync...")
    
    try:
        # V3 Events endpoint specifically for Football
        url = f"https://api.odds-api.io/v3/events?apiKey={API_KEY}&sport=football&limit=1000"
        
        print(f"📡 Requesting data from API...")
        response = requests.get(url, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return

        data = response.json()
        if not data or not isinstance(data, list):
            print("⚠️ No football data returned.")
            return

        batch = []
        for item in data:
            # 1. League Extraction (Handles those U21 and Amateur leagues nicely)
            league = item.get('league', {})
            league_name = league.get('name') or item.get('sport_title', 'Unknown League')

            # 2. Score Extraction (Safe navigation)
            scores = item.get('scores', {})
            h_score = scores.get('home')
            a_score = scores.get('away')

            # 3. Odds Extraction (Targeting 1xBet ML markets)
            bookmakers = item.get('bookmakers', {})
            one_x_bet = bookmakers.get('1xbet', [])
            h_odds, d_odds, a_odds = None, None, None
            
            if one_x_bet:
                for market in one_x_bet:
                    if market.get('name') == 'ML':
                        odds_list = market.get('odds', [])
                        if odds_list:
                            o = odds_list[0]
                            h_odds = o.get('home')
                            d_odds = o.get('draw')
                            a_odds = o.get('away')

            # 4. Map to your Database Schema
            batch.append({
                "id": str(item.get('id')),
                "sport_key": "football",
                "league_name": league_name,
                "home_team": item.get('home'),
                "away_team": item.get('away'),
                "commence_time": item.get('date'),
                "status": item.get('status', 'pending'),
                "home_score": h_score,
                "away_score": a_score,
                "home_odds": h_odds,
                "draw_odds": d_odds,
                "away_odds": a_odds,
                "priority_level": 1  # High priority for immediate visibility
            })

        if batch:
            print(f"📦 Upserting {len(batch)} football records to Supabase...")
            # .upsert() uses the 'id' column to decide between INSERT or UPDATE
            supabase.table("api_events").upsert(batch, on_conflict="id").execute()
            print(f"✅ Sync Complete. {len(batch)} matches processed.")

    except Exception as e:
        print(f"🚨 Critical Failure: {str(e)}")

if __name__ == "__main__":
    sync_football()
