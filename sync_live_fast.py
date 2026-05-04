import os
import requests
from datetime import datetime
from supabase import create_client

# 1. Setup
url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
supabase = create_client(url, key)

def sync_lucra_sports():
    api_url = "https://api.odds-api.io/v3/sports"
    
    try:
        print("🛰️ Fetching sports categories...")
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        
        print(f"📦 Found {len(data)} sports. Syncing to api_sports_meta...")

        for sport in data:
            category_data = {
                "sport_key": sport['slug'],
                "sport_title": sport['name'],
                "is_active": True,
                "last_sync": datetime.utcnow().isoformat()
            }
            
            # FIX: Explicitly use on_conflict to prevent duplicate key errors
            supabase.table("api_sports_meta").upsert(
                category_data, 
                on_conflict="sport_key"
            ).execute()
            
        print("✅ api_sports_meta updated successfully.")

    except Exception as e:
        print(f"❌ Error during Supabase sync: {e}")

if __name__ == "__main__":
    sync_lucra_sports()
