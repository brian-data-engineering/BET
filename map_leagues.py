import os
import sys
from supabase import create_client, Client
from difflib import SequenceMatcher

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Supabase credentials missing.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def run_mapping():
    print("🔄 Starting League Mapping Diagnostic...", flush=True)

    # 1. Get unique leagues from your scraped data (api_events)
    scraped = supabase.table("api_events") \
        .select("league_name") \
        .eq("sport_key", "soccer") \
        .execute()
    
    betika_leagues = set(row['league_name'] for row in scraped.data if row['league_name'])

    # 2. Get the master list of API slugs (soccer_leagues)
    api_ref = supabase.table("soccer_leagues") \
        .select("league_id, league_name") \
        .execute()
    
    api_list = api_ref.data # List of dicts with league_id and league_name

    mappings = []

    for b_name in betika_leagues:
        best_match = None
        highest_score = 0
        
        for api_item in api_list:
            # Check similarity against both the Slug and the Display Name
            score_name = similarity(b_name, api_item['league_name'])
            score_slug = similarity(b_name, api_item['league_id'].replace('-', ' '))
            
            current_max = max(score_name, score_slug)
            
            if current_max > highest_score:
                highest_score = current_max
                best_match = api_item['league_id']

        # Only save if we are reasonably confident (e.g., > 60% match)
        if highest_score > 0.6:
            mappings.append({
                "betika_name": b_name,
                "api_slug": best_match,
                "confidence_score": round(highest_score, 2)
            })
            print(f"🔗 Mapped: '{b_name}' -> {best_match} ({int(highest_score*100)}%)", flush=True)

    if mappings:
        supabase.table("league_mappings").upsert(mappings, on_conflict="betika_name").execute()
        print(f"\n✅ Successfully updated {len(mappings)} mappings in the database.")
    else:
        print("Empty match set. Ensure soccer_leagues table is populated.")

if __name__ == "__main__":
    run_mapping()
