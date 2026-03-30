import os
import sys
import requests
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

# --- Configuration ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
API_KEY = "394691c0a855a9c21e847bd3600eb8059fc7c57dcfd181c225176ad85973c187"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Supabase credentials missing.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_24h_window_utc():
    """Generates RFC3339 timestamps for the last 24 hours in UTC."""
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)
    # RFC3339 format: YYYY-MM-DDTHH:MM:SSZ
    to_date = now.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    from_date = yesterday.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    return from_date, to_date

def sync_leagues():
    """Step 1: Map all 920+ leagues (Cost: 1 Request)"""
    league_url = f"https://api.odds-api.io/v3/leagues?apiKey={API_KEY}&sport=football&all=true"
    print(f"📡 Mapping Leagues: {league_url}")
    
    try:
        response = requests.get(league_url, timeout=20)
        data = response.json()
        formatted_leagues = []
        
        for item in data:
            l_id = item.get('slug')
            l_name = item.get('name', 'Unknown')
            if not l_id: continue
            
            country = l_name.split(' - ')[0] if ' - ' in l_name else 'International'
            
            # Priority 1 for Brazil/England/Kenya, Priority 2 for others
            prio = 1 if country in ['Brazil', 'England', 'Kenya'] else 2

            formatted_leagues.append({
                "league_id": l_id,
                "league_name": l_name,
                "country_name": country,
                "priority": prio
            })

        if formatted_leagues:
            supabase.table("soccer_leagues").upsert(formatted_leagues).execute()
            print(f"✨ Step 1 Complete: {len(formatted_leagues)} leagues synced to DB.")
    except Exception as e:
        print(f"❌ League Sync Error: {e}")

def sync_historical_results(batch_limit=80):
    """Step 2: Fetch last 24h results for 80 leagues (Cost: 80 Requests)"""
    from_date, to_date = get_24h_window_utc()
    
    # Fetch 80 leagues: prioritize high-prio and those not synced recently
    leagues = supabase.table("soccer_leagues") \
        .select("league_id, league_name") \
        .order("priority", ascending=True) \
        .order("last_synced_at", nulls_first=True) \
        .limit(batch_limit) \
        .execute().data

    print(f"🔄 Processing Results for {len(leagues)} leagues ({from_date} to {to_date})")

    for league in leagues:
        slug = league['league_id']
        res_url = f"https://api.odds-api.io/v3/historical/events?apiKey={API_KEY}&sport=football&league={slug}&from={from_date}&to={to_date}"
        
        try:
            res = requests.get(res_url, timeout=15)
            if res.status_code == 200:
                events = res.json()
                if events:
                    formatted_results = []
                    for ev in events:
                        if ev.get('status') != 'settled': continue
                        
                        scores = ev.get('scores', {})
                        periods = scores.get('periods', {})
                        p1 = periods.get('p1', {})

                        formatted_results.append({
                            "event_id": str(ev.get('id')),
                            "league_id": slug,
                            "home_team": ev.get('home'),
                            "away_team": ev.get('away'),
                            "home_score": scores.get('home'),
                            "away_score": scores.get('away'),
                            "home_p1_score": p1.get('home'),
                            "away_p1_score": p1.get('away'),
                            "match_date": ev.get('date'),
                            "status": "settled"
                        })
                    
                    if formatted_results:
                        supabase.table("soccer_results").upsert(formatted_results).execute()
                        print(f"✅ {slug}: {len(formatted_results)} games saved.")
                
                # Update timestamp so this league moves to back of queue
                supabase.table("soccer_leagues").update({
                    "last_synced_at": datetime.now(timezone.utc).isoformat()
                }).eq("league_id", slug).execute()

        except Exception as e:
            print(f"⚠️ Error on {slug}: {e}")

if __name__ == "__main__":
    # Run both steps
    sync_leagues()
    sync_historical_results(batch_limit=80)
