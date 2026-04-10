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

FORBIDDEN = ["esports", "battle", "cyber", "fc 24", "fc 25", "fc 26", "u19", "u20", "u21", "youth", "reserve", "srl"]

def discover_leagues():
    print("--- 🔍 STARTING LEAGUE DISCOVERY (EFFICIENCY MODE) ---")

    # 1. Fetch current mappings to see what is already verified
    mapping_res = supabase.table("league_mappings").select("api_sport_key, api_display_league, is_verified").execute()
    verified_set = { (m['api_sport_key'], m['api_display_league']) for m in mapping_res.data if m['is_verified'] }

    # 2. Fetch source data
    response = supabase.table("api_events").select("sport_key, country, display_league").execute()
    api_data = response.data
    if not api_data: return

    # Filter out anything already verified in the UI before we even hit Linebet
    unique_api = { (l['sport_key'], l['display_league']): l for l in api_data }.values()
    targets_to_process = [l for l in unique_api if (l['sport_key'], l['display_league']) not in verified_set]
    
    skipped_count = len(unique_api) - len(targets_to_process)
    print(f"📊 Total Unique: {len(unique_api)} | ✅ Verified/Skipped: {skipped_count} | 🎯 Need Matching: {len(targets_to_process)}")

    if not targets_to_process:
        print("✨ All leagues are verified. Efficiency 100%.")
        return

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
        # Only process targets for this sport that aren't verified
        relevant_targets = [l for l in targets_to_process if sport_name in l['sport_key'].lower()]
        if not relevant_targets: continue

        print(f"\n📡 Fetching {sport_name.upper()}...")
        
        target_url = "https://linebet.com/service-api/result/web/api/v2/champs"
        params = {'dateFrom': rounded_from, 'dateTo': rounded_to, 'lng': 'en', 'ref': '189', 'sportIds': sport_id}

        try:
            res = session.get(target_url, params=params, timeout=15)
            lb_items = res.json().get('items', [])
            clean_pool = [item for item in lb_items if not any(word in item['name'].lower() for word in FORBIDDEN)]

            for api_l in relevant_targets:
                source_league = api_l['display_league']
                source_country = api_l['country'] or ""

                country_pool = [i for i in clean_pool if source_country.lower() in i['name'].lower()]
                search_items = country_pool if country_pool else clean_pool
                search_names = [i['name'] for i in search_items]

                if not search_names: continue

                match = process.extractOne(source_league, search_names, scorer=fuzz.WRatio)
                
                if match:
                    best_name, confidence, idx = match
                    best_lb_item = search_items[idx]

                    # Logic: Upsert but DO NOT overwrite is_verified if it's already there 
                    # (Though targets_to_process already filtered them out, this is an extra safety)
                    supabase.table("league_mappings").upsert({
                        "api_sport_key": api_l['sport_key'],
                        "api_display_league": source_league,
                        "api_country": source_country,
                        "linebet_sport_id": sport_id,
                        "linebet_league_id": str(best_lb_item['id']),
                        "linebet_league_name": best_lb_item['name'],
                        "confidence_score": int(confidence),
                        "is_verified": False # Keep as false for you to confirm in UI
                    }, on_conflict="api_sport_key, api_display_league").execute()

                    print(f"   ⏳ [{int(confidence)}%] '{source_league}' -> '{best_lb_item['name']}'")

        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    discover_leagues()
