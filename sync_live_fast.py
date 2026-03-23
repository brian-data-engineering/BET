import os
import requests
from datetime import datetime
from supabase import create_client

# 1. Setup - .strip() ensures no hidden spaces from GitHub Secrets
url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
supabase = create_client(url, key)

def sync_lucra_sports():
    # We are using the no-key discovery endpoint
    api_url = "https://api.odds-api.io/v3/sports"
    
    try:
        print("🛰️ Fetching sports categories...")
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        
        print(f"📦 Found {len(data)} sports. Syncing to api_sports_meta...")

        for sport in data:
            # MAPPING: API Keys -> Your Table Columns
            category_data = {
                "sport_key": sport['slug'],    # 'football', 'basketball', etc.
                "sport_title": sport['name'],  # 'Football', 'Basketball', etc.
                "is_active": True,
                "last_sync": datetime.utcnow().isoformat()
            }
            
            # Upsert into your specific table
            # We tell Supabase to look at 'sport_key' to decide if it's an update or new row
            supabase.table("api_sports_meta").upsert(category_data).execute()
            
        print("✅ api_sports_meta updated successfully.")

    except Exception as e:
        print(f"❌ Error during Supabase sync: {e}")

if __name__ == "__main__":
    sync_lucra_sports()
