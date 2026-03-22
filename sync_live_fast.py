import os
import json
import requests
from upstash_redis import Redis

# 1. Connect using REST mode for better compatibility with GitHub Actions
# We use the REST-based SDK to ensure the firewall doesn't block standard Redis ports
redis = Redis(
    url=os.environ.get("UPSTASH_REDIS_REST_URL"), 
    token=os.environ.get("UPSTASH_REDIS_REST_TOKEN"),
    rest_encoding="utf-8"
)

LIVE_URL = "https://live.betika.com/v1/uo/matches?page=1&limit=1000"

def sync_live():
    print("📡 Fetching Live Data from Betika...")
    try:
        # ⏱️ Increased timeout to 60 seconds to avoid 'Read timed out' errors
        resp = requests.get(LIVE_URL, timeout=60)
        resp.raise_for_status() # This will catch 404/500 errors
        
        data = resp.json().get("data", [])
        
        live_blob = []
        for m in data:
            match_data = {
                "id": m.get("parent_match_id") or m.get("match_id"),
                "home": m.get("home_team"),
                "away": m.get("away_team"),
                "score": m.get("current_score", "0:0"),
                "time": m.get("match_time"),
                "status": m.get("event_status"),
                "active": m.get("market_active"), 
                "odds": {}
            }

            for market in m.get("odds", []):
                # Ensure we only grab the 1X2 market
                if str(market.get("sub_type_id")) == "1":
                    for o in market.get("odds", []):
                        match_data["odds"][o.get("display")] = o.get("odd_value")

            live_blob.append(match_data)

        if not live_blob:
            print("⚠️ API returned success but 0 matches were found.")
            return

        # 🚀 PUSH TO UPSTASH
        # Changed expiry to 3600 (1 hour) so you can actually verify it in the browser
        # json.dumps ensures the list is stored as a string correctly
        success = redis.set("lucra:live_matches", json.dumps(live_blob), ex=3600)
        
        if success:
            print(f"✅ Success! Sent {len(live_blob)} live matches to Upstash.")
        else:
            print("❌ Redis reported failure during SET command.")

    except Exception as e:
        print(f"❌ Critical Error in sync_live: {e}")

if __name__ == "__main__":
    sync_live()
