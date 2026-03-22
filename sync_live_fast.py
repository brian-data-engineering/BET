import os
import json
import requests
from upstash_redis import Redis

# 1. Connect to Upstash (GitHub will provide these via Secrets)
redis = Redis(
    url=os.environ.get("UPSTASH_REDIS_REST_URL"), 
    token=os.environ.get("UPSTASH_REDIS_REST_TOKEN")
)

LIVE_URL = "https://live.betika.com/v1/uo/matches?page=1&limit=1000"

def sync_live():
    print("📡 Fetching Live Data...")
    try:
        resp = requests.get(LIVE_URL, timeout=10)
        data = resp.json().get("data", [])
        
        live_blob = []
        for m in data:
            # Only keep what we need for the UI to be fast
            match_data = {
                "id": m.get("parent_match_id"),
                "home": m.get("home_team"),
                "away": m.get("away_team"),
                "score": m.get("current_score", "0:0"),
                "time": m.get("match_time"),
                "status": m.get("event_status"),
                "active": m.get("market_active"), # 0 means the match is "Locked"
                "odds": {}
            }

            # Find the 1X2 odds (sub_type_id 1)
            for market in m.get("odds", []):
                if str(market.get("sub_type_id")) == "1":
                    for o in market.get("odds", []):
                        match_data["odds"][o.get("display")] = o.get("odd_value")

            live_blob.append(match_data)

        # 🚀 THE MAGIC: Push the entire list to Redis as ONE KEY
        # 'ex=120' means if the scraper stops, data deletes in 2 mins (no stale scores)
        redis.set("lucra:live_matches", json.dumps(live_blob), ex=120)
        print(f"✅ Success! Sent {len(live_blob)} live matches to Upstash.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    sync_live()
