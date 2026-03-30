import os
import sys
from supabase import create_client, Client
from difflib import SequenceMatcher

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Credentials missing.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def run_mapping():
    print("🔄 Starting Country-Aware Mapping...", flush=True)

    # 1. Get unique leagues AND their countries from api_events
    scraped = supabase.table("api_events") \
        .select("league_name, country") \
        .eq("sport_key", "soccer") \
        .execute()
    
    # Store as a set of tuples: (league_name, country)
    betika_data = set((row['league_name'], row['country']) for row in scraped.data if row['league_name'])

    # 2. Get API reference leagues
    api_ref = supabase.table("soccer_leagues").select("league_id, league_name").execute()
    api_list = api_ref.data 

    mappings = []

    for b_league, b_country in betika_data:
        best_match = None
        highest_score = 0
        
        # Determine the "Search Country" (e.g., 'england', 'brazil')
        search_country = b_country.lower() if b_country else ""

        for api_item in api_list:
            slug = api_item['league_id']
            
            # --- THE COUNTRY LOCK ---
            # Most Odds-API slugs follow: soccer_country_leaguename
            # If the scraped country isn't in the slug, we skip (unless it's International)
            if search_country not in slug and search_country != 'international':
                continue

            # --- THE LEAGUE FUZZY MATCH ---
            score_name = similarity(b_league, api_item['league_name'])
            score_slug = similarity(b_league, slug.split('_')[-1].replace('-', ' '))
            
            current_max = max(score_name, score_slug)
            
            if current_max > highest_score:
                highest_score = current_max
                best_match = slug

        if highest_score > 0.5: # Lower threshold because country-lock handles accuracy
            mappings.append({
                "betika_name": b_league,
                "api_slug": best_match,
                "confidence_score": round(highest_score, 2)
            })
            print(f"✅ {b_country}: '{b_league}' -> {best_match}", flush=True)

    if mappings:
        supabase.table("league_mappings").upsert(mappings, on_conflict="betika_name").execute()
        print(f"\n✨ Successfully mapped {len(mappings)} leagues with country verification.")

if __name__ == "__main__":
    run_mapping()
