from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
import os
import json

# 1. Database Configuration
DB_URL = os.getenv("DATABASE_URL")

# 2. Initialize Connection Pool
try:
    # Using Min 1, Max 10 connections
    postgreSQL_pool = psycopg2.pool.SimpleConnectionPool(1, 10, DB_URL)
except Exception as e:
    print(f"Error creating connection pool: {e}")

app = FastAPI()

# 3. CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_conn():
    return postgreSQL_pool.getconn()

def return_db_conn(conn):
    postgreSQL_pool.putconn(conn)

# --- ROUTES ---

@app.get("/matches")
def list_matches():
    conn = None
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # This query uses JSONB aggregation to attach odds to each match
        # It specifically looks for the '1X2' or 'Match Winner' market odds
        cur.execute("""
            SELECT 
                m.match_id, 
                m.home_team, 
                m.away_team, 
                m.start_time, 
                c.competition_name AS competition,
                CASE 
                    WHEN m.start_time::timestamp <= NOW() THEN 'live'
                    ELSE 'upcoming'
                END as status,
                -- Nested JSON array of odds
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'display', o.display,
                        'value', o.odd_value,
                        'odd_key', o.odd_key,
                        'market_name', mk.name
                    ))
                    FROM odds o
                    JOIN markets mk ON o.match_id = mk.match_id AND o.sub_type_id = mk.sub_type_id
                    WHERE o.match_id = m.match_id 
                    AND (mk.name = '1X2' OR mk.name = 'Match Winner' OR mk.sub_type_id = '1')
                    ), '[]'
                ) as odds
            FROM matches m
            JOIN competitions c ON m.competition_id = c.competition_id
            WHERE m.start_time::timestamp > NOW() - INTERVAL '6 hours'
              AND m.start_time::timestamp < NOW() + INTERVAL '48 hours'
            ORDER BY m.start_time::timestamp ASC;
        """)
        rows = cur.fetchall()
        cur.close()
        return rows
    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_conn(conn)

@app.get("/matches/{match_id}/odds")
def match_odds(match_id: str):
    conn = None
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                mk.name as market_name, 
                o.display, 
                o.odd_value as value, 
                o.odd_key
            FROM odds o
            JOIN markets mk ON o.match_id = mk.match_id AND o.sub_type_id = mk.sub_type_id
            WHERE o.match_id = %s;
        """, (match_id,))
        rows = cur.fetchall()
        cur.close()
        return rows
    except Exception as e:
        print(f"Error fetching odds: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch odds")
    finally:
        if conn:
            return_db_conn(conn)

@app.get("/health")
def health_check():
    return {"status": "healthy", "project": "Lucra", "pool_size": 10}
