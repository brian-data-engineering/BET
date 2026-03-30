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
    print("❌ ERROR: Supabase credentials missing.", flush=True)
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_quota_window():
    """Returns True if the last sync was more than 60 minutes ago."""
    # We check the most recently updated league to see when the last batch ended
    res = supabase.table("soccer_leagues") \
        .select("last_synced_at") \
        .order("last_synced_at", desc=True) \
        .limit(1) \
        .execute()
    
    if not res.data or not res.data[0]['last_synced_at']:
        return True # Never run before, proceed!

    last_sync = datetime.fromisoformat(res.data[0]['last_synced_at'].replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    diff = now - last_sync
    
    minutes_passed = diff.total_seconds() / 60
    
    if minutes_passed < 60:
        remaining = 60 - int(minutes_passed)
        print(f"🛑 QUOTA GUARD: Only {int(minutes_passed)} mins passed since last sync. Wait {remaining} more mins.", flush=True)
        return False
    
    return True

def get_24h_window_utc():
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)
    to_date = now.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    from_date = yesterday.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    return from_date, to_date

def sync_leagues():
    """Cost: 1 Request. Updates league list."""
    url = f"https://api.odds-api.io/v3/leagues?apiKey={API_KEY}&sport=football&all=true"
    try:
        data = requests.get(url, timeout=20).json()
        formatted = []
        for item in data:
            l_id = item.get('slug')
            if not l_id: continue
            name = item.get('name', 'Unknown')
            country = name.split(' - ')[0] if ' - ' in name else 'International'
            prio = 1 if country in ['Brazil', 'England', 'Kenya'] else 2
            formatted.append({"league_id": l_id, "league_name": name, "country_name": country, "priority": prio})
        
        if formatted:
            supabase.table("soccer_leagues").upsert(formatted).execute()
            print(f"✨ Mapped {len(formatted)} leagues.", flush=True)
    except Exception as e:
        print(f"⚠️ League sync failed: {e}", flush=True)

def sync_results(batch_limit=80):
    """Cost: 80 Requests. Fetches match scores."""
    from_date, to_date = get_24h_window_utc()
    
    # Standard query: Priority 1 first, then NULLs, then oldest synced
    leagues = supabase.table("soccer_leagues") \
        .select("league_id") \
        .order("priority") \
        .order("last_synced_at") \
        .limit(batch_limit) \
        .execute().data

    print(f"🔄 Syncing batch of {len(leagues)} leagues...", flush=True)

    for league in leagues:
        slug = league['league_id']
        url = f"https://api.odds-api.io/v3/historical/events?apiKey={API_KEY}&sport=football&league={slug}&from={from_date}&to={to_date}"
        
        try:
            res = requests.get(url, timeout=15)
            if res.status_code == 200:
                events = res.json()
                if events:
                    results = []
                    for ev in events:
                        if ev.get('status') != 'settled': continue
                        sc = ev.get('scores', {})
                        p1 = sc.get('periods', {}).get('p1', {})
                        results.append({
                            "event_id": str(ev.get('id')),
                            "league_id": slug,
                            "home_team": ev.get('home'),
                            "away_team": ev.get('away'),
                            "home_score": sc.get('home'),
                            "away_score": sc.get('away'),
                            "home_p1_score": p1.get('home'),
                            "away_p1_score": p1.get('away'),
                            "match_date": ev.get('date'),
                            "status": "settled"
                        })
                    if results:
                        supabase.table("soccer_results").upsert(results).execute()
                
                # Mark as synced NOW
                supabase.table("soccer_leagues").update({
                    "last_synced_at": datetime.now(timezone.utc).isoformat()
                }).eq("league_id", slug).execute()
                print(f"✅ {slug} synced.", flush=True)

        except Exception as e:
            print(f"⚠️ Error on {slug}: {e}", flush=True)

if __name__ == "__main__":
    # The Gatekeeper check
    if check_quota_window():
        sync_leagues()
        sync_results(batch_limit=80)
    else:
        print("⏭️ Skipping sync to protect API quota.")
