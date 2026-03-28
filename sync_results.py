import os
import sys
import requests
from supabase import create_client, Client

# Configuration from environment variables
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ ERROR: SUPABASE_URL or SUPABASE_KEY is missing.")
    sys.exit(1)

supabase: Client = create_client(url, key)

# API Key and Base URL
API_KEY = "394691c0a855a9c21e847bd3600eb8059fc7c57dcfd181c225176ad85973c187"
BASE_URL = "https://api.odds-api.io/v3/events"

# Configuration including Ice Hockey
SPORTS_TO_SYNC = [
    {"name": "soccer", "url": f"{BASE_URL}?apiKey={API_KEY}&sport=football&limit=1000"},
    {"name": "basketball", "url": f"{BASE_URL}?apiKey={API_KEY}&sport=basketball&limit=1000"},
    {"name": "table-tennis", "url": f"{BASE_URL}?apiKey={API_KEY}&sport=table-tennis&limit=1000"},
    {"name": "ice-hockey", "url": f"{BASE_URL}?apiKey={API_KEY}&sport=ice-hockey&limit=1000"}
]

def sync_results():
    all_formatted_data = []

    for sport in SPORTS_TO_SYNC:
        print(f"📡 Fetching {sport['name']} results...")
        try:
            response = requests.get(sport['url'], timeout=10)
            response.raise_for_status()
            events = response.json()

            if not isinstance(events, list):
                print(f"⚠️ Skipping {sport['name']}: Invalid API response.")
                continue

            for event in events:
                # 1. We only want 'settled' matches to ensure we have final scores
                status = event.get('status')
                if status != 'settled':
                    continue

                scores = event.get('scores', {})
                periods = scores.get('periods', {})
                
                # Extracting period data
                fulltime = periods.get('fulltime', {})
                # p1: Soccer Halftime, Basketball Q1, Table Tennis Set 1, Hockey Period 1
                p1 = periods.get('p1', {}) 

                all_formatted_data.append({
                    "id": event.get('id'),
                    "home_name": event.get('home'),
                    "away_name": event.get('away'),
                    "match_date": event.get('date'),
                    "league_name": event.get('league', {}).get('name'),
                    "status": status,
                    "sport_type": sport['name'],
                    "home_score": scores.get('home', 0),
                    "away_score": scores.get('away', 0),
                    "fulltime_home": fulltime.get('home'),
                    "fulltime_away": fulltime.get('away'),
                    "half_time_home": p1.get('home'),
                    "half_time_away": p1.get('away'),
                    "periods": periods # Crucial for Hockey OT/Penalties and Basketball Quarters
                })

        except Exception as e:
            print(f"❌ Error fetching {sport['name']}: {e}")

    # 2. Upsert to Supabase 'results' table
    if all_formatted_data:
        try:
            supabase.table("results").upsert(all_formatted_data).execute()
            print(f"✅ Successfully synced {len(all_formatted_data)} total results to Lucra.")
        except Exception as e:
            print(f"❌ Database Error: {e}")
    else:
        print("⚠️ No new 'settled' matches found to sync.")

if __name__ == "__main__":
    sync_results()
