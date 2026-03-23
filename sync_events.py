import os
import requests
import datetime
from supabase import create_client

# --- CONFIGURATION ---
API_KEY = "c42b69e32cda7bd0e13fb473448cebd0fc31510d714850aa0fdf4969b0dd4a65"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def sync_betika_matches():
    """Fetches upcoming matches directly from Betika's API"""
    # Using the Betika endpoint you provided
    url = "https://api.betika.com/v1/uo/matches?limit=50&tab=upcoming"
    print(f"📡 Fetching fresh games from Betika...")
    
    try:
        res = requests.get(url, timeout=20)
        if res.status_code != 200:
            print(f"❌ Betika API Error: {res.status_code}")
            return

        data = res.json().get('data', [])
        batch_to_upsert = []

        for item in data:
            # We prefix ID with 'btk_' to avoid conflicts with other APIs
            event_id = f"btk_{item.get('match_id')}"
            
            # Map Betika fields to your Supabase schema
            batch_to_upsert.append({
                "id": event_id,
                "sport_key": item.get('sport_name', 'Soccer').lower(),
                "league_name": f"{item.get('category')} - {item.get('competition_name')}",
                "home_team": item.get('home_team'),
                "away_team": item.get('away_team'),
                "commence_time": item.get('start_time'),
                "status": "pending",
                "home_score": 0,
                "away_score": 0,
                "home_odds": float(item.get('home_odd', 0)),
                "draw_odds": float(item.get('neutral_odd', 0)),
                "away_odds": float(item.get('away_odd', 0)),
                "priority_level": 2, # Priority 2 for Betika
                "raw_data": item
            })

        if batch_to_upsert:
            supabase.table("api_events").upsert(batch_to_upsert, on_conflict="id").execute()
            print(f"✅ Betika Sync Complete. {len(batch_to_upsert)} matches updated.")

    except Exception as e:
        print(f"⚠️ Betika Sync failed: {e}")

def fetch_batch_odds(event_ids):
    """Fetch high-fidelity odds for a batch of up to 10 IDs from Odds API"""
    ids_str = ",".join(event_ids)
    url = f"https://api.odds-api.io/v3/odds?apiKey={API_KEY}&eventId={ids_str}&bookmakers=Bet365,1xbet"
    try:
        res = requests.get(url, timeout=20)
        return res.json() if res.status_code == 200 else []
    except Exception as e:
        print(f"⚠️ Batch odds fetch failed: {e}")
        return []

def sync_odds_api_test():
    """The original Odds API test logic (First 10 matches)"""
    now_iso = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    print(f"🚀 Launching Odds API Test Sync from: {now_iso}")
    try:
        events_url = f"https://api.odds-api.io/v3/events?apiKey={API_KEY}&sport=football&limit=10&from={now_iso}"
        response = requests.get(events_url, timeout=30)
        if response.status_code != 200: return
        
        all_events = response.json()
        event_ids = [str(e['id']) for e in all_events]
        detailed_odds = fetch_batch_odds(event_ids)
        
        batch_to_upsert = []
        for item in detailed_odds:
            bookies = item.get('bookmakers', {})
            source = bookies.get('1xbet') or bookies.get('Bet365')
            h, d, a = None, None, None
            if source:
                ml = next((m for m in source if m.get('name') == 'ML'), None)
                if ml and ml.get('odds'):
                    o = ml['odds'][0]
                    h, d, a = o.get('home'), o.get('draw'), o.get('away')

            batch_to_upsert.append({
                "id": str(item.get('id')),
                "sport_key": "football",
                "league_name": item.get('league', {}).get('name'),
                "home_team": item.get('home'),
                "away_team": item.get('away'),
                "commence_time": item.get('date'),
                "status": "pending",
                "home_odds": h, "draw_odds": d, "away_odds": a,
                "priority_level": 1,
                "raw_data": item 
            })

        if batch_to_upsert:
            supabase.table("api_events").upsert(batch_to_upsert, on_conflict="id").execute()
            print(f"✅ Odds API Sync Complete.")
    except Exception as e:
        print(f"🚨 Odds API Failure: {e}")

if __name__ == "__main__":
    # Run both!
    sync_betika_matches()
    sync_odds_api_test()
