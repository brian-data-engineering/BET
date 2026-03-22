import os
import requests
from supabase import create_client

# 1. Setup Connection (Using GitHub Secrets)
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use Service Role for Write access
api_key = os.environ.get("ODDS_API_KEY")

supabase = create_client(url, key)

def sync_lucra_odds():
    # 2. The "Batch" URL - Gets upcoming games across multiple sports
    # Using v4/sports/upcoming/odds to maximize your 100-req limit
    api_url = f"https://api.the-odds-api.com/v4/sports/upcoming/odds"
    
    params = {
        'apiKey': api_key,
        'regions': 'uk', # Change to 'us' or 'eu' depending on your bookmaker
        'markets': 'h2h', # Stick to Head-to-Head for now to keep it simple
        'oddsFormat': 'decimal'
    }

    try:
        response = requests.get(api_url, params=params)
        data = response.json()

        for game in data:
            # 3. Upsert into api_events (The Match Info)
            event_entry = {
                "id": game['id'],
                "sport_key": game['sport_key'],
                "home_team": game['home_team'],
                "away_team": game['away_team'],
                "commence_time": game['commence_time']
            }
            supabase.table("api_events").upsert(event_entry).execute()

            # 4. Insert into api_odds_history (The Price Data)
            # We grab the first bookmaker available in the response
            if game['bookmakers']:
                bookie = game['bookmakers'][0]
                market = bookie['markets'][0]
                outcomes = market['outcomes']

                # Logic to handle Home/Away/Draw prices
                home_p = next((o['price'] for o in outcomes if o['name'] == game['home_team']), None)
                away_p = next((o['price'] for o in outcomes if o['name'] == game['away_team']), None)
                draw_p = next((o['price'] for o in outcomes if o['name'] == 'Draw'), None)

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
