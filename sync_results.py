import os
import sys
import requests
from supabase import create_client, Client

# Configuration
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
API_KEY = "394691c0a855a9c21e847bd3600eb8059fc7c57dcfd181c225176ad85973c187"

if not url or not key:
    print("❌ ERROR: Credentials missing.")
    sys.exit(1)

supabase: Client = create_client(url, key)

def sync_all_leagues():
    league_url = f"https://api.odds-api.io/v3/leagues?apiKey={API_KEY}&sport=football&all=true"
    
    print(f"📡 Requesting: {league_url}")
    try:
        response = requests.get(league_url, timeout=20)
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, list):
            print("❌ Error: API response is not a list.")
            return

        print(f"📊 API returned {len(data)} items. Processing slugs...")

        formatted_leagues = []
        seen_slugs = set()

        for item in data:
            # We use 'slug' as the unique ID because it matches your API's output
            l_id = item.get('slug')
            l_name = item.get('name', 'Unknown')
            
            if not l_id or l_id in seen_slugs:
                continue
            
            # Extract country from name (e.g., "Brazil - Baiano" -> "Brazil")
            country = l_name.split(' - ')[0] if ' - ' in l_name else 'International'

            formatted_leagues.append({
                "league_id": l_id,
                "league_name": l_name,
                "country_name": country,
                "is_active": True
            })
            seen_slugs.add(l_id)

        if formatted_leagues:
            print(f"🧹 Unique leagues found: {len(formatted_leagues)}. Syncing...")
            
            batch_size = 100
            for i in range(0, len(formatted_leagues), batch_size):
                batch = formatted_leagues[i:i + batch_size]
                supabase.table("soccer_leagues").upsert(batch).execute()
                print(f"✅ Synced batch {i//batch_size + 1}")

            print(f"✨ Step 1 Complete: {len(formatted_leagues)} leagues mapped.")
        else:
            print("⚠️ No unique slugs found.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    sync_all_leagues()
