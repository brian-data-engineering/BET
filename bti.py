import asyncio
import aiohttp
import os
from supabase import create_client
from datetime import datetime

# --- CONFIGURATION ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Semaphore to prevent hitting Betika's rate limit too hard
sem = asyncio.Semaphore(5)

async def fetch_and_save_markets(session, match):
    """Fetches deep markets for specific parent_id and updates Lucra's details table."""
    parent_id = match.get('parent_id')
    home = match.get('home_team', 'Unknown')
    away = match.get('away_team', 'Unknown')
    sport = match.get('sport_key', 'Unknown')
    
    url = f"https://api.betika.com/v1/uo/match?parent_match_id={parent_id}"
    
    async with sem:
        try:
            # Jitter to avoid bot detection
            await asyncio.sleep(0.1) 
            
            async with session.get(url, timeout=15) as response:
                if response.status == 200:
                    json_res = await response.json()
                    markets_data = json_res.get('data', [])
                    
                    if not markets_data:
                        print(f"⚠️ No markets for [{sport}] {home} vs {away}")
                        return

                    # Upsert to your details table
                    supabase.table("api_event_details").upsert({
                        "parent_id": parent_id,
                        "markets": markets_data,
                        "last_updated": datetime.now().isoformat()
                    }).execute()
                    
                    print(f"✅ Synced {sport.upper()}: {home} vs {away}")
                
                elif response.status == 429:
                    print(f"🚫 429 Rate Limit! Cooling down for 3s...")
                    await asyncio.sleep(3)
                else:
                    print(f"❌ HTTP {response.status} for {parent_id}")

        except Exception as e:
            print(f"🚨 Error on {home} vs {away}: {str(e)}")

async def main():
    # Define the target sports for Lucra
    target_sports = ["basketball", "tennis", "table-tennis", "ice-hockey"]
    
    print(f"🏀🎾 Starting Multi-Sport Sync for: {', '.join(target_sports)}...")
    
    try:
        # 1. Fetch matches for all specified sports at once
        res = supabase.table("api_events") \
            .select("parent_id, home_team, away_team, sport_key") \
            .in_("sport_key", target_sports) \
            .execute()
        
        matches = res.data
        if not matches:
            print("⚠️ No matches found for these sports. Run your primary scraper first.")
            return

        print(f"🚀 Found {len(matches)} matches total. Starting deep fetch...")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
        
        async with aiohttp.ClientSession(headers=headers) as session:
            tasks = [fetch_and_save_markets(session, m) for m in matches]
            await asyncio.gather(*tasks)

        print(f"\n✨ Lucra Multi-Sport Sync Complete.")

    except Exception as e:
        print(f"🚨 Critical failure: {e}")

if __name__ == "__main__":
    asyncio.run(main())
