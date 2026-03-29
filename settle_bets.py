import os
import sys
from supabase import create_client, Client

# --- 1. Elevated Access Configuration ---
URL = os.environ.get("SUPABASE_URL")
# MUST use Service Role Key to bypass RLS and update 'status'
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not URL or not KEY:
    print("❌ ERROR: Missing Environment Variables.")
    sys.exit(1)

supabase: Client = create_client(URL, KEY)

def settle_soccer_tickets():
    print("🚀 Starting Professional Settlement...")

    # 2. Fetch Pending Tickets (Case-Insensitive check)
    tickets = supabase.table("betsnow").select("*").ilike("status", "pending").execute().data
    
    if not tickets:
        print("✅ No pending tickets found in 'betsnow'.")
        return

    # 3. Fetch All Soccer Results
    results_data = supabase.table("results").select("*").eq("sport_key", "soccer").execute().data
    # Create a dictionary for O(1) lightning-fast lookup
    results_map = {str(r['id']): r for r in results_data}

    for ticket in tickets:
        selections = ticket.get('selections', [])
        if not selections:
            continue

        ticket_won = True
        ticket_lost = False
        matches_processed = 0

        for sel in selections:
            # Match ID can be in the JSON or the main column
            m_id = str(sel.get('match_id') or ticket.get('api_match_id'))
            
            if m_id not in results_map:
                ticket_won = False # Can't win yet if match isn't in results
                continue

            res = results_map[m_id]
            
            # --- RESILIENT SCORE PICKER ---
            # Checks fulltime_home, then home_score
            h = res.get('fulltime_home') if res.get('fulltime_home') is not None else res.get('home_score')
            a = res.get('fulltime_away') if res.get('fulltime_away') is not None else res.get('away_score')

            if h is None or a is None:
                ticket_won = False
                continue

            # Determine Result (1, X, 2)
            actual = "X"
            if h > a: actual = "1"
            elif a > h: actual = "2"

            # Compare with User Pick
            user_pick = str(sel.get('pick'))
            if user_pick != actual:
                ticket_lost = True
                break # One loss kills the whole multibet
            
            matches_processed += 1

        # 4. Final Decision Logic
        new_status = None
        if ticket_lost:
            new_status = "Lost"
        elif ticket_won and matches_processed == len(selections):
            new_status = "Won"

        # 5. Execute Database Update
        if new_status:
            try:
                supabase.table("betsnow").update({
                    "status": new_status,
                    "paid_at": "now()" if new_status == "Won" else None
                }).eq("id", ticket['id']).execute()
                print(f"✅ Ticket {ticket['booking_code']} -> {new_status}")
            except Exception as e:
                print(f"❌ DB Update Error: {e}")

if __name__ == "__main__":
    settle_soccer_tickets()
