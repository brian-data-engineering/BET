import os
import json
from supabase import create_client, Client
from rapidfuzz import process, fuzz
from datetime import datetime, timedelta

# 1. Securely fetch Environment Variables
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# 2. Critical Check: Prevent crash with clear error message
if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing!")
    print("Check your GitHub Repo Settings > Secrets > Actions.")
    exit(1)

# 3. Initialize Client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"❌ Failed to connect to Supabase: {e}")
    exit(1)

class SettlementEngine:
    def __init__(self, confidence_threshold=90):
        self.threshold = confidence_threshold

    def normalize(self, text):
        if not text: return ""
        stops = ['fc', 'utd', 'united', 'city', 'town', 'afc', 'sc', 'v', 'youth']
        text = text.lower().replace('.', '').replace('-', ' ').replace('/', ' ')
        return " ".join([w for w in text.split() if w not in stops]).strip()

    def validate_bet(self, market, pick, h_score, a_score):
        h_score, a_score = int(h_score), int(a_score)
        total = h_score + a_score
        
        # Complex Market Logic
        try:
            if market == "1X2":
                if pick == "1": return h_score > a_score
                if pick == "2": return a_score > h_score
                if pick == "X": return h_score == a_score
            elif "Over/Under" in market:
                line = float(market.split()[-1])
                return total > line if pick == "Over" else total < line
            elif market == "GG/NG":
                is_gg = h_score > 0 and a_score > 0
                return is_gg if pick == "GG" else not is_gg
            elif market == "Correct Score":
                return f"{h_score}-{a_score}" == pick.replace(' ', '').replace(':', '-')
        except:
            return False
        return False

    def run(self):
        print("🚀 Starting Settlement Engine...")
        
        # Fetch pending tickets from 'betsnow'
        tickets = supabase.table("betsnow").select("*").eq("status", "pending").execute().data
        
        # Fetch results from last 48 hours
        cutoff = (datetime.now() - timedelta(hours=48)).isoformat()
        results = supabase.table("results").select("*").gt("match_date", cutoff).execute().data

        if not results:
            print("⚠️ No recent results found in 'results' table. Skipping.")
            return

        result_pool = [f"{self.normalize(r['home_name'])} vs {self.normalize(r['away_name'])}" for r in results]

        for ticket in tickets:
            selections = ticket.get('selections', [])
            ticket_id = ticket['id']
            results_to_update = []
            all_found = True

            for bet in selections:
                # Fuzzy matching team names
                search_query = f"{self.normalize(bet.get('home_team'))} vs {self.normalize(bet.get('away_team'))}"
                match = process.extractOne(search_query, result_pool, scorer=fuzz.token_set_ratio)
                
                if match and match[1] >= self.threshold:
                    res = results[match[2]]
                    won = self.validate_bet(bet.get('market'), bet.get('pick'), res['fulltime_home'], res['fulltime_away'])
                    results_to_update.append(won)
                else:
                    all_found = False
                    break 

            if all_found and len(results_to_update) == len(selections):
                final_status = "won" if all(results_to_update) else "lost"
                supabase.table("betsnow").update({"status": final_status}).eq("id", ticket_id).execute()
                print(f"✅ Ticket {ticket_id} settled as {final_status}")

if __name__ == "__main__":
    engine = SettlementEngine()
    engine.run()
