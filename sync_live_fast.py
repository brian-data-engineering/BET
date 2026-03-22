import os
import json
import requests
from upstash_redis import Redis

# 1. Connect using REST mode
redis = Redis(
    url=os.environ.get("UPSTASH_REDIS_REST_URL"), 
    token=os.environ.get("UPSTASH_REDIS_REST_TOKEN"),
    rest_encoding="utf-8"
)

LIVE_URL = "https://live.betika.com/v1/uo/matches?page=1&limit=1000"

def sync_live():
    print("📡 Fetching Live Data from Betika (with optimized headers)...")
    
    # 🕵️ Fake a real browser to prevent Betika from throttling the GitHub IP
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.betika.com/en-ke/live",
        "Origin": "https://www.betika.com"
    }

    try:
        # ⏱️ (Connect Timeout, Read Timeout) 
        # We give it 15s to connect and a massive 120s to finish reading the data
        session = requests.Session()
        resp = session.get(LIVE_URL, headers=headers, timeout=(15, 120))
        resp.raise_for_status() 
        
        raw_data = resp.json()
        data = raw_data.get("data", [])
        
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
                if str(market.get("sub_type_id")) == "1":
                    for o in market.get("odds", []):
                        match_data["odds"][o.get("display")] = o.get("odd_value")

            live_blob.append(match_data)

        if not live_blob:
            print("⚠️ API connected but returned 0 matches. Is the live schedule empty?")
            # We still push an empty list to clear old scores
            redis.set("lucra:live_matches", json.dumps([]), ex=3600)
            return

        # 🚀 PUSH TO UPSTASH (1 hour expiry for testing)
        success = redis.set("lucra:live_matches", json.dumps(live_blob), ex=3600)
        
        if success:
            print(f"✅ Success! Sent {len(live_blob)} live matches to Upstash.")
        else:
            print("❌ Redis SET command failed.")

    except requests.exceptions.Timeout:
        print("❌ Timeout Error: Betika is taking too long to respond to GitHub.")
    except Exception as e:
        print(f"❌ Critical Error: {e}")

if __name__ == "__main__":
    sync_live()
