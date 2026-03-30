import os
import requests
from supabase import create_client, Client

# Config
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
API_KEY = "394691c0a855a9c21e847bd3600eb8059fc7c57dcfd181c225176ad85973c187"
supabase: Client = create_client(url, key)

def sync_leagues_v3():
    # Using your EXACT working URL
    league_url = f"https://api.odds-api.io/v3/leagues?apiKey={API_KEY}&sport=football&all=true"
    
    print(f"📡 Requesting: {league_url}")
    response = requests.get(league_url)
    data = response.json()

    # The v3 /leagues response is usually a direct list of objects
    if not isinstance(data, list):
        print("❌ Unexpected API format. Expected a list.")
        return

    print(f"📊 API returned {len(data)} items.")

    formatted_leagues = []
    seen_ids = set()

    for item in data:
        l_id = str(item.get('id'))
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
        print(f"🧹 After de-duplication: {len(formatted_leagues)} unique leagues.")
        
        # Batching the upsert to prevent timeout or memory issues
        batch_size = 100
        for i in range(0, len(formatted_leagues), batch_size):
            batch = formatted_leagues[i:i + batch_size]
            try:
                supabase.table("soccer_leagues").upsert(batch).execute()
                print(f"✅ Synced batch {i//batch_size + 1}")
            except Exception as e:
                print(f"❌ Batch Error: {e}")
                
        print("✨ All leagues synced to soccer_leagues table.")
    else:
        print("⚠️ No leagues were processed.")

if __name__ == "__main__":
    sync_soccer_results()
