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
    
    # Store as a set of tuples to unique-ify the source data
    betika_data = set((row['league_name'], row['country']) for row in scraped.data if row['league_name'])

    # 2. Get API reference leagues
    api_ref = supabase.table("soccer_leagues").select("league_id, league_name").execute()
    api_list = api_ref.data 

    # We use a dictionary keyed by betika_name to ensure NO duplicates hit the upsert
    final_mappings_dict = {}

    for b_league, b_country in betika_data:
        best_match = None
        highest_score = 0
        search_country = b_country.lower() if b_country else ""

        for api_item in api_list:
            slug = api_item['league_id'].lower()
            
            # --- THE COUNTRY LOCK & HALLUCINATION PREVENTION ---
            # If country is 'International', we ONLY allow slugs starting with 'soccer_international'
            if search_country == 'international':
                if 'international' not in slug:
                    continue
            # If it's a specific country (e.g. 'Spain'), it MUST be in the slug
            elif search_country and search_country not in slug:
                continue

            # --- THE LEAGUE FUZZY MATCH ---
            score_name = similarity(b_league, api_item['league_name'])
            # Extract league part from slug (e.g., soccer_spain_laliga -> laliga)
            slug_parts = slug.split('_')
            slug_league_name = slug_parts[-1].replace('-', ' ')
            score_slug = similarity(b_league, slug_league_name)
            
            current_max = max(score_name, score_slug)
            
            if current_max > highest_score:
                highest_score = current_max
                best_match = api_item['league_id']

        # Threshold check
        if highest_score > 0.45: 
            # This line solves the "ON CONFLICT" error by overwriting duplicates in memory first
            final_mappings_dict[b_league] = {
                "betika_name": b_league,
                "api_slug": best_match,
                "confidence_score": round(highest_score, 2)
            }
            print(f"✅ {b_country}: '{b_league}' -> {best_match} ({highest_score:.2f})", flush=True)

    # 3. Final Upsert
    if final_mappings_dict:
        mappings_list = list(final_mappings_dict.values())
        try:
            supabase.table("league_mappings").upsert(
                mappings_list, 
                on_conflict="betika_name"
            ).execute()
            print(f"\n✨ Successfully pushed {len(mappings_list)} unique leagues to Lucra database.")
        except Exception as e:
            print(f"❌ Database Error: {e}")
    else:
        print("⚠️ No new mappings found.")

if __name__ == "__main__":
    run_mapping()
