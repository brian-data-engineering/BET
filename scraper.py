import psycopg2
import requests
import os
import sys
from datetime import datetime, timedelta

# Configuration
DB_URL = os.getenv("DATABASE_URL")
SPORTS = {"14": "Soccer", "30": "Basketball", "28": "Tennis", "41": "Rugby", "29": "Hockey", "37": "Cricket"}
BASE_URL = "https://api.betika.com/v1/uo"

if not DB_URL:
    print("❌ ERROR: DATABASE_URL not found.")
    sys.exit(1)

def sync_lucra_fast():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
    })
    
    now = datetime.now()
    # Keep matches for 3 hours after start time to avoid empty DB during live games
    cleanup_time = now - timedelta(hours=3)

    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # 1. Quick Cleanup of old matches
        cur.execute("DELETE FROM matches WHERE start_time < %s", (cleanup_time,))
        conn.commit()
        
        for s_id, s_name in SPORTS.items():
            print(f"📡 Fast Sync: {s_name}...")
            
            # Ensure Sport exists
            cur.execute("INSERT INTO sports (sport_id, sport_name) VALUES (%s, %s) ON CONFLICT (sport_id) DO NOTHING", (s_id, s_name))

            try:
                resp = session.get(f"{BASE_URL}/matches?limit=500&sport_id={s_id}", timeout=20)
                data = resp.json().get("data", [])
                matches = data if isinstance(data, list) else []

                for match in matches:
                    # Use the correct Parent ID for future deep diving
                    m_id = str(match.get("parent_match_id") or match.get("match_id"))
                    g_id = str(match.get("game_id"))
                    c_id = str(match.get("competition_id"))
                    
                    # 2. FIX: Insert Competition FIRST (Prevents Foreign Key Error)
                    cur.execute("""
                        INSERT INTO competitions (competition_id, competition_name, category, sport_id)
                        VALUES (%s, %s, %s, %s) ON CONFLICT (competition_id) 
                        DO UPDATE SET competition_name=EXCLUDED.competition_name
                    """, (c_id, match.get("competition_name"), match.get("category"), s_id))

                    # 3. Insert Match
                    cur.execute("""
                        INSERT INTO matches (match_id, game_id, competition_id, home_team, away_team, start_time)
                        VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (match_id) 
                        DO UPDATE SET start_time=EXCLUDED.start_time, updated_at=NOW()
                    """, (m_id, g_id, c_id, match.get("home_team"), match.get("away_team"), match.get("start_time")))

                    # 4. Sync Main 1X2 Odds
                    odds_list = match.get("odds", [])
                    for market in odds_list:
                        sub_id = str(market.get("sub_type_id")) 
                        
                        cur.execute("""
                            INSERT INTO markets (match_id, sub_type_id, name)
                            VALUES (%s, %s, %s) ON CONFLICT (match_id, sub_type_id) 
                            DO UPDATE SET name=EXCLUDED.name
                        """, (m_id, sub_id, market.get("name")))

                        for outcome in market.get("odds", []):
                            cur.execute("""
                                INSERT INTO odds (match_id, sub_type_id, display, odd_key, odd_value)
                                VALUES (%s, %s, %s, %s, %s) ON CONFLICT (match_id, sub_type_id, odd_key)
                                DO UPDATE SET odd_value=EXCLUDED.odd_value
                            """, (m_id, sub_id, outcome.get("display"), str(outcome.get("odd_key")), float(outcome.get("odd_value") or 0)))
                
                conn.commit()
                print(f"✅ {s_name} synced successfully.")

            except Exception as sport_err:
                print(f"⚠️ Error in {s_name} loop: {sport_err}")
                conn.rollback()
                continue

        cur.close()
        conn.close()
        print(f"✨ Global Sync Finished at {datetime.now().strftime('%H:%M:%S')}")

    except Exception as e:
        print(f"❌ Critical Error: {e}")

if __name__ == "__main__":
    sync_lucra_fast()
