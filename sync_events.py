import os
import requests
from supabase import create_client

# --- CONFIGURATION ---
BETIKA_URL = "https://api.betika.com/v1/uo/matches?limit=100&tab=upcoming"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def sync_betika_only():
    print(f"📡 Requesting 100 fresh matches from Betika...")
    
    try:
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

        for item in data:
            event_id = str(item.get('match_id'))
            
            # --- 1. ODDS HANDLING ---
            try:
                h_odd = float(item.get('home_odd') or 0)
                d_odd = float(item.get('neutral_odd') or 0)
                a_odd = float(item.get('away_odd') or 0)
            except (ValueError, TypeError):
                h_odd, d_odd, a_odd = 0.0, 0.0, 0.0

            if h_odd <= 1.01:
                continue

            # --- 2. DATA CLEANING (THE NEW PART) ---
            # Betika provides 'category' (usually Country) and 'competition_name' (the League)
            raw_country = item.get('category', 'International')
            raw_league = item.get('competition_name', 'Other')

            # We strip quotes here so the DB stores clean strings
            clean_country = raw_country.replace('"', '').replace("'", "").strip()
            clean_league = raw_league.replace('"', '').replace("'", "").strip()

            batch_to_upsert.append({
                "id": event_id,
                "sport_key": item.get('sport_name', 'Soccer').lower(),
                # We store them separately for perfect filtering
                "country": clean_country, 
                "league_name": clean_league,
                # We keep the display name for the UI label if needed
                "display_league": f"{clean_country} - {clean_league}",
                "home_team": item.get('home_team'),
                "away_team": item.get('away_team'),
                "commence_time": item.get('start_time'),
                "status": "pending",
                "home_odds": h_odd,
                "draw_odds": d_odd,
                "away_odds": a_odd,
                "raw_data": item 
            })

        # 3. PUSH TO SUPABASE
        if batch_to_upsert:
            # Ensure your table has 'country' and 'league_name' columns!
            supabase.table("api_events").upsert(batch_to_upsert, on_conflict="id").execute()
            print(f"✅ Success! {len(batch_to_upsert)} matches synced with separate Country/League columns.")
        else:
            print("⚠️ No valid matches found.")

    except Exception as e:
        print(f"🚨 Critical Failure: {str(e)}")

if __name__ == "__main__":
    sync_betika_only()
