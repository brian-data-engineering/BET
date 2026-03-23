import os
import requests
from supabase import create_client

# --- CONFIGURATION ---
# Using the Betika API for 'Upcoming' matches
BETIKA_URL = "https://api.betika.com/v1/uo/matches?limit=100&tab=upcoming"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def sync_betika_only():
    print(f"📡 Requesting 100 fresh matches from Betika...")
    
    try:
        # 1. Fetch data from Betika
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        res = requests.get(BETIKA_URL, headers=headers, timeout=20)
        
        if res.status_code != 200:
            print(f"❌ Betika API Error: {res.status_code}")
            return

        data = res.json().get('data', [])
        if not data:
            print("⚠️ No match data found in Betika response.")
            return

        batch_to_upsert = []

        # 2. Process each match
        for item in data:
            # We use match_id as the primary key
            event_id = str(item.get('match_id'))
            
            # 3. Handle Odds safely (prevents the NoneType error)
            try:
                h_odd = float(item.get('home_odd') or 0)
                d_odd = float(item.get('neutral_odd') or 0)
                a_odd = float(item.get('away_odd') or 0)
            except (ValueError, TypeError):
                h_odd, d_odd, a_odd = 0.0, 0.0, 0.0

            # 4. Filter: Only save games that actually have odds
            if h_odd <= 1.01:
                continue

            batch_to_upsert.append({
                "id": event_id,
                "sport_key": item.get('sport_name', 'Soccer').lower(),
                "league_name": f"{item.get('category')} - {item.get('competition_name')}",
                "home_team": item.get('home_team'),
                "away_team": item.get('away_team'),
                "commence_time": item.get('start_time'),
                "status": "pending",
                "home_odds": h_odd,
                "draw_odds": d_odd,
                "away_odds": a_odd,
                "raw_data": item  # Full JSON storage for future-proofing
            })

        # 5. Push to Supabase
        if batch_to_upsert:
            supabase.table("api_events").upsert(batch_to_upsert, on_conflict="id").execute()
            print(f"✅ Success! {len(batch_to_upsert)} Betika matches synced to Supabase.")
        else:
            print("⚠️ No valid matches with odds were found to sync.")

    except Exception as e:
        print(f"🚨 Critical Failure: {str(e)}")

if __name__ == "__main__":
    sync_betika_only()
