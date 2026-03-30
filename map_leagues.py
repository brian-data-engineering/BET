import os
import sys
from supabase import create_client, Client
from difflib import SequenceMatcher

# Configuration using your exact format
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Supabase credentials missing.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def similarity(a, b):
    """Calculates how similar two strings are."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def run_mapping():
    print("🔄 Starting League Mapping Diagnostic...", flush=True)

    # 1. Get unique leagues from your scraped data (api_events)
    # This filters for soccer as you requested
    scraped = supabase.table("api_events") \
        .select("league_name") \
        .eq("sport_key", "soccer") \
        .execute()
    
    # Extract unique names and remove None values
    betika_leagues = set(row['league_name'] for row in scraped.data if row['league_name'])

    if not betika_leagues:
        print("⚠️ No soccer leagues found in api_events. Is the scraper running?", flush=True)
        return

    # 2. Get the master list of API slugs from soccer_leagues for comparison
    api_ref = supabase.table("soccer_leagues") \
        .select("league_id, league_name") \
        .execute()
    
    api_list = api_ref.data 

    if not api_list:
        print("⚠️ soccer_leagues table is empty. Run the league sync script first.", flush=True)
        return

    mappings = []

    for b_name in betika_leagues:
        best_match = None
        highest_score = 0
        
        for api_item in api_list:
            # Check similarity against both the Slug and the Display Name
            # e.g., compare "England Premier League" vs "england-premier-league"
            score_name = similarity(b_name, api_item['league_name'])
            score_slug = similarity(b_name, api_item['league_id'].replace('-', ' '))
            
            current_max = max(score_name, score_slug)
            
            if current_max > highest_score:
                highest_score = current_max
                best_match = api_item['league_id']

        # Save if confidence is > 60%
        if highest_score > 0.6:
            mappings.append({
                "betika_name": b_name,
                "api_slug": best_match,
                "confidence_score": round(highest_score, 2)
            })
            print(f"🔗 Mapped: '{b_name}' -> {best_match} ({int(highest_score*100)}%)", flush=True)

    # 3. Save the results back to Supabase
    if mappings:
        # on_conflict="betika_name" ensures we don't create duplicates
        supabase.table("league_mappings").upsert(mappings, on_conflict="betika_name").execute()
        print(f"\n✅ Successfully updated {len(mappings)} mappings in the database.", flush=True)
    else:
        print("❌ No matches found with high enough confidence.", flush=True)

if __name__ == "__main__":
    run_mapping()
