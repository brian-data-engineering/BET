from fastapi import FastAPI
import psycopg2
import os

DB_URL = os.getenv("postgresql://lucra_data_user:vDaB83cpWXjV2PvQJkz2YygjODVWiX5R@dpg-d6s8ujkr85hc73eoi0og-a.oregon-postgres.render.com/lucra_data")  # set in Render environment variables
app = FastAPI()

def get_connection():
    return psycopg2.connect(DB_URL)

@app.get("/matches")
def list_matches():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT m.match_id, m.home_team, m.away_team, m.start_time, c.competition_name
        FROM matches m
        JOIN competitions c ON m.competition_id = c.competition_id
        ORDER BY m.start_time ASC;
    """)
    rows = cur.fetchall()
    conn.close()
    return [
        {"match_id": r[0], "home": r[1], "away": r[2], "start": r[3], "competition": r[4]}
        for r in rows
    ]

@app.get("/matches/{match_id}/odds")
def match_odds(match_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT mk.name, o.display, o.odd_value
        FROM odds o
        JOIN markets mk ON o.match_id = mk.match_id AND o.sub_type_id = mk.sub_type_id
        WHERE o.match_id = %s;
    """, (match_id,))
    rows = cur.fetchall()
    conn.close()
    return [
        {"market": r[0], "display": r[1], "value": float(r[2])}
        for r in rows
    ]
