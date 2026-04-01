import os
import sys
import requests
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

# --- Configuration ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") 
API_KEY = os.environ.get("API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not API_KEY:
    print("❌ ERROR: Environment variables (URL, KEY, or API_KEY) missing.", flush=True)
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_verified_api_slugs():
    """
    STRICT BREADCRUMB LOGIC:
    1. Filter league_mappings for verified rows.
    2. Join/Look up league_id in soccer_leagues.
    """
    # Get only verified mappings
    verified_res = supabase.table("league_mappings") \
        .select("official_league") \
        .eq("is_verified", True) \
        .execute()
    
    if not verified_res.data:
        print("📭 No verified leagues found. Bridge is empty.", flush=True)
        return []

    official_names = [row['official_league'] for row in verified_res.data]

    # Get the corresponding slugs (league_id)
    leagues_ref = supabase.table("soccer_leagues") \
        .select("league_id, league_name") \
        .in_("league_name", official_names) \
        .execute()

    return leagues_ref.data

def sync_results():
    targets = get_verified_api_slugs()
    if not targets:
        return

    # 48h sync window
    now_utc = datetime.now(timezone.utc)
    from_date = (now_utc - timedelta(hours=48)).isoformat().replace('+00:00', 'Z')
    to_date = now_utc.isoformat().replace('+00:00', 'Z')

    print(f"🚀 Running Sync for {len(targets)} verified slugs...", flush=True)

    for entry in targets:
        slug = entry['league_id']
        name = entry['league_name']
        
        url = f"https://api.odds-api.io/v3/historical/events?apiKey={API_KEY}&sport=football&league={slug}&from={from_date}&to={to_date}"
        
        try:
            res = requests.get(url, timeout=15)
            if res.status_code == 200:
                events = res.json() or []
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
                    print(f"✅ {name}: Upserted {len(results)} matches.", flush=True)
                
                # Update last_synced_at so the Quota Guard knows we hit this league
                supabase.table("soccer_leagues").update({
                    "last_synced_at": datetime.now(timezone.utc).isoformat()
                }).eq("league_id", slug).execute()

            else:
                print(f"⚠️ API Error for {name} ({slug}): {res.status_code}", flush=True)

        except Exception as e:
            print(f"⚠️ Script Error on {slug}: {e}", flush=True)

if __name__ == "__main__":
    # Note: We run regardless of individual league timers to keep the verified list fresh
    sync_results()
