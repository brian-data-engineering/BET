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
    try:
        url = f"{BASE_URL}/match?parent_match_id={parent_id}"
        resp = session.get(url, timeout=15)
        data = resp.json().get("data")
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"      ⚠️ Fetch failed for {parent_id}: {e}")
        return []

def sync_lucra():
    session = get_session()
    now = datetime.now()
    six_hours_from_now = now + timedelta(hours=6)
    
    # FIX 1: Extended cleanup window so games don't vanish right at kickoff
    cleanup_time = now - timedelta(hours=3)

    try:
        # Use autocommit=True or manual commits inside the loop to see live updates
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print(f"🧹 Cleaning up old matches (Started before {cleanup_time})...")
        cur.execute("DELETE FROM matches WHERE start_time < %s", (cleanup_time,))
        conn.commit()
        
        for s_id, s_name in SPORTS.items():
            print(f"📡 Syncing {s_name} (ID: {s_id})...")
            cur.execute("INSERT INTO sports (sport_id, sport_name) VALUES (%s, %s) ON CONFLICT (sport_id) DO NOTHING", (s_id, s_name))
            conn.commit()

            try:
                resp = session.get(f"{BASE_URL}/matches?limit=500&sport_id={s_id}", timeout=30)
                matches_data = resp.json().get("data")
                matches = matches_data if isinstance(matches_data, list) else []
                
                if not matches:
                    continue

                for match in matches:
                    # FIX 2: Correct ID Mapping from your JSON
                    m_id = str(match.get("parent_match_id") or match.get("match_id"))
                    g_id = str(match.get("game_id"))
                    c_id = str(match.get("competition_id"))
                    start_time_str = match.get("start_time")
                    
                    try:
                        # Competition Sync
                        cur.execute("""
                            INSERT INTO competitions (competition_id, competition_name, category, sport_id)
                            VALUES (%s, %s, %s, %s) ON CONFLICT (competition_id) 
                            DO UPDATE SET competition_name=EXCLUDED.competition_name
                        """, (c_id, match.get("competition_name"), match.get("category"), s_id))

                        # Match Sync
                        cur.execute("""
                            INSERT INTO matches (match_id, game_id, competition_id, home_team, away_team, start_time)
                            VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (match_id) 
                            DO UPDATE SET start_time=EXCLUDED.start_time, updated_at=NOW()
                        """, (m_id, g_id, c_id, match.get("home_team"), match.get("away_team"), start_time_str))

                        # DEEP DIVE Logic
                        start_time_dt = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
                        if start_time_dt <= six_hours_from_now:
                            print(f"    🔍 Deep Dive: {match.get('home_team')} vs {match.get('away_team')} ({m_id})")
                            deep_markets = fetch_deep_markets(session, m_id)
                            
                            for market in deep_markets:
                                if not market or not isinstance(market, dict): continue
                                sub_id = str(market.get("sub_type_id"))
                                
                                cur.execute("""
                                    INSERT INTO markets (match_id, sub_type_id, name)
                                    VALUES (%s, %s, %s) ON CONFLICT (match_id, sub_type_id) 
                                    DO UPDATE SET name=EXCLUDED.name
                                """, (m_id, sub_id, market.get("name")))

                                outcomes = market.get("odds")
                                if isinstance(outcomes, list):
                                    for outcome in outcomes:
                                        cur.execute("""
                                            INSERT INTO odds (match_id, sub_type_id, display, odd_key, odd_value)
                                            VALUES (%s, %s, %s, %s, %s) ON CONFLICT (match_id, sub_type_id, odd_key)
                                            DO UPDATE SET odd_value=EXCLUDED.odd_value
                                        """, (m_id, sub_id, outcome.get("display"), str(outcome.get("odd_key")), float(outcome.get("odd_value") or 0)))
                            
                            time.sleep(0.2) # Adjusted for speed

                        # FIX 3: COMMIT AFTER EVERY MATCH
                        # This ensures that if the script is running, you see data in Supabase IMMEDIATELY.
                        conn.commit()

                    except Exception as match_err:
                        print(f"      ❌ Skipping match {m_id} due to error: {match_err}")
                        conn.rollback()
                        continue

            except Exception as sport_err:
                print(f"    ❌ Error in {s_name} loop: {sport_err}")
                continue

        cur.close()
        conn.close()
        print(f"✨ [{datetime.now().strftime('%H:%M:%S')}] Lucra Global Sync Complete.")

    except Exception as e:
        print(f"❌ Critical System Error: {e}")

if __name__ == "__main__":
    sync_lucra()
