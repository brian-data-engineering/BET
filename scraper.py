import psycopg2
import requests
import os
import sys
from datetime import datetime, timedelta

# Configuration
DB_URL = os.getenv("DATABASE_URL")
SPORTS = {"14": "Soccer", "30": "Basketball", "28": "Tennis", "41": "Rugby", "29": "Hockey", "37": "Cricket"}
BASE_URL = "https://api.betika.com/v1/uo"

def sync_lucra_fast():
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    
    now = datetime.now()
    cleanup_time = now - timedelta(hours=3)

    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # 1. Quick Cleanup
        cur.execute("DELETE FROM matches WHERE start_time < %s", (cleanup_time,))
        conn.commit()
        
        for s_id, s_name in SPORTS.items():
            print(f"📡 Fast Sync: {s_name}...")
            resp = session.get(f"{BASE_URL}/matches?limit=500&sport_id={s_id}", timeout=20)
            matches = resp.json().get("data", [])

            for match in matches:
                m_id = str(match.get("parent_match_id") or match.get("match_id"))
                g_id = str(match.get("game_id"))
                c_id = str(match.get("competition_id"))
                
                # Insert Match
                cur.execute("""
                    INSERT INTO matches (match_id, game_id, competition_id, home_team, away_team, start_time)
                    VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (match_id) 
                    DO UPDATE SET start_time=EXCLUDED.start_time, updated_at=NOW()
                """, (m_id, g_id, c_id, match.get("home_team"), match.get("away_team"), match.get("start_time")))

                # Sync Main 1X2 Odds (Available in the initial list)
                odds_list = match.get("odds", [])
                for market in odds_list:
                    sub_id = str(market.get("sub_type_id")) # Usually '1' for 1X2
                    
                    # Insert Market Name
                    cur.execute("""
                        INSERT INTO markets (match_id, sub_type_id, name)
                        VALUES (%s, %s, %s) ON CONFLICT (match_id, sub_type_id) DO NOTHING
                    """, (m_id, sub_id, market.get("name")))

                    # Insert the 3 outcomes (Home, Draw, Away)
                    for outcome in market.get("odds", []):
                        cur.execute("""
                            INSERT INTO odds (match_id, sub_type_id, display, odd_key, odd_value)
                            VALUES (%s, %s, %s, %s, %s) ON CONFLICT (match_id, sub_type_id, odd_key)
                            DO UPDATE SET odd_value=EXCLUDED.odd_value
                        """, (m_id, sub_id, outcome.get("display"), str(outcome.get("odd_key")), float(outcome.get("odd_value") or 0)))
            
            conn.commit() # Commit once per sport for speed
            print(f"✅ {s_name} complete.")

        cur.close()
        conn.close()
        print(f"✨ Sync Finished at {datetime.now().strftime('%H:%M:%S')}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    sync_lucra_fast()
