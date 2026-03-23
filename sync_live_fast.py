import os
import requests
from supabase import create_client

# 1. Setup - These are still needed to talk to YOUR database
url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Initialize Supabase
supabase = create_client(url, key)

def sync_lucra_sports():
    # This specific endpoint is for discovering available sports
    # It is a great way to test the connection step-by-step
    api_url = "https://api.odds-api.io/v3/sports"
    
    try:
        print("🛰️ Connecting to Odds API (Discovery Mode)...")
        response = requests.get(api_url)
        
        # If this works, we get a list of sports. No key needed for discovery!
        response.raise_for_status()
        data = response.json()
        
        print(f"📦 Received {len(data)} sports categories.")

        for sport in data:
            # We sync these to your api_events or a new 'sports_list' table
            # For now, let's just print them to confirm it works
            print(f"🔹 Found: {sport['name']} ({sport['slug']})")
            
        print("✅ Lucra Discovery Sync Complete.")

    except Exception as e:
        # If this still says 401, it means this specific provider 
        # changed their rules, but usually, /v3/sports is open.
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    sync_lucra_sports()
