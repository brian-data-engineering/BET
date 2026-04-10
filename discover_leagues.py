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

    # 1. Fetch unique leagues from api_events
    # We select more than we need to ensure we have context for the mapping
    response = supabase.table("api_events").select("sport_key, country, display_league").execute()
    api_data = response.data

    if not api_data:
        print("No API leagues found to map.")
        return

    # De-duplicate the list based on display_league and sport_key
    unique_api = { (l['sport_key'], l['display_league']): l for l in api_data }.values()

    for sport_name, linebet_id in SPORT_MAPPING.items():
        # Filter API leagues by sport
        relevant_leagues = [l for l in unique_api if sport_name in l['sport_key'].lower()]
        
        if not relevant_leagues:
            continue

        print(f"\n📡 Fetching Linebet data for {sport_name.upper()}...")
        
        try:
            linebet_url = f"https://linebet.com/service-api/result/web/api/v2/champs?lng=en&ref=189&sportIds={linebet_id}"
            lb_response = requests.get(linebet_url).json()
            lb_items = lb_response.get('items', [])

            if not lb_items:
                continue

            # Create a list of Linebet league names for fuzzy matching
            lb_names = [item['name'] for item in lb_items]

            for api_l in relevant_leagues:
                # Fuzzy Match: compare api_display_league against all linebet names
                # extractOne returns (name, score, index)
                match = process.extractOne(api_l['display_league'], lb_names, scorer=fuzz.WRatio)
                
                if match:
                    best_name, confidence, idx = match
                    best_lb_item = lb_items[idx]

                    # Prepare data for Supabase
                    mapping_data = {
                        "api_sport_key": api_l['sport_key'],
                        "api_display_league": api_l['display_league'],
                        "api_country": api_l['country'],
                        "linebet_sport_id": linebet_id,
                        "linebet_league_id": str(best_lb_item['id']),
                        "linebet_league_name": best_lb_item['name'],
                        "confidence_score": int(confidence),
                        "is_verified": confidence > 95 # Auto-verify high confidence
                    }

                    # Upsert into league_mappings
                    supabase.table("league_mappings").upsert(
                        mapping_data, 
                        on_conflict="api_sport_key, api_display_league"
                    ).execute()

                    print(f"Mapped: [{api_l['display_league']}] -> [{best_lb_item['name']}] ({int(confidence)}%)")

        except Exception as e:
            print(f"Error processing {sport_name}: {e}")

if __name__ == "__main__":
    discover_leagues()
