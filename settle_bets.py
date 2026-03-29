import os
from supabase import create_client, Client
from rapidfuzz import process, fuzz
from datetime import datetime, timedelta

# --- SETUP ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class SettlementEngine:
    def __init__(self, confidence_threshold=88):
        self.threshold = confidence_threshold

    def normalize(self, text):
        if not text: return ""
        stops = ['fk', 'fc', 'utd', 'united', 'city', 'town', 'afc', 'sc', 'vs', 'youth']
        text = text.lower().replace('.', '').replace('-', ' ').replace('/', ' ')
        return " ".join([w for w in text.split() if w not in stops]).strip()

    def validate_bet(self, market, selection, h_score, a_score):
        if h_score is None or a_score is None:
            return None
        
        h, a = int(h_score), int(a_score)
        sel = str(selection).strip().capitalize() # Handle "Home", "Away", "Draw"

        if "1X2" in market:
            if sel == "Home": return h > a
            if sel == "Away": return a > h
            if sel == "Draw": return h == a
        
        # Add more markets here if needed (Over/Under, GG, etc.)
        return False

    def run(self):
        print(f"🚀 ENGINE START: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        tickets = supabase.table("betsnow").select("*").eq("status", "pending").execute().data
        cutoff = (datetime.now() - timedelta(hours=72)).isoformat()
        results = supabase.table("results").select("*").gt("match_date", cutoff).execute().data

        if not results:
            print("⚠️ No recent results found.")
            return

        # Pre-process results names
        result_pool = [f"{self.normalize(r['home_name'])} vs {self.normalize(r['away_name'])}" for r in results]

        for ticket in tickets:
            t_id = ticket['id']
            selections = ticket.get('selections', [])
            print(f"\n--- Processing Ticket: {t_id} ---")
            
            ticket_results = []
            all_processed = True

            for bet in selections:
                # 1. Use your specific JSON keys
                raw_match_name = bet.get('matchName', 'Unknown vs Unknown')
                selection = bet.get('selection', '')
                market = bet.get('marketName', '1X2')

                # 2. Match teams using fuzzy logic on the full matchName string
                query = self.normalize(raw_match_name)
                match = process.extractOne(query, result_pool, scorer=fuzz.token_set_ratio)
                
                if match and match[1] >= self.threshold:
                    res = results[match[2]]
                    print(f"  ✅ Match Found: {res['home_name']} vs {res['away_name']} ({match[1]}%)")
                    
                    won = self.validate_bet(market, selection, res['fulltime_home'], res['fulltime_away'])
                    
                    if won is None:
                        print(f"  ⏳ Scores not ready for {raw_match_name}.")
                        all_processed = False
                        break
                    
                    print(f"  🎯 Leg Result: {res['fulltime_home']}-{res['fulltime_away']} | Pick: {selection} | {'WON' if won else 'LOST'}")
                    ticket_results.append(won)
                else:
                    print(f"  ❌ No match found for '{raw_match_name}'")
                    all_processed = False
                    break 

            if all_processed and len(ticket_results) == len(selections):
                final_status = "won" if all(ticket_results) else "lost"
                supabase.table("betsnow").update({"status": final_status}).eq("id", t_id).execute()
                print(f"⭐ TICKET SETTLED: {final_status.upper()}")

if __name__ == "__main__":
    engine = SettlementEngine()
    engine.run()
