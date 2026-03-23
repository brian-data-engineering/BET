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

def fetch_and_sync():
    print(f"🚀 Starting Lucra High-Speed Sync...")
    total_synced = 0

    for sport in LUCRA_SPORTS:
        try:
            # V3 URL as requested
            url = f"https://api.odds-api.io/v3/events?apiKey={API_KEY}&sport={sport}&limit=10000"
            
            print(f"📡 Fetching {sport.upper()}...")
            # Added a 30s timeout so the script doesn't freeze if the API is slow
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                print(f"❌ API Error for {sport}: {response.status_code}")
                continue

            data = response.json()
            if not data or not isinstance(data, list):
                print(f"⚠️ No matches found for {sport}.")
                continue

            # --- BULK DATA PREPARATION ---
            # Collect all matches for this sport into one list
            sport_batch = []
            for item in data:
                scores = item.get('scores', {})
                sport_batch.append({
                    "id": str(item.get('id')),
                    "sport_key": sport,
                    "home_team": item.get('home'),
                    "away_team": item.get('away'),
                    "commence_time": item.get('date'),
                    "status": item.get('status', 'unknown'),
                    "home_score": scores.get('home'),
                    "away_score": scores.get('away')
                })

            # 🔥 THE SPEED FIX: Bulk Upsert (1 request to Supabase per sport)
            if sport_batch:
                print(f"📦 Sending {len(sport_batch)} matches to Supabase...")
                supabase.table("api_events").upsert(sport_batch, on_conflict="id").execute()
                total_synced += len(sport_batch)

        except Exception as e:
            print(f"🚨 Critical Failure on {sport}: {str(e)}")

    print(f"\n✅ DONE. Total records synced: {total_synced}")

if __name__ == "__main__":
    fetch_and_sync()
