import psycopg2
from psycopg2.extras import RealDictCursor
import json
from http.server import BaseHTTPRequestHandler

# Your Render Database URL
DB_URL = "postgresql://lucra_data_user:vDaB83cpWXjV2PvQJkz2YygjODVWiX5R@dpg-d6s8ujkr85hc73eoi0og-a.oregon-postgres.render.com/lucra_data"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        # This allows your Vercel frontend to talk to this API without security blocks
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            # Connect with a timeout to prevent hanging
            conn = psycopg2.connect(DB_URL, connect_timeout=5)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # REMOVED THE LIMIT: Fetch all matches so the frontend can sort them properly
            # We sort by date so the most relevant games appear first
            cur.execute("SELECT * FROM matches ORDER BY start_date ASC")
            
            data = cur.fetchall()
            cur.close()
            conn.close()
            
            # default=str handles date objects that JSON usually can't read
            self.wfile.write(json.dumps(data, default=str).encode())
            
        except Exception as e:
            # If the database fails, send the error message so we can debug
            error_response = {"error": str(e), "status": "failed"}
            self.wfile.write(json.dumps(error_response).encode())
        return
