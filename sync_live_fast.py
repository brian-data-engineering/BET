import os
import requests
from supabase import create_client

# 1. Setup - .strip() is your best friend to avoid 401 errors
url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
api_key = os.environ.get("ODDS_API_KEY", "").strip()

# Initialize Supabase
supabase = create_client(url, key)

def sync_lucra_odds():
    # Using v4 for actual odds data (Upcoming games)
    api_url = "https://api.the-odds-api.com/v4/sports/upcoming/odds"
    params = {
        'apiKey': api_key,
        'regions': 'uk', # You can change this to 'us' if 'uk' returns 401
        'markets': 'h2h',
        'oddsFormat': 'decimal'
    }
    
    try:
        print("🛰️ Connecting to Odds API...")
        response = requests.get(api_url, params=params)
        
        if response.status_code == 401:
            print("❌ 401: API Key rejected. Double check GitHub Secrets (No spaces!)")
            return

        data = response.json()
        print(f"📦 Received {len(data)} games. Syncing to Supabase...")

        for game in data:
            # Upsert into api_events
            event_data = {
                "id": game['id'],
                "sport_key": game['sport_key'],
                "home_team": game['home_team'],
                "away_team": game['away_team'],
                "commence_time": game['commence_time']
            }
            supabase.table("api_events").upsert(event_data).execute()
            
        print("✅ Lucra API Sync Complete.")

    except Exception as e:
        print(f"❌ Sync Error: {e}")

if __name__ == "__main__":
    sync_lucra_odds()
