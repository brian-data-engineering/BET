import psycopg2
import requests
import os
import sys
import time
from datetime import datetime, timedelta
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configuration
DB_URL = os.getenv("DATABASE_URL")
SPORTS = {"14": "Soccer", "30": "Basketball", "28": "Tennis", "41": "Rugby", "29": "Hockey", "37": "Cricket"}
BASE_URL = "https://api.betika.com/v1/uo"

if not DB_URL:
    print("❌ ERROR: DATABASE_URL not found.")
    sys.exit(1)

def get_session():
    session = requests.Session()
    retries = Retry(total=5, backoff_factor=1, status_forcelist=[502, 503, 504])
    session.mount('https://', HTTPAdapter(max_retries=retries))
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
    })
    return session

def fetch_deep_markets(session, parent_id):
    """Fetches all markets for a specific match."""
    try:
        url = f"{BASE_URL}/match?parent_match_id={parent_id}"
        resp = session.get(url, timeout=10)
        return resp.json().get("data", [])
    except:
        return []

def sync_lucra():
    session = get_session()
    now = datetime.now()
    six_hours_from_now = now + timedelta(hours=6)
    one_minute_ago = now - timedelta(minutes=1)

    try:
        with psycopg2.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                # --- STEP 1: AUTO-DELETE EXPIRED GAMES ---
                # Removes games 1 minute after they start to keep the feed fresh
                print(f"🧹 Cleaning up started matches (Start Time < {one_minute_ago})...")
                cur.execute("DELETE FROM matches WHERE start_time < %s", (one_minute_ago,))
                
                for s_id, s_name in SPORTS.items():
                    print(f"📡 Syncing {s_name}...")
                    resp = session.get(f"{BASE_URL}/matches?limit=500&sport_id={s_id}", timeout=30)
                    matches = resp.json().get("data", [])

                    for match in matches:
                        try:
                            m_id = str(match.get("match_id"))
                            start_time_str = match.get("start_time")
                            start_time_dt = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')

                            # 1. Basic Match Sync
                            cur.execute("""
                                INSERT INTO matches (match_id, game_id, competition_id, home_team, away_team, start_time)
                                VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (match_id) 
                                DO UPDATE SET start_time=EXCLUDED.start_time, updated_at=NOW()
                            """, (m_id, str(match.get("game_id")), str(match.get("competition_id")), match.get("home_team"), match.get("away_team"), start_time_str))

                            # 2. DEEP DIVE: Only for games starting in the next 6 hours
                            if start_time_dt <= six_hours_from_now:
                                print(f"   🔍 Deep Dive: {match.get('home_team')} vs {match.get('away_team')}")
                                deep_markets = fetch_deep_markets(session, m_id)
                                
                                for market in deep_markets:
                                    sub_id = str(market.get("sub_type_id"))
                                    cur.execute("""
                                        INSERT INTO markets (match_id, sub_type_id, name)
                                        VALUES (%s, %s, %s) ON CONFLICT (match_id, sub_type_id) DO UPDATE SET name=EXCLUDED.name
                                    """, (m_id, sub_id, market.get("name")))

                                    for outcome in market.get("odds", []):
                                        cur.execute("""
                                            INSERT INTO odds (match_id, sub_type_id, display, odd_key, odd_value)
                                            VALUES (%s, %s, %s, %s, %s) ON CONFLICT (match_id, sub_type_id, odd_key)
                                            DO UPDATE SET odd_value=EXCLUDED.odd_value
                                        """, (m_id, sub_id, outcome.get("display"), str(outcome.get("odd_key")), float(outcome.get("odd_value") or 0)))
                                
                                # Respectful delay to avoid IP blocking
                                time.sleep(0.5)

                        except Exception as e:
                            continue 
                
                conn.commit()
        print(f"✨ [{datetime.now().strftime('%H:%M:%S')}] Lucra Sync & Clean Complete.")

    except Exception as e:
        print(f"❌ Critical Error: {e}")

if __name__ == "__main__":
    sync_lucra()
