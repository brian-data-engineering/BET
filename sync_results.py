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

def sync_leagues():
    league_url = f"https://api.odds-api.io/v3/leagues?apiKey={API_KEY}&sport=football&all=true"
    
    print("📡 Fetching all global football leagues...")
    try:
        response = requests.get(league_url, timeout=15)
        response.raise_for_status()
        leagues_data = response.json()

        formatted_leagues = []
        seen_ids = set() # To prevent the '21000' Duplicate Row error

        for l in leagues_data:
            l_id = str(l.get('id'))
            
            # Skip if we've already added this ID in this batch
            if l_id in seen_ids or not l_id:
                continue
            
            formatted_leagues.append({
                "league_id": l_id,
                "league_name": l.get('name'),
                "country_name": l.get('country', 'International'),
                "last_synced": "now()"
            })
            seen_ids.add(l_id)

        if formatted_leagues:
            print(f"🧹 De-duplicated to {len(formatted_leagues)} unique leagues.")
            # Upsert into soccer_leagues
            supabase.table("soccer_leagues").upsert(formatted_leagues).execute()
            print(f"✅ Successfully mapped {len(formatted_leagues)} leagues to Lucra.")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    sync_leagues()
