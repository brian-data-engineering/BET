import os
from supabase import create_client, Client
from rapidfuzz import process, fuzz

# Supabase Setup
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def settle_soccer_bets():
    # 1. Fetch Pending Soccer Tickets
    tickets = supabase.table("betsnow").select("*").eq("status", "Pending").execute().data
    
    # 2. Fetch Recent Soccer Results
    results = supabase.table("results").select("*").eq("sport_key", "soccer").execute().data

    for ticket in tickets:
        # Get the match result using Fuzzy Matching on team names
        choices = [f"{r['home_name']} vs {r['away_name']}" for r in results]
        ticket_match = f"{ticket['home_team']} vs {ticket['away_team']}"
        
        extract = process.extractOne(ticket_match, choices, scorer=fuzz.WRatio)
        
        if extract and extract[1] > 85:  # Confidence threshold
            match_index = choices.index(extract[0])
            res = results[match_index]
            
            # --- THE FIX: RESILIENT SCORE PICKER ---
            # Priority: fulltime_home -> home_score -> 0 (as fallback)
            h_score = res.get('fulltime_home') if res.get('fulltime_home') is not None else res.get('home_score')
            a_score = res.get('fulltime_away') if res.get('fulltime_away') is not None else res.get('away_score')

            if h_score is None or a_score is None:
                print(f"⚠️ Skipping {ticket_match}: Match found but scores are still NULL.")
                continue
            
            # --- SETTLEMENT LOGIC (1X2) ---
            outcome = ""
            if h_score > a_score:
                outcome = "1"
            elif h_score < a_score:
                outcome = "2"
            else:
                outcome = "X"

            # Check if user won
            # Assuming ticket['pick'] is '1', 'X', or '2'
            new_status = "Won" if ticket['pick'] == outcome else "Lost"
            
            # 3. Update the Ticket
            supabase.table("betsnow").update({
                "status": new_status,
                "scoreline": f"{h_score}-{a_score}",
                "settled_at": "now()"
            }).eq("id", ticket['id']).execute()
            
            print(f"✅ Ticket {ticket['id']} ({ticket_match}): {new_status} [{h_score}-{a_score}]")
        else:
            print(f"🔍 No match found for {ticket_match}")

if __name__ == "__main__":
    settle_soccer_bets()
