import os
import sys
import requests
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

# --- Configuration ---
# Updated to match your exact GitHub Secret Names
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # Maps to SERVICE_ROLE_KEY in YAML
API_KEY = os.environ.get("API_KEY")           # Maps to ODDS_API_KEY in YAML

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Supabase credentials missing.", flush=True)
    sys.exit(1)

if not API_KEY:
    print("❌ ERROR: Odds API Key missing.", flush=True)
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_quota_window():
    """Global Quota Guard: Prevents hitting the API too frequently."""
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
    
    if (diff.total_seconds() / 60) < 60:
        print(f"🛑 QUOTA GUARD: Last sync was recent ({int(diff.total_seconds()/60)}m ago). Standing down.", flush=True)
        return False
    return True

def get_verified_target_slugs():
    """
    BREADCRUMB TRAIL: api_events -> league_mappings (verified) -> soccer_leagues (slug)
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=140)).isoformat()
    
    # 1. Identify leagues with games needing settlement
    pending_res = supabase.table("api_events") \
        .select("league_name") \
        .eq("status", "pending") \
        .lt("commence_time", cutoff) \
        .execute()
    
    if not pending_res.data:
        return []

    pending_scraped_names = list(set(row['league_name'] for row in pending_res.data))

    # 2. Get Official Names from verified mappings
    mapping_res = supabase.table("league_mappings") \
        .select("official_league") \
        .in_("scraped_league", pending_scraped_names) \
        .eq("is_verified", True) \
        .execute()
    
    if not mapping_res.data:
        print("⚠️ Found pending games, but no verified mappings ready.", flush=True)
        return []

    verified_official_names = [m['official_league'] for m in mapping_res.data]

    # 3. Get API Slugs (league_id) from master reference
    leagues_ref = supabase.table("soccer_leagues") \
        .select("league_id, league_name") \
        .in_("league_name", verified_official_names) \
        .execute()

    return leagues_ref.data

def sync_results(batch_limit=80):
    targets = get_verified_target_slugs()

    if not targets:
        print("☕ No active verified leagues to process.", flush=True)
        return

    processing_list = targets[:batch_limit]
    now_utc = datetime.now(timezone.utc)
    from_date = (now_utc - timedelta(hours=48)).isoformat().replace('+00:00', 'Z')
    to_date = now_utc.isoformat().replace('+00:00', 'Z')

    print(f"🎯 Target Strike: Syncing {len(processing_list)} verified leagues...", flush=True)

    for entry in processing_list:
        slug = entry['league_id']
        official_name = entry['league_name']
        
        url = f"https://api.odds-api.io/v3/historical/events?apiKey={API_KEY}&sport=football&league={slug}&from={from_date}&to={to_date}"
        
        try:
            res = requests.get(url, timeout=15)
            if res.status_code == 200:
                events = res.json()
                results = []
                
                for ev in (events or []):
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
                    
                supabase.table("soccer_leagues").update({
                    "last_synced_at": datetime.now(timezone.utc).isoformat()
                }).eq("league_id", slug).execute()
                
                print(f"✅ {official_name} updated.", flush=True)
        except Exception as e:
            print(f"⚠️ Error on {slug}: {e}", flush=True)

if __name__ == "__main__":
    if check_quota_window():
        sync_results()
