import psycopg2
from psycopg2.extras import RealDictCursor
import json
from http.server import BaseHTTPRequestHandler

DB_URL = "postgresql://lucra_data_user:vDaB83cpWXjV2PvQJkz2YygjODVWiX5R@dpg-d6s8ujkr85hc73eoi0og-a.oregon-postgres.render.com/lucra_data"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT * FROM matches ORDER BY start_date ASC LIMIT 50")
            data = cur.fetchall()
            cur.close()
            conn.close()
            self.wfile.write(json.dumps(data, default=str).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())
        return
