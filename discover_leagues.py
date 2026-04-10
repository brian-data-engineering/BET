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

def discover_leagues():
    print("--- 🔍 STARTING LEAGUE DISCOVERY (PYTHON) ---")

    # 1. Fetch source data
    response = supabase.table("api_events").select("sport_key, country, display_league").execute()
    api_data = response.data
    if not api_data:
        print("❌ No data in api_events.")
        return

    unique_api = { (l['sport_key'], l['display_league']): l for l in api_data }.values()
    print(f"📊 Processing {len(unique_api)} unique leagues from API.")

    # 2. Timing
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
        if not relevant_targets:
            continue

        print(f"\n📡 Fetching {sport_name.upper()} (ID: {sport_id})...")
        
        target_url = "https://linebet.com/service-api/result/web/api/v2/champs"
        params = {
            'dateFrom': rounded_from,
            'dateTo': rounded_to,
            'lng': 'en',
            'ref': '189',
            'sportIds': sport_id
        }

        try:
            res = session.get(target_url, params=params, timeout=15)
            data = res.json()
            lb_items = data.get('items', [])

            if not lb_items:
                params['dateFrom'] = rounded_from - 86400 
                res = session.get(target_url, params=params)
                lb_items = res.json().get('items', [])

            if not lb_items:
                print(f"❌ No leagues found for {sport_name}.")
                continue

            print(f"✅ Found {len(lb_items)} leagues on Linebet. Starting Country-Scoped matching...")

            for api_l in relevant_targets:
                source_league = api_l['display_league']
                source_country = api_l['country'] or ""

                # STEP: Filter Linebet items that mention the specific country
                country_pool = [
                    item for item in lb_items 
                    if source_country.lower() in item['name'].lower()
                ]

                # Fallback: if country filter yields nothing (like for "UEFA"), use full list
                final_search_items = country_pool if country_pool else lb_items
                final_search_names = [item['name'] for item in final_search_items]

                # Fuzzy match within the scoped pool
                match = process.extractOne(source_league, final_search_names, scorer=fuzz.WRatio)
                
                if match:
                    best_name, confidence, idx = match
                    best_lb_item = final_search_items[idx]

                    # Auto-verify only if it's a high-confidence match within the correct country
                    is_verified = False
                    if confidence >= 95 and (not country_pool or source_country.lower() in best_name.lower()):
                        is_verified = True

                    mapping_payload = {
                        "api_sport_key": api_l['sport_key'],
                        "api_display_league": source_league,
                        "api_country": source_country,
                        "linebet_sport_id": sport_id,
                        "linebet_league_id": str(best_lb_item['id']),
                        "linebet_league_name": best_lb_item['name'],
                        "confidence_score": int(confidence),
                        "is_verified": is_verified
                    }

                    supabase.table("league_mappings").upsert(
                        mapping_payload, 
                        on_conflict="api_sport_key, api_display_league"
                    ).execute()

                    status_icon = "⭐" if is_verified else "⏳"
                    print(f"   {status_icon} [{int(confidence)}%] '{source_league}' ({source_country}) -> '{best_lb_item['name']}'")

        except Exception as e:
            print(f"❌ Error in loop: {e}")

if __name__ == "__main__":
    discover_leagues()
