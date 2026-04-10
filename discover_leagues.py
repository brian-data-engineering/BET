import os
import requests
from supabase import create_client
from rapidfuzz import process, fuzz

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

SPORT_MAPPING = {
    'soccer': 1,
    'basketball': 3,
    'tennis': 4,
    'ice-hockey': 2
}

def discover_leagues():
    print("--- 🔍 STARTING LEAGUE DISCOVERY (PYTHON) ---")

    # 1. FETCH EVERYTHING FROM API_EVENTS
    # We pull every row, but we will "flatten" duplicates in Python memory
    response = supabase.table("api_events").select("sport_key, country, display_league").execute()
    raw_api_data = response.data

    if not raw_api_data:
        print("❌ CRITICAL: No data found in api_events table.")
        return

    print(f"📊 Total rows pulled from api_events: {len(raw_api_data)}")

    # 2. GRACEFUL DE-DUPLICATION
    # We use a tuple of (sport_key, display_league) as a unique key
    # This ensures we only process each unique league ONCE.
    unique_leagues = {}
    for entry in raw_api_data:
        key_pair = (entry.get('sport_key'), entry.get('display_league'))
        if key_pair not in unique_leagues:
            unique_leagues[key_pair] = entry

    print(f"💎 Unique League-Sport pairs to map: {len(unique_leagues)}")

    # 3. JUMP TO LINEBET
    for sport_name, linebet_id in SPORT_MAPPING.items():
        # Filter our unique list for the current sport
        relevant_targets = [val for key, val in unique_leagues.items() if sport_name in key[0].lower()]
        
        if not relevant_targets:
            print(f"⏩ Skipping {sport_name.upper()}: No unique leagues found in source.")
            continue

        print(f"\n📡 Fetching Linebet Champ List for {sport_name.upper()}...")
        
        try:
            linebet_url = f"https://linebet.com/service-api/result/web/api/v2/champs?lng=en&ref=189&sportIds={linebet_id}"
            lb_response = requests.get(linebet_url).json()
            lb_items = lb_response.get('items', [])

            if not lb_items:
                print(f"⚠️ Linebet returned 0 leagues for sport ID {linebet_id}")
                continue

            lb_names = [item['name'] for item in lb_items]

            # 4. PERFORM FUZZY MAPPING
            for target in relevant_targets:
                source_league = target['display_league']
                
                # Fuzzy Match
                match = process.extractOne(source_league, lb_names, scorer=fuzz.WRatio)
                
                if match:
                    best_name, confidence, idx = match
                    best_lb_item = lb_items[idx]

                    mapping_payload = {
                        "api_sport_key": target['sport_key'],
                        "api_display_league": source_league,
                        "api_country": target['country'],
                        "linebet_sport_id": linebet_id,
                        "linebet_league_id": str(best_lb_item['id']),
                        "linebet_league_name": best_lb_item['name'],
                        "confidence_score": int(confidence),
                        "is_verified": confidence >= 98  # Auto-verify only near-perfect matches
                    }

                    # UPSERT into Supabase
                    # This handles duplicates gracefully: if it exists, it updates; if not, it inserts.
                    supabase.table("league_mappings").upsert(
                        mapping_payload, 
                        on_conflict="api_sport_key, api_display_league"
                    ).execute()

                    print(f"✅ [{int(confidence)}%] '{source_league}' -> '{best_lb_item['name']}'")

        except Exception as e:
            print(f"❌ Error processing {sport_name}: {e}")

if __name__ == "__main__":
    discover_leagues()
