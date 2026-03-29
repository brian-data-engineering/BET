import json
from supabase import create_client
from rapidfuzz import process, fuzz
from datetime import datetime, timedelta

# Configuration
URL = "YOUR_SUPABASE_URL"
KEY = "YOUR_SERVICE_ROLE_KEY" 
supabase = create_client(URL, KEY)

class SettlementEngine:
    def __init__(self, confidence_threshold=88):
        self.threshold = confidence_threshold

    def normalize(self, text):
        if not text: return ""
        # Remove common fluff that varies between bookies
        stops = ['fc', 'utd', 'united', 'city', 'town', 'afc', 'sc', 'v', 'youth', 'u23', 'u21']
        text = text.lower().replace('.', '').replace('-', ' ').replace('/', ' ')
        return " ".join([w for w in text.split() if w not in stops]).strip()

    def validate_bet(self, market, pick, h_score, a_score):
        """
        The Core Logic: Derive market outcomes from the final score.
        """
        h_score = int(h_score)
        a_score = int(a_score)
        total = h_score + a_score

        try:
            if market == "1X2":
                if pick == "1": return h_score > a_score
                if pick == "2": return a_score > h_score
                if pick == "X": return h_score == a_score
            
            elif "Over/Under" in market:
                # Extract 2.5, 1.5, etc. from string "Over/Under 2.5"
                line = float(market.split()[-1])
                return total > line if pick == "Over" else total < line

            elif market == "GG/NG":
                is_gg = h_score > 0 and a_score > 0
                return is_gg if pick == "GG" else not is_gg

            elif market == "Correct Score":
                # Assuming pick is in format "2-1"
                return f"{h_score}-{a_score}" == pick.replace(' ', '')

            elif "Handicap" in market:
                # Basic Handicap logic: "Handicap 1 (0:1)"
                # This requires parsing your specific JSON format for the spread
                return False 
                
        except Exception as e:
            print(f"Logic Error for {market}: {e}")
            return False
        return False

    def run(self):
        # 1. Fetch only pending bets
        tickets = supabase.table("betsnow").select("*").eq("status", "pending").execute().data
        # 2. Fetch recent results (last 3 days to keep memory low)
        three_days_ago = (datetime.now() - timedelta(days=3)).isoformat()
        results = supabase.table("results").select("*").gt("match_date", three_days_ago).execute().data

        # Pre-calculate normalized result strings: "home vs away"
        result_pool = [f"{self.normalize(r['home_name'])} vs {self.normalize(r['away_name'])}" for r in results]

        for ticket in tickets:
            selections = ticket.get('selections', [])
            ticket_id = ticket['id']
            results_to_update = [] # Track status of each leg
            all_legs_found = True

            for bet in selections:
                # Extract details from your JSONB
                t_home = self.normalize(bet.get('home_team'))
                t_away = self.normalize(bet.get('away_team'))
                search_query = f"{t_home} vs {t_away}"
                
                # Fuzzy Match
                best_match = process.extractOne(search_query, result_pool, scorer=fuzz.token_set_ratio)
                
                if best_match and best_match[1] >= self.threshold:
                    res = results[best_match[2]]
                    leg_won = self.validate_bet(
                        bet.get('market'), 
                        bet.get('pick'), 
                        res['fulltime_home'], 
                        res['fulltime_away']
                    )
                    results_to_update.append(leg_won)
                else:
                    all_legs_found = False
                    break 

            # Final Settlement Logic
            if all_legs_found and len(results_to_update) == len(selections):
                final_status = "won" if all(results_to_update) else "lost"
                supabase.table("betsnow").update({
                    "status": final_status,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", ticket_id).execute()
                print(f"Ticket {ticket_id} settled: {final_status.upper()}")

if __name__ == "__main__":
    engine = SettlementEngine(confidence_threshold=90)
    engine.run()
