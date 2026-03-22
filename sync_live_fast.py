import os
import requests
from supabase import create_client

# 1. Setup Connection (Using GitHub Secrets)
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
api_key = os.environ.get("ODDS_API_KEY")

# --- SAFETY CHECK ---
if not url or not url.startswith("https"):
    print(f"CRITICAL ERROR: SUPABASE_URL is invalid or missing. Value: {url}")
    exit(1)
if not key:
    print("CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing.")
    exit(1)

# Initialize client only after checking variables
supabase = create_client(url, key)

def sync_lucra_odds():
    # 2. The "Batch" URL - v4 is the standard for 100-req limits
    api_url = "https://api.the-odds-api.com/v4/sports/upcoming/odds"
    
    params = {
        'apiKey': api_key,
        'regions': 'uk', 
        'markets': 'h2h',
        'oddsFormat': 'decimal'
    }

    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status() # Check for API errors
        data = response.json()

        for game in data:
            # 3. Upsert into api_events
            event_entry = {
                "id": game['id'],
                "sport_key": game['sport_key'],
                "home_team": game['home_team'],
                "away_team": game['away_team'],
                "commence_time": game['commence_time']
            }
            supabase.table("api_events").upsert(event_entry).execute()

            # 4. Insert into api_odds_history
            if game['bookmakers']:
                bookie = game['bookmakers'][0]
                market = bookie['markets'][0]
                outcomes = market['outcomes']

                home_p = next((o['price'] for o in outcomes if o['name'] == game['home_team']), None)
                away_p = next((o['price'] for o in outcomes if o['name'] == game['away_team']), None)
                draw_p = next((o['price'] for o in outcomes if o['name'].lower() == 'draw'), None)

                odds_entry = {
                    "event_id": game['id'],
                    "bookmaker": bookie['title'],
                    "home_price": home_p,
                    "away_price": away_p,
                    "draw_price": draw_p
                }
                supabase.table("api_odds_history").insert(odds_entry).execute()

        print(f"Successfully synced {len(data)} games to Lucra API tables.")

    except Exception as e:
        print(f"Error during sync: {e}")

if __name__ == "__main__":
    sync_lucra_odds()
