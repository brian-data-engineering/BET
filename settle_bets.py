import os
import sys
from supabase import create_client, Client

# --- CONFIGURATION ---
URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not URL or not SERVICE_KEY:
    print("❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
    sys.exit(1)

supabase: Client = create_client(URL, SERVICE_KEY)

def settle_multibets():
    print("🚀 Starting JSONB Settlement...")

    # 1. Fetch tickets with status 'Pending'
    # We use .ilike to be safe with case sensitivity (Pending vs pending)
    tickets = supabase.table("betsnow").select("*").ilike("status", "pending").execute().data

    if not tickets:
        print("✅ No pending tickets found.")
        return

    for ticket in tickets:
        selections = ticket.get('selections', [])
        all_matches_won = True
        any_match_lost = False
        processed_count = 0

        for sel in selections:
            # We use api_match_id if available, otherwise match_id from JSON
            m_id = sel.get('match_id') or ticket.get('api_match_id')
            
            if not m_id:
                continue

            # 2. Look up the result in our 'results' table
            res_query = supabase.table("results").select("*").eq("id", m_id).execute()
            
            if not res_query.data:
                print(f"🔍 Result not found yet for Match ID: {m_id}")
                all_matches_won = False # Can't settle as 'Won' yet
                continue

            res = res_query.data[0]
            
            # Use fallback for scores
            h = res.get('fulltime_home') if res.get('fulltime_home') is not None else res.get('home_score')
            a = res.get('fulltime_away') if res.get('fulltime_away') is not None else res.get('away_score')

            if h is None:
                all_matches_won = False
                continue

            # 3. Determine actual outcome
            actual = "X"
            if h > a: actual = "1"
            elif a > h: actual = "2"

            # 4. Compare with user pick (from JSON)
            user_pick = str(sel.get('pick'))
            if user_pick != actual:
                any_match_lost = True
            
            processed_count += 1

        # 5. Final Ticket Decision
        if any_match_lost:
            new_status = "Lost"
        elif all_matches_won and processed_count == len(selections):
            new_status = "Won"
        else:
            continue # Leave as Pending if some matches aren't finished

        # 6. Update the Ticket
        supabase.table("betsnow").update({
            "status": new_status,
            "paid_at": "now()" if new_status == "Won" else None
        }).eq("id", ticket['id']).execute()

        print(f"🎫 Ticket {ticket['booking_code']} settled as: {new_status}")

if __name__ == "__main__":
    settle_multibets()
