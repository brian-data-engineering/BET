import os
import sys
from supabase import create_client, Client
from difflib import SequenceMatcher

# Configuration - Updated to match your Secret name
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.", flush=True)
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def similarity(a, b):
    """Calculates string similarity ratio."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def run_mapping():
    print("🔄 Starting Lucra League Mapping...", flush=True)

    # 1. Pull unique soccer leagues from your scraped api_events
    scraped = supabase.table("api_events") \
        .select("league_name") \
        .eq("sport_key", "soccer") \
        .execute()
    
    betika_leagues = set(row['league_name'] for row in scraped.data if row['league_name'])

    if not betika_leagues:
        print("⚠️ No soccer leagues found in api_events. Check your scraper.", flush=True)
        return

    # 2. Pull reference leagues from soccer_leagues
    api_ref = supabase.table("soccer_leagues") \
        .select("league_id, league_name") \
        .execute()
    
    api_list = api_ref.data 

    if not api_list:
        print("⚠️ soccer_leagues table is empty. Sync leagues first.", flush=True)
        return

    mappings = []

    for b_name in betika_leagues:
        best_match = None
        highest_score = 0
        
        for api_item in api_list:
            # Compare against both Name and Slug (with dashes removed)
            score_name = similarity(b_name, api_item['league_name'])
            score_slug = similarity(b_name, api_item['league_id'].replace('-', ' '))
            
            current_max = max(score_name, score_slug)
            
            if current_max > highest_score:
                highest_score = current_max
                best_match = api_item['league_id']

        # Threshold set to 0.6 for fuzzy matching
        if highest_score > 0.6:
            mappings.append({
                "betika_name": b_name,
                "api_slug": best_match,
                "confidence_score": round(highest_score, 2),
                "is_verified": False  # New matches are unverified by default
            })
            print(f"🔗 Match: '{b_name}' -> {best_match} ({int(highest_score*100)}%)", flush=True)

    # 3. Upsert into your league_mappings table
    if mappings:
        supabase.table("league_mappings").upsert(mappings, on_conflict="betika_name").execute()
        print(f"\n✅ Database Updated: {len(mappings)} mappings stored.", flush=True)
    else:
        print("❌ No matches met the confidence threshold.", flush=True)

if __name__ == "__main__":
    run_mapping()
