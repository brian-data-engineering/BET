import os
import requests
from supabase import create_client

# 1. Setup Connection - .strip() cleans hidden spaces from GitHub Secrets
url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
api_key = os.environ.get("ODDS_API_KEY", "").strip()

# --- SAFETY CHECK ---
if not url.startswith("https"):
    print(f"CRITICAL ERROR: SUPABASE_URL is invalid. Check your Secrets.")
    exit(1)

supabase = create_client(url, key)

def sync_lucra_odds():
    # Testing with the /v3/sports endpoint to verify the API Key
    api_url = "https://api.the-odds-api.com/v3/sports"
    params = {'apiKey': api_key}
    
    try:
        response = requests.get(api_url, params=params)
        
        if response.status_code == 401:
            print(f"❌ 401 Unauthorized: The API key in your Secrets is not working.")
            return

        response.raise_for_status()
        data = response.json()
        
        # 'data' in v3 is a dictionary containing a list under the key 'data'
        sports_list = data.get('data', [])
        print(f"✅ Success! Connection verified. Found {len(sports_list)} sports.")
        
    except Exception as e:
        print(f"❌ Error during sync: {e}")

if __name__ == "__main__":
    sync_lucra_odds()
