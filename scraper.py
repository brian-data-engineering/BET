import psycopg2
import requests
import os
import sys
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configuration
DB_URL = os.getenv("DATABASE_URL")
MATCHES_URL = "https://api.betika.com/v1/uo/matches?limit=1000&sport_id=14"

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

def sync_lucra():
    session = get_session()
    try:
        print(f"📡 [{datetime.now().strftime('%H:%M:%S')}] Connecting to Lucra Engine...")
        resp = session.get(MATCHES_URL, timeout=30)
        resp.raise_for_status()
        
        json_data = resp.json().get("data", [])
        if not json_data:
            print("⚠️ No match data found.")
            return

        print(f"✅ Received {len(json_data)} matches. Syncing to Supabase...")

        # Using a context manager for the connection
        with psycopg2.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                for match in json_data:
                    try:
                        m_id = str(match.get("match_id"))
                        s_id = str(match.get("sport_id"))
                        c_id = str(match.get("competition_id"))

                        # 1. Sports
                        cur.execute("""
                            INSERT INTO sports (sport_id, sport_name) 
                            VALUES (%s, %s) ON CONFLICT (sport_id) 
                            DO UPDATE SET sport_name=EXCLUDED.sport_name
                        """, (s_id, match.get("sport_name")))

                        # 2. Competitions
                        cur.execute("""
                            INSERT INTO competitions (competition_id, competition_name, category, sport_id)
                            VALUES (%s, %s, %s, %s) ON CONFLICT (competition_id) 
                            DO UPDATE SET competition_name=EXCLUDED.competition_name
                        """, (c_id, match.get("competition_name"), match.get("category"), s_id))

                        # 3. Matches
                        cur.execute("""
                            INSERT INTO matches (match_id, game_id, competition_id, home_team, away_team, start_time)
                            VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (match_id) 
                            DO UPDATE SET home_team=EXCLUDED.home_team, away_team=EXCLUDED.away_team, 
                                          start_time=EXCLUDED.start_time, updated_at=NOW()
                        """, (m_id, str(match.get("game_id")), c_id, match.get("home_team"), match.get("away_team"), match.get("start_time")))

                        # 4. Markets & Odds
                        for market in match.get("odds", []):
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
                                """, (m_id, sub_id, outcome.get("display"), str(outcome.get("odd_key")), 
                                      float(outcome.get("odd_value") or 0)))

                    except Exception as match_err:
                        print(f"   ⚠️ Match {match.get('match_id')} skipped: {match_err}")
                        continue
                
                # Commit all at once for speed
                conn.commit()
                
        print(f"✨ [{datetime.now().strftime('%H:%M:%S')}] Lucra Data Sync Complete.")

    except Exception as e:
        print(f"❌ Critical Scraper Error: {e}")

if __name__ == "__main__":
    sync_lucra()
