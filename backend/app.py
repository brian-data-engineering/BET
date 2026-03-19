from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import os

DB_URL = os.getenv("DATABASE_URL")
app = FastAPI()

# CRITICAL: Allow your Next.js frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your Vercel URL
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    # Use RealDictCursor to automatically get column names as keys
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

@app.get("/matches")
def list_matches():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT m.match_id, m.home_team, m.away_team, m.start_time, c.competition_name
        FROM matches m
        JOIN competitions c ON m.competition_id = c.competition_id
        WHERE m.start_time > NOW() - INTERVAL '2 hours'
        ORDER BY m.start_time ASC;
    """)
    rows = cur.fetchall()
    conn.close()
    return rows # RealDictCursor returns list of dicts automatically

@app.get("/matches/{match_id}/odds")
def match_odds(match_id: str): # Changed to str to match DB
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT mk.name as market_name, o.display, o.odd_value, o.odd_key
        FROM odds o
        JOIN markets mk ON o.match_id = mk.match_id AND o.sub_type_id = mk.sub_type_id
        WHERE o.match_id = %s;
    """, (match_id,))
    rows = cur.fetchall()
    conn.close()
    return rows
