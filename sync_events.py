import os
import requests
from datetime import datetime
from supabase import create_client

# 1. Setup
url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
api_key = os.environ.get("ODDS_API_KEY", "").strip()
supabase = create_client(url, key)

LUCRA_SPORTS = [
    "football", "basketball", "tennis", "ice-hockey", 
    "boxing", "handball", "volleyball", "table-tennis", 
    "rugby", "cricket", "beach-volleyball", "badminton"
]

def sync_upcoming_only():
    # Get current time in ISO format for the API filter
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    for sport in LUCRA_SPORTS:
        try:
            print(f"📅 Fetching UPCOMING matches for: {sport.upper()}...")
            
            api_url = 'https://api.odds-api.io/v3/events'
            params = {
                'apiKey': api_key,
                'sport': sport,
                'status': 'upcoming', # Strictly upcoming
                'commence_time_from': now_iso, # Starting from right now
                'limit': 50
            }
            
            response = requests.get(api_url, params=params)
            events = response.json()
            
            if not isinstance(events, list):
                continue

            print(f"📦 Found {len(events)} future matches for {sport}.")

            for match in events:
                event_data = {
                    "id": str(match.get('id')),
                    "sport_key": sport,
                    "home_team": match.get('home'),
                    "away_team": match.get('away'),
                    "commence_time": match.get('date'),
                    "status": "upcoming" # Force status to upcoming
                }
                
                supabase.table("api_events").upsert(
                    event_data, 
                    on_conflict="id"
                ).execute()

        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    sync_upcoming_only()
