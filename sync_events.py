import os
import requests
from datetime import datetime
from supabase import create_client

# 1. Setup
url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
api_key = os.environ.get("ODDS_API_KEY", "").strip()
supabase = create_client(url, key)

# YOUR SELECTED SPORTS LIST
LUCRA_SPORTS = [
    "football", "basketball", "tennis", "ice-hockey", 
    "boxing", "handball", "volleyball", "table-tennis", 
    "rugby", "cricket", "beach-volleyball", "badminton"
]

def sync_lucra_events():
    for sport in LUCRA_SPORTS:
        try:
            print(f"🛰️ Fetching matches for: {sport.upper()}...")
            
            api_url = 'https://api.odds-api.io/v3/events'
            params = {
                'apiKey': api_key,
                'sport': sport,
                'limit': 50
            }
            
            response = requests.get(api_url, params=params)
            
            if response.status_code == 401:
                print("❌ 401: API Key rejected. Check your GitHub Secret!")
                return

            events = response.json()
            
            # Check if we actually got a list of events
            if not isinstance(events, list):
                print(f"⚠️ Unexpected response for {sport}: {events}")
                continue

            print(f"📦 Found {len(events)} matches. Updating api_events table...")

            for match in events:
                # Mapping API data to your api_events columns
                event_data = {
                    "id": str(match.get('id')),
                    "sport_key": sport,
                    "home_team": match.get('home'),
                    "away_team": match.get('away'),
                    "commence_time": match.get('date'),
                    "status": match.get('status', 'upcoming')
                }
                
                # Upsert into Supabase
                supabase.table("api_events").upsert(event_data).execute()

            print(f"✅ {sport.upper()} sync finished.")

        except Exception as e:
            print(f"❌ Error syncing {sport}: {e}")

if __name__ == "__main__":
    sync_lucra_events()
