import asyncio
import aiohttp
import os
from supabase import create_client
from datetime import datetime

# --- CONFIGURATION ---
# Ensure these environment variables are set in your terminal or .env file
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Limit concurrency to 5 to avoid 429 Rate Limits / IP Bans
sem = asyncio.Semaphore(5)

async def fetch_and_save_markets(session, match):
    """Fetches deep markets for a specific parent_match_id and saves to Supabase."""
    parent_id = match.get('parent_id')
    home = match.get('home_team', 'Unknown')
    away = match.get('away_team', 'Unknown')
    
    # Updated to use the correct parameter: parent_match_id
    url = f"https://api.betika.com/v1/uo/match?parent_match_id={parent_id}"
    
    async with sem:
        try:
            # Subtle jitter to mimic human behavior
            await asyncio.sleep(0.1) 
            
            async with session.get(url, timeout=15) as response:
                if response.status == 200:
                    json_res = await response.json()
                    # The 'data' key contains the list of all markets (Over/Under, BTTS, etc.)
                    markets_data = json_res.get('data', [])
                    
                    if not markets_data:
                        print(f"⚠️ No markets found for {home} vs {away} ({parent_id})")
                        return

                    # Upsert into api_event_details
                    # 'markets' is stored as a JSONB column for fast retrieval in Next.js
                    supabase.table("api_event_details").upsert({
                        "parent_id": parent_id,
                        "markets": markets_data,
                        "last_updated": datetime.now().isoformat()
                    }).execute()
                    
                    print(f"✅ Synced Deep Odds: {home} vs {away}")
                
                elif response.status == 429:
                    print(f"🚫 Rate Limited! Cooling down for 2s on {parent_id}...")
                    await asyncio.sleep(2)
                else:
                    print(f"❌ Failed {parent_id}: HTTP {response.status}")

        except Exception as e:
            print(f"🚨 Error on {home} vs {away}: {str(e)}")

async def main():
    print("⚽ Starting Deep Odds Sync for Football...")
    
    try:
        # 1. Fetch only soccer matches from your main table
        # We need the parent_id to hit the deep odds endpoint
        res = supabase.table("api_events") \
            .select("parent_id, home_team, away_team") \
            .eq("sport_key", "soccer") \
            .execute()
        
        matches = res.data
        if not matches:
            print("⚠️ No soccer matches found. Please run sync_events.py first.")
            return

        print(f"🚀 Found {len(matches)} matches. Starting parallel fetch...")

        # 2. Use a single ClientSession for all requests
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
        
        async with aiohttp.ClientSession(headers=headers) as session:
            tasks = [fetch_and_save_markets(session, m) for m in matches]
            # execute all tasks concurrently
            await asyncio.gather(*tasks)

        print(f"\n✨ Sync Complete. Your 'api_event_details' table is now updated.")

    except Exception as e:
        print(f"🚨 Critical failure in main loop: {e}")

if __name__ == "__main__":
    asyncio.run(main())
