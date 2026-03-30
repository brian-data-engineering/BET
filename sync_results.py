import os
import sys
import requests
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

# --- Configuration ---
# These MUST match the 'env:' keys in your YAML above
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
API_KEY = os.environ.get("API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Supabase credentials missing in environment.", flush=True)
    sys.exit(1)

if not API_KEY:
    print("❌ ERROR: API_KEY missing in environment.", flush=True)
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_quota_window():
    """Returns True if the last sync was more than 60 minutes ago."""
    res = supabase.table("soccer_leagues") \
        .select("last_synced_at") \
        .order("last_synced_at", desc=True) \
        .limit(1) \
        .execute()
    
    if not res.data or not res.data[0]['last_synced_at']:
        return True 

    last_sync = datetime.fromisoformat(res.data[0]['last_synced_at'].replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    diff = now - last_sync
    
    minutes_passed = diff.total_seconds() / 60
    
    if minutes_passed < 60:
        remaining = 60 - int(minutes_passed)
        print(f"🛑 QUOTA GUARD: Only {int(minutes_passed)} mins passed. Wait {remaining} mins.", flush=True)
        return False
    
    return True

def get_sync_window_utc():
    """Returns a 48h window to ensure we catch weekend games."""
    now = datetime.now(timezone.utc)
    # 48h ensures that even if a sync fails, we catch it next time
    yesterday = now - timedelta(hours=48)
    to_date = now.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    from_date = yesterday.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    return from_date, to_date

def get_active_leagues_from_mappings():
    """
    BRAIN OF THE SCRIPT: 
    Finds API slugs for leagues that have pending games > 140 mins old.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=140)).isoformat()
    
    # 1. Get league names from api_events that are pending and finished
    pending_res = supabase.table("api_events") \
        .select("league_name") \
        .eq("status", "pending") \
        .lt("commence_time", cutoff) \
        .execute()
    
    if not pending_res.data:
        return []

    pending_names = set(row['league_name'] for row in pending_res.data)
    
    # 2. Find the corresponding API slugs in our mapping table
    mapping_res = supabase.table("league_mappings") \
        .select("api_slug") \
        .in_("betika_name", list(pending_names)) \
        .execute()
    
    active_slugs = set(row['api_slug'] for row in mapping_res.data if row['api_slug'])
    return list(active_slugs)

def sync_results(batch_limit=80):
    """Cost: Targeted Requests based on your 'Mission Control' logic."""
    from_date, to_date = get_sync_window_utc()
    
    # NEW LOGIC: Instead of priority, we hit ONLY the leagues needing settlement
    target_slugs = get_active_leagues_from_mappings()

    if not target_slugs:
        print("☕ No active leagues ready for settlement. Standing down.", flush=True)
        return

    # Respect the batch limit even for targeted strikes
    leagues_to_process = target_slugs[:batch_limit]
    print(f"🎯 Targeted Strike: Syncing {len(leagues_to_process)} active leagues...", flush=True)

    for slug in leagues_to_process:
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
                        # Also update api_events status for these specific games if IDs match
                        # (Optional: adds a layer of confirmation)
                
                # Update last_synced_at to satisfy the Quota Guard
                supabase.table("soccer_leagues").update({
                    "last_synced_at": datetime.now(timezone.utc).isoformat()
                }).eq("league_id", slug).execute()
                print(f"✅ {slug} updated.", flush=True)

        except Exception as e:
            print(f"⚠️ Error on {slug}: {e}", flush=True)

if __name__ == "__main__":
    # We still check the quota, but now the run is smarter
    if check_quota_window():
        sync_results(batch_limit=80)
    else:
        print("⏭️ Quota Guard active. Run postponed.")
