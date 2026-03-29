import os
import sys
from supabase import create_client, Client
from rapidfuzz import process, fuzz

# --- CONFIGURATION ---
URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not URL or not SERVICE_KEY:
    print("❌ ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.")
    sys.exit(1)

# Initialize with Service Role for "God Mode" access
supabase: Client = create_client(URL, SERVICE_KEY)

def settle_soccer():
    print("🚀 Starting Soccer Settlement...")

    # 1. Fetch all Pending tickets that are Soccer
    # Ensure your 'betsnow' table has a 'sport' or 'sport_type' column
    tickets_query = supabase.table("betsnow").select("*").eq("status", "Pending").execute()
    tickets = tickets_query.data

    if not tickets:
        print("✅ No pending tickets found.")
        return

    # 2. Fetch all Settled Soccer Results
    results_query = supabase.table("results").select("*").eq("sport_key", "soccer").execute()
    results = results_query.data

    if not results:
        print("⚠️ No soccer results found in database to match against.")
        return

    # Create a lookup list for fuzzy matching
    result_names = [f"{r['home_name']} vs {r['away_name']}" for r in results]

    for ticket in tickets:
        ticket_match = f"{ticket['home_team']} vs {ticket['away_team']}"
        
        # 3. Fuzzy Match Team Names (Threshold 85%)
        match = process.extractOne(ticket_match, result_names, scorer=fuzz.WRatio)
        
        if match and match[1] >= 85:
            res = results[result_names.index(match[0])]
            
            # --- THE FALLBACK LOGIC ---
            # Checks fulltime_home first, then home_score if the first is NULL
            h_score = res.get('fulltime_home') if res.get('fulltime_home') is not None else res.get('home_score')
            a_score = res.get('fulltime_away') if res.get('fulltime_away') is not None else res.get('away_score')

            if h_score is None or a_score is None:
                print(f"⏭️ Skipping {ticket_match}: Match found but scores are still NULL in DB.")
                continue

            # 4. Determine Outcome (1, X, 2)
            actual_outcome = "X"
            if h_score > a_score:
                actual_outcome = "1"
            elif a_score > h_score:
                actual_outcome = "2"

            # 5. Compare with User's Pick
            # Assuming ticket['pick'] stores '1', 'X', or '2'
            final_status = "Won" if str(ticket['pick']) == actual_outcome else "Lost"

            # 6. Update Ticket in Supabase
            try:
                supabase.table("betsnow").update({
                    "status": final_status,
                    "scoreline": f"{h_score}-{a_score}",
                    "settled_at": "now()"
                }).eq("id", ticket['id']).execute()
                
                print(f"💰 Settled: {ticket_match} | Pick: {ticket['pick']} | Result: {actual_outcome} | STATUS: {final_status}")
            except Exception as e:
                print(f"❌ Failed to update ticket {ticket['id']}: {e}")
        else:
            print(f"🔍 No result found yet for: {ticket_match}")

if __name__ == "__main__":
    settle_soccer()
