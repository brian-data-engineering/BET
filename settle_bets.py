import os
import json
from supabase import create_client, Client
from rapidfuzz import process, fuzz
from datetime import datetime, timedelta

# --- 1. SETUP & CREDENTIALS ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SETUP ERROR: Environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found.")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"❌ CONNECTION ERROR: {e}")
    exit(1)

class SettlementEngine:
    def __init__(self, confidence_threshold=85):
        self.threshold = confidence_threshold

    def normalize(self, text):
        if not text: return ""
        stops = ['fc', 'utd', 'united', 'city', 'town', 'afc', 'sc', 'v', 'youth', 'u23', 'u21']
        text = text.lower().replace('.', '').replace('-', ' ').replace('/', ' ')
        return " ".join([w for w in text.split() if w not in stops]).strip()

    def validate_bet(self, market, pick, h_score, a_score):
        """Derives win/loss from scores. Returns True, False, or None if scores missing."""
        if h_score is None or a_score is None:
            return None # Score not available yet

        try:
            h = int(h_score)
            a = int(a_score)
            total = h + a
            p = str(pick).strip().upper()

            if market == "1X2":
                if p == "1": return h > a
                if p == "2": return a > h
                if p == "X": return h == a
            
            elif "Over/Under" in market:
                line = float(market.split()[-1])
                return total > line if p == "OVER" else total < line

            elif market == "GG/NG":
                is_gg = h > 0 and a > 0
                return is_gg if p == "GG" else not is_gg

            elif market == "Correct Score":
                # Matches "2-1", "2:1", "2 - 1"
                actual = f"{h}-{a}"
                target = p.replace(' ', '').replace(':', '-')
                return actual == target

            print(f"      ⚠️ Unknown Market Type: {market}")
            return False
        except Exception as e:
            print(f"      ⚠️ Validation Error: {e}")
            return False

    def run(self):
        print(f"🚀 ENGINE START: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Fetch Pending Tickets
        tickets_resp = supabase.table("betsnow").select("*").eq("status", "pending").execute()
        tickets = tickets_resp.data
        
        # Fetch Results from last 72 hours (wider window for safety)
        cutoff = (datetime.now() - timedelta(hours=72)).isoformat()
        results_resp = supabase.table("results").select("*").gt("match_date", cutoff).execute()
        results = results_resp.data

        print(f"📊 Found {len(tickets)} pending tickets and {len(results)} recent results.")

        if not results: return

        # Pre-process names for fuzzy matching
        result_pool = [f"{self.normalize(r['home_name'])} vs {self.normalize(r['away_name'])}" for r in results]

        for ticket in tickets:
            t_id = ticket['id']
            selections = ticket.get('selections', [])
            print(f"\n--- Checking Ticket: {t_id} ---")
            
            ticket_results = []
            all_processed = True

            for i, bet in enumerate(selections):
                h_bet = bet.get('home_team', 'Unknown')
                a_bet = bet.get('away_team', 'Unknown')
                market = bet.get('market', '1X2')
                pick = bet.get('pick', '')

                # STEP 1: Find Match
                query = f"{self.normalize(h_bet)} vs {self.normalize(a_bet)}"
                match = process.extractOne(query, result_pool, scorer=fuzz.token_set_ratio)
                
                if match and match[1] >= self.threshold:
                    res = results[match[2]]
                    print(f"  ✅ Step 1: Match Found -> {res['home_name']} vs {res['away_name']} ({match[1]}% match)")
                    
                    # STEP 2: Validate Scores
                    won = self.validate_bet(market, pick, res['fulltime_home'], res['fulltime_away'])
                    
                    if won is None:
                        print(f"  ⏳ Step 2: Match found but scores are NULL. Waiting for final result.")
                        all_processed = False
                        break
                    
                    print(f"  🎯 Step 3: Leg {i+1} ({market} {pick}) -> Result: {res['fulltime_home']}-{res['fulltime_away']} -> {'WON' if won else 'LOST'}")
                    ticket_results.append(won)
                else:
                    print(f"  ❌ Step 1: No match found for '{h_bet} vs {a_bet}' in results table.")
                    all_processed = False
                    break 

            # FINAL SETTLEMENT
            if all_processed and len(ticket_results) == len(selections):
                final_status = "won" if all(ticket_results) else "lost"
                supabase.table("betsnow").update({"status": final_status}).eq("id", t_id).execute()
                print(f"⭐ FINAL: Ticket {t_id} marked as {final_status.upper()}")
            else:
                print(f"⏭️ SKIPPED: Ticket {t_id} remains PENDING (Waiting for data)")

if __name__ == "__main__":
    engine = SettlementEngine(confidence_threshold=88)
    engine.run()
