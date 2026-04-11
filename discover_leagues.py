import os
import time
import requests
from supabase import create_client
from rapidfuzz import process, fuzz

# Setup
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

SPORT_MAPPING = {
    'soccer': 1,
    'ice-hockey': 2,
    'basketball': 3,
    'tennis': 4,
    'table-tennis': 10
}

# Clean list - we want to keep things like 'women' or 'cup' but skip e-sports
FORBIDDEN = ["esports", "battle", "cyber", "fc 24", "fc 25", "fc 26", "u19", "u20", "u21", "youth", "reserve", "srl"]

def discover_leagues():
    print("--- 🔍 STARTING HARVESTER DISCOVERY (POOL MODE) ---")

    # 1. Fetch current mappings to avoid duplicates
    mapping_res = supabase.table("league_mappings").select("linebet_league_id").execute()
    known_linebet_ids = { str(m['linebet_league_id']) for m in mapping_res.data }

    # 2. Fetch source targets from api_events
    response = supabase.table("api_events").select("sport_key, country, display_league").execute()
    api_data = response.data
    if not api_data: return

    unique_api = { (l['sport_key'], l['display_league']): l for l in api_data }.values()
    
    # Timing & Session
    now = int(time.time())
    rounded_to = (now // 3600) * 3600
    rounded_from = rounded_to - 86400
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://linebet.com/en/results/'
    })

    for sport_name, sport_id in SPORT_MAPPING.items():
        relevant_targets = [l for l in unique_api if sport_name in l['sport_key'].lower()]
        if not relevant_targets: continue

        print(f"\n📡 Harvesting {sport_name.upper()}...")
        # Small delay to avoid API throttling
        time.sleep(1.5) 
        
        target_url = "https://linebet.com/service-api/result/web/api/v2/champs"
        params = {'dateFrom': rounded_from, 'dateTo': rounded_to, 'lng': 'en', 'ref': '189', 'sportIds': sport_id}

        try:
            res = session.get(target_url, params=params, timeout=15)
            lb_items = res.json().get('items', [])
            
            # Filter out forbidden junk
            clean_pool = [item for item in lb_items if not any(word in item['name'].lower() for word in FORBIDDEN)]

            for api_l in relevant_targets:
                source_league = api_l['display_league']
                source_country = api_l['country'] or ""
                
                # --- NEW HARVESTER LOGIC ---
                # Find EVERY league that mentions this country
                country_leagues = [
                    item['name'] for item in clean_pool 
                    if source_country.lower() in item['name'].lower()
                ]
                
                # Create the Discovery Pool string (Double Comma)
                discovery_pool = " ,, ".join(list(set(country_leagues)))

                # Find the Best Match for the initial auto-mapping
                potential_matches = [
                    item for item in clean_pool 
                    if fuzz.partial_ratio(source_league.lower(), item['name'].lower()) > 85
                ]

                for match_item in potential_matches:
                    lb_id = str(match_item['id'])
                    
                    if lb_id not in known_linebet_ids:
                        print(f"✨ POOLED: {source_league} -> {match_item['name']} ({len(country_leagues)} candidates)")
                        
                        supabase.table("league_mappings").upsert({
                            "api_sport_key": api_l['sport_key'],
                            "api_display_league": source_league,
                            "api_country": source_country,
                            "linebet_sport_id": sport_id,
                            "linebet_league_id": lb_id,
                            "linebet_league_name": match_item['name'],
                            "discovery_pool": discovery_pool, # Saving the whole country list
                            "confidence_score": 100,
                            "is_verified": False
                        }, on_conflict="linebet_league_id").execute()
                        
                        known_linebet_ids.add(lb_id)

        except Exception as e:
            print(f"❌ Error in {sport_name}: {e}")

if __name__ == "__main__":
    discover_leagues()
