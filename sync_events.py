import os
import requests
from supabase import create_client

# --- CONFIGURATION ---
# Using your verified API Key
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

def fetch_and_sync():
    print(f"🚀 Starting Lucra Mega-Sync...")
    total_count = 0

    for sport in LUCRA_SPORTS:
        try:
            # Your exact working V3 URL structure
            url = f"https://api.odds-api.io/v3/events?apiKey={API_KEY}&sport={sport}&limit=10000"
            
            print(f"📡 Fetching {sport.upper()}...")
            response = requests.get(url, timeout=20)
            
            if response.status_code != 200:
                print(f"❌ API Error for {sport}: {response.status_code}")
                continue

            data = response.json()
            if not data or not isinstance(data, list):
                print(f"⚠️ No matches found for {sport}.")
                continue

            print(f"📥 Found {len(data)} events. Syncing to Supabase...")

            for item in data:
                # Extracting everything for payout logic
                scores = item.get('scores', {})
                
                event_row = {
                    "id": str(item.get('id')),
                    "sport_key": sport,
                    "home_team": item.get('home'),
                    "away_team": item.get('away'),
                    "commence_time": item.get('date'), # The timestamp for your frontend filters
                    "status": item.get('status', 'unknown'),
                    "home_score": scores.get('home'), # Saves null if game isn't finished
                    "away_score": scores.get('away')
                }

                # UPSERT: If ID exists, update it (capturing status changes). If not, create it.
                supabase.table("api_events").upsert(event_row, on_conflict="id").execute()
                total_count += 1

        except Exception as e:
            print(f"🚨 Critical Failure on {sport}: {str(e)}")

    print(f"\n✅ DONE. Total records in sync: {total_count}")

if __name__ == "__main__":
    fetch_and_sync()
