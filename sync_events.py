import os
import requests
import datetime
from supabase import create_client

# --- CONFIGURATION ---
API_KEY = "c42b69e32cda7bd0e13fb473448cebd0fc31510d714850aa0fdf4969b0dd4a65"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_batch_odds(event_ids):
    """Fetch high-fidelity odds for a batch of up to 10 IDs"""
    ids_str = ",".join(event_ids)
    url = f"https://api.odds-api.io/v3/odds?apiKey={API_KEY}&eventId={ids_str}&bookmakers=Bet365,1xbet"
    
    try:
        res = requests.get(url, timeout=20)
        return res.json() if res.status_code == 200 else []
    except Exception as e:
        print(f"⚠️ Batch odds fetch failed: {e}")
        return []

def sync_first_10_only():
    now_iso = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    print(f"🚀 Launching TEST Sync (First 10 matches) from: {now_iso}")
    
    try:
        # 1. Get the list of future events
        events_url = f"https://api.odds-api.io/v3/events?apiKey={API_KEY}&sport=football&limit=1000&from={now_iso}"
        response = requests.get(events_url, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return

        all_events = response.json()
        if not all_events:
            print("⚠️ No matches found.")
            return

        # 2. Get IDs for the matches
        event_ids = [str(e['id']) for e in all_events]
        
        # 3. ONLY process the first batch (0 to 10)
        current_batch_ids = event_ids[0:10] 
        print(f"📡 Processing TEST batch (Matches: {len(current_batch_ids)})...")
        
        detailed_odds = fetch_batch_odds(current_batch_ids)
        
        batch_to_upsert = []
        for item in detailed_odds:
            bookies = item.get('bookmakers', {})
            
            # Priority: 1xBet -> Bet365
            source = bookies.get('1xbet') or bookies.get('Bet365')
            
            h_odds, d_odds, a_odds = None, None, None
            if source:
                # Target the Moneyline (ML) market
                ml = next((m for m in source if m.get('name') == 'ML'), None)
                if ml and ml.get('odds'):
                    o = ml['odds'][0]
                    h_odds, d_odds, a_odds = o.get('home'), o.get('draw'), o.get('away')

            batch_to_upsert.append({
                "id": str(item.get('id')),
                "sport_key": "football",
                "league_name": item.get('league', {}).get('name') or "Unknown League",
                "home_team": item.get('home'),
                "away_team": item.get('away'),
                "commence_time": item.get('date'),
                "status": item.get('status', 'pending'),
                "home_score": item.get('scores', {}).get('home', 0),
                "away_score": item.get('scores', {}).get('away', 0),
                "home_odds": h_odds,
                "draw_odds": d_odds,
                "away_odds": a_odds,
                "priority_level": 1,
                "raw_data": item 
            })

        if batch_to_upsert:
            supabase.table("api_events").upsert(batch_to_upsert, on_conflict="id").execute()
            print(f"✅ TEST Sync Complete. {len(batch_to_upsert)} records updated.")

    except Exception as e:
        print(f"🚨 Critical Failure: {str(e)}")

if __name__ == "__main__":
    sync_first_10_only()
