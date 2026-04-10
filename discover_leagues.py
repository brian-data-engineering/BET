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

# Forbidden keywords to prevent garbage matches
FORBIDDEN = ["esports", "battle", "cyber", "fc 24", "fc 25", "fc 26", "u19", "u20", "u21", "youth", "reserve", "srl"]

def discover_leagues():
    print("--- 🔍 STARTING LEAGUE DISCOVERY (PYTHON) ---")

    response = supabase.table("api_events").select("sport_key, country, display_league").execute()
    api_data = response.data
    if not api_data: return

    unique_api = { (l['sport_key'], l['display_league']): l for l in api_data }.values()
    
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

        print(f"\n📡 Fetching {sport_name.upper()}...")
        
        target_url = "https://linebet.com/service-api/result/web/api/v2/champs"
        params = {'dateFrom': rounded_from, 'dateTo': rounded_to, 'lng': 'en', 'ref': '189', 'sportIds': sport_id}

        try:
            res = session.get(target_url, params=params, timeout=15)
            lb_items = res.json().get('items', [])

            # --- CLEANING THE POOL ---
            # Remove eSports and Youth leagues from the candidate pool immediately
            clean_pool = [
                item for item in lb_items 
                if not any(word in item['name'].lower() for word in FORBIDDEN)
            ]
            print(f"✅ Found {len(lb_items)} total. Filtered to {len(clean_pool)} real leagues.")

            for api_l in relevant_targets:
                source_league = api_l['display_league']
                source_country = api_l['country'] or ""

                # Step 1: Filter by Country
                country_pool = [i for i in clean_pool if source_country.lower() in i['name'].lower()]
                
                # Step 2: Decide search candidates
                search_items = country_pool if country_pool else clean_pool
                search_names = [i['name'] for i in search_items]

                if not search_names: continue

                # Step 3: Match
                match = process.extractOne(source_league, search_names, scorer=fuzz.WRatio)
                
                if match:
                    best_name, confidence, idx = match
                    best_lb_item = search_items[idx]

                    # Auto-verify only high confidence real matches
                    is_verified = False
                    if confidence >= 90 and (source_country.lower() in best_name.lower()):
                        is_verified = True

                    supabase.table("league_mappings").upsert({
                        "api_sport_key": api_l['sport_key'],
                        "api_display_league": source_league,
                        "api_country": source_country,
                        "linebet_sport_id": sport_id,
                        "linebet_league_id": str(best_lb_item['id']),
                        "linebet_league_name": best_lb_item['name'],
                        "confidence_score": int(confidence),
                        "is_verified": is_verified
                    }, on_conflict="api_sport_key, api_display_league").execute()

                    icon = "⭐" if is_verified else "⏳"
                    print(f"   {icon} [{int(confidence)}%] '{source_league}' -> '{best_lb_item['name']}'")

        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    discover_leagues()
