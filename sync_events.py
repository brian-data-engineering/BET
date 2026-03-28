import os
import requests
import json
from supabase import create_client
from datetime import datetime, timedelta

# --- CONFIGURATION ---
BETIKA_URL = "https://api.betika.com/v1/uo/matches?page=1&limit=1000"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_text(text):
    if not text: return ""
    # Removing quotes as requested for Lucra project compatibility
    return str(text).replace('"', '').replace("'", "").strip()

def sync_betika_only():
    ALLOWED_SPORTS = ['soccer', 'basketball', 'tennis', 'ice hockey', 'table tennis']
    
    print(f"📡 Requesting fresh matches from Betika...")
    
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
            print("⚠️ No match data found.")
            return

        batch_to_upsert = []
        synced_ids = [] 

        for item in data:
            # 1. SPORT FILTER
            raw_sport = str(item.get('sport_name', '')).lower()
            if raw_sport not in ALLOWED_SPORTS:
                continue

            sport_key = raw_sport.replace(' ', '-')
            
            # 2. IDENTIFIERS
            event_id = str(item.get('match_id'))
            # Use parent_match_id from JSON, fallback to match_id
            parent_id = str(item.get('parent_match_id') or item.get('match_id'))
            synced_ids.append(event_id)
            
            # 3. ODDS PARSING
            try:
                h_odd = float(item.get('home_odd') or 0)
                d_odd = float(item.get('neutral_odd') or 0)
                a_odd = float(item.get('away_odd') or 0)
            except (ValueError, TypeError):
                h_odd, d_odd, a_odd = 0.0, 0.0, 0.0

            if h_odd <= 1.01: continue 

            # 4. COUNTRY & LEAGUE MAPPING
            # Logic: Pull 'category' for country, 'competition_name' for league
            raw_league = clean_text(item.get('competition_name'))
            raw_country = clean_text(item.get('category') or "International")
            
            # Formatting Display League for the UI
            display_league = f"{raw_country} - {raw_league}" if raw_country != "International" else raw_league

            # 5. CONSTRUCT OBJECT FOR api_events TABLE
            batch_to_upsert.append({
                "id": event_id,
                "parent_id": parent_id,
                "sport_key": sport_key,
                "league_name": raw_league,
                "display_league": display_league,
                "country": raw_country,
                "home_team": clean_text(item.get('home_team')),
                "away_team": clean_text(item.get('away_team')),
                "commence_time": item.get('start_time'),
                "status": "pending",
                "home_score": 0,
                "away_score": 0,
                "home_odds": h_odd,
                "draw_odds": d_odd,
                "away_odds": a_odd,
                "raw_data": item,
                "last_updated": datetime.now().isoformat()
            })

        # 6. UPSERT TO SUPABASE
        if batch_to_upsert:
            supabase.table("api_events").upsert(batch_to_upsert, on_conflict="id").execute()
            print(f"✅ Success! {len(batch_to_upsert)} matches synced.")

            # 7. CLEANUP
            cutoff = (datetime.now() - timedelta(hours=3)).isoformat()
            try:
                # Remove old games
                supabase.table("api_events").delete().lt("commence_time", cutoff).execute()
                
                # Cleanup vanished games
                if len(synced_ids) < 900:
                    supabase.table("api_events").delete().eq("status", "pending").not_.in_("id", synced_ids).execute()
                
                print(f"🧹 Cleanup complete.")
            except Exception as clean_err:
                print(f"⚠️ Cleanup note: {clean_err}")
        else:
            print("⚠️ No matches passed the filters.")

    except Exception as e:
        print(f"🚨 Critical Failure: {str(e)}")

if __name__ == "__main__":
    sync_betika_only()
