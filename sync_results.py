import os
import requests
from supabase import create_client, Client

# These will be set in your GitHub Actions secrets
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

API_URL = "https://api.odds-api.io/v3/events?apiKey=394691c0a855a9c21e847bd3600eb8059fc7c57dcfd181c225176ad85973c187&sport=football&limit=1000"

def sync_results():
    try:
        response = requests.get(API_URL)
        events = response.json()

        if not isinstance(events, list):
            print("Invalid response from API")
            return

        formatted_data = []
        for event in events:
            # Safely navigate the nested JSON
            scores = event.get('scores', {})
            periods = scores.get('periods', {})
            fulltime = periods.get('fulltime', {})
            p1 = periods.get('p1', {})

            formatted_data.append({
                "id": event.get('id'),
                "home_name": event.get('home'),
                "away_name": event.get('away'),
                "match_date": event.get('date'),
                "league_name": event.get('league', {}).get('name'),
                "status": event.get('status'),
                "home_score": scores.get('home', 0),
                "away_score": scores.get('away', 0),
                "fulltime_home": fulltime.get('home'),
                "fulltime_away": fulltime.get('away'),
                "half_time_home": p1.get('home'),
                "half_time_away": p1.get('away')
            })

        # Upsert into Supabase
        result = supabase.table("results").upsert(formatted_data).execute()
        print(f"✅ Successfully synced {len(formatted_data)} results.")

    except Exception as e:
        print(f"❌ Error during sync: {e}")

if __name__ == "__main__":
    sync_results()
