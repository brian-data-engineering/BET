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
    if not a or not b: return 0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def run_mapping():
    print("🔄 Starting Lucra Hard-Break Mapper (Betsnow Edition)...", flush=True)

    # 1. Fetch data from betsnow
    betsnow_data = supabase.table("betsnow") \
        .select("league_name, country") \
        .execute()
    
    active_leagues = set()
    for row in betsnow_data.data:
        l_raw = row.get('league_name') or ""
        c_raw = row.get('country') or ""

        # --- THE FIX: Split by DOUBLE COMMA (the separator we added in React) ---
        # This keeps "League, Women" as ONE item.
        leagues = [l.strip() for l in l_raw.split(', ,') if l.strip()]
        countries = [c.strip() for c in c_raw.split(', ,') if c.strip()]
        
        # Zip them accurately using the double-comma indices
        for i, league in enumerate(leagues):
            # Fallback for country if indices don't match exactly
            country = countries[i] if i < len(countries) else (countries[0] if countries else "Unknown")
            
            if league not in ["Unknown League", "General League"]:
                active_leagues.add((league, country))

    # 2. Get API reference leagues from soccer_leagues
    api_ref = supabase.table("soccer_leagues").select("league_id, league_name").execute()
    api_list = api_ref.data 

    final_mappings_dict = {}

    for b_league, b_country in active_leagues:
        best_match_id = None
        best_match_name = None
        highest_score = 0
        search_country = b_country.lower() if b_country else ""

        for api_item in api_list:
            slug = api_item['league_id'].lower()
            
            # --- COUNTRY LOCK ---
            if search_country != 'international':
                if search_country and search_country not in slug:
                    continue
            elif 'international' not in slug:
                continue

            # --- FUZZY MATCHING ---
            score_name = similarity(b_league, api_item['league_name'])
            
            slug_parts = slug.split('_')
            slug_league_part = slug_parts[-1].replace('-', ' ')
            score_slug = similarity(b_league, slug_league_part)
            
            current_max = max(score_name, score_slug)
            
            if current_max > highest_score:
                highest_score = current_max
                best_match_id = api_item['league_id']
                best_match_name = api_item['league_name']

        # Threshold check
        if highest_score > 0.45: 
            final_mappings_dict[b_league] = {
                "scraped_league": b_league,
                "official_league": best_match_name,
                "official_country": b_country,
                "is_verified": False 
            }
            print(f"✅ Found: '{b_league}' ({b_country}) -> {best_match_name} [{highest_score:.2f}]")

    # 3. Final Upsert
    if final_mappings_dict:
        mappings_list = list(final_mappings_dict.values())
        try:
            supabase.table("league_mappings").upsert(
                mappings_list, 
                on_conflict="scraped_league" 
            ).execute()
            print(f"\n✨ Successfully mapped {len(mappings_list)} leagues from your recent bets.")
        except Exception as e:
            print(f"❌ Database Error: {e}")
    else:
        print("⚠️ No new leagues found in betsnow to map.")

if __name__ == "__main__":
    run_mapping()
