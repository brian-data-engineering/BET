import os
import sys
import requests
from supabase import create_client, Client

# Configuration from GitHub Secrets / Environment
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
API_KEY = "394691c0a855a9c21e847bd3600eb8059fc7c57dcfd181c225176ad85973c187"

if not url or not key:
    print("❌ ERROR: SUPABASE_URL or SUPABASE_KEY is missing.")
    sys.exit(1)

supabase: Client = create_client(url, key)

def sync_all_leagues():
    # Your verified working URL for all football leagues
    league_url = f"https://api.odds-api.io/v3/leagues?apiKey={API_KEY}&sport=football&all=true"
    
    print(f"📡 Requesting: {league_url}")
    try:
        response = requests.get(league_url, timeout=20)
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, list):
            print("❌ Error: API response is not a list.")
            return

        print(f"📊 API returned {len(data)} items. Starting de-duplication...")

        formatted_leagues = []
        seen_ids = set()

        for item in data:
            l_id = str(item.get('id'))
            
            # Skip duplicates or empty IDs to prevent Postgres Error 21000
            if not l_id or l_id in seen_ids:
                continue
            
            formatted_leagues.append({
                "league_id": l_id,
                "league_name": item.get('name', 'Unknown'),
                "country_name": item.get('country', 'International'),
                "is_active": True
            })
            seen_ids.add(l_id)

        if formatted_leagues:
            print(f"🧹 Unique leagues found: {len(formatted_leagues)}. Syncing to Supabase...")
            
            # Batching to ensure Supabase doesn't choke on a massive list
            batch_size = 100
            for i in range(0, len(formatted_leagues), batch_size):
                batch = formatted_leagues[i:i + batch_size]
                supabase.table("soccer_leagues").upsert(batch).execute()
                print(f"✅ Synced batch {i//batch_size + 1}")

            print("✨ Step 1 Complete: All leagues are now in 'soccer_leagues'.")
        else:
            print("⚠️ No leagues found to process.")

    except Exception as e:
        print(f"❌ Error during sync: {e}")

if __name__ == "__main__":
    # Calling the correctly named function
    sync_all_leagues()
