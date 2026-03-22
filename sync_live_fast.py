import os
import json
import requests
import time
from upstash_redis import Redis

redis = Redis(
    url=os.environ.get("UPSTASH_REDIS_REST_URL"), 
    token=os.environ.get("UPSTASH_REDIS_REST_TOKEN"),
    rest_encoding="utf-8"
)

# Reduced limit to 100 (more stable) and added more browser-like headers
LIVE_URL = "https://live.betika.com/v1/uo/matches?page=1&limit=100"

def sync_live():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.betika.com/en-ke/live",
        "Accept-Language": "en-US,en;q=0.9",
    }

    print("📡 Attempting to fetch Live Data...")
    
    # Retry loop: Try 3 times before giving up
    for attempt in range(3):
        try:
            resp = requests.get(LIVE_URL, headers=headers, timeout=(10, 60))
            
            if resp.status_code == 502:
                print(f"⚠️ Attempt {attempt+1}: 502 Bad Gateway. Betika is busy, retrying in 5s...")
                time.sleep(5)
                continue
                
            resp.raise_for_status()
            data = resp.json().get("data", [])
            
            live_blob = []
            for m in data:
                live_blob.append({
                    "id": m.get("parent_match_id") or m.get("match_id"),
                    "home": m.get("home_team"),
                    "away": m.get("away_team"),
                    "score": m.get("current_score", "0:0"),
                    "time": m.get("match_time"),
                    "status": m.get("event_status"),
                    "active": m.get("market_active"), 
                    "odds": {o.get("display"): o.get("odd_value") for market in m.get("odds", []) if str(market.get("sub_type_id")) == "1" for o in market.get("odds", [])}
                })

            # PUSH TO REDIS (1 hour expiry for testing)
            redis.set("lucra:live_matches", json.dumps(live_blob), ex=3600)
            print(f"✅ Success! Sent {len(live_blob)} live matches to Upstash.")
            return # Exit function on success

        except Exception as e:
            print(f"❌ Attempt {attempt+1} failed: {e}")
            time.sleep(5)

    print("🚫 All 3 attempts failed. Betika is currently blocking or down.")

if __name__ == "__main__":
    sync_live()
