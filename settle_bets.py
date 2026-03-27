import os
from supabase import create_client
from rapidfuzz import fuzz

# --- CONFIGURATION ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def settle_bets():
    print("🚀 Starting Settlement Engine...")

    # 1. FETCH PENDING TICKETS
    # We grab tickets that haven't been settled yet
    tickets_res = supabase.table("betsnow").select("id, selections").eq("status", "pending").execute()
    tickets = tickets_res.data

    if not tickets:
        print("✅ No pending tickets to settle.")
        return

    # 2. FETCH RECENT RESULTS
    # We grab results from the last 3 days to compare names
    results_res = supabase.table("results").select("*").order("match_date", desc=True).limit(200).execute()
    results = results_res.data

    if not results:
        print("⚠️ No results found in database to compare against.")
        return

    for ticket in tickets:
        ticket_id = ticket['id']
        selections = ticket['selections'] # This is your JSONB array
        
        ticket_won = True
        all_matches_found = True

        for sel in selections:
            # Get names from your Betika-scraped JSON
            # Note: Ensure these keys match what you saved in UnifiedTerminal.js
            b_home = sel.get('home_team') or sel.get('matchName', '').split(' vs ')[0]
            b_away = sel.get('away_team') or sel.get('matchName', '').split(' vs ')[1] if ' vs ' in str(sel.get('matchName')) else ''
            user_pick = str(sel.get('selection') or sel.get('pick'))

            # Fuzzy Match against the Results table
            match_result = None
            for r in results:
                # Score similarity between Betika names and Odds API names
                h_sim = fuzz.token_sort_ratio(b_home, r['home_name'])
                a_sim = fuzz.token_sort_ratio(b_away, r['away_name'])
                
                if h_sim > 85 and a_sim > 85:
                    match_result = r
                    break
            
            if match_result:
                res_h = match_result.get('fulltime_home') or match_result.get('home_score', 0)
                res_a = match_result.get('fulltime_away') or match_result.get('away_score', 0)
                
                # SETTLEMENT LOGIC
                is_win = False
                if user_pick == '1' and res_h > res_a: is_win = True
                elif user_pick == '2' and res_a > res_h: is_win = True
                elif user_pick == 'X' and res_h == res_a: is_win = True
                elif user_pick == 'GG' and res_h > 0 and res_a > 0: is_win = True
                elif user_pick == 'NG' and (res_h == 0 or res_a == 0): is_win = True
                elif user_pick == 'OV25' and (res_h + res_a) > 2.5: is_win = True
                elif user_pick == 'UN25' and (res_h + res_a) < 2.5: is_win = True
                
                if not is_win:
                    ticket_won = False
            else:
                # Result not found yet, skip this ticket for now
                all_matches_found = False
                break

        # 3. UPDATE TICKET STATUS
        if all_matches_found:
            final_status = "won" if ticket_won else "lost"
            supabase.table("betsnow").update({"status": final_status}).eq("id", ticket_id).execute()
            print(f"🎫 Ticket {ticket_id[:8]} settled as: {final_status.upper()}")

    print("🏁 Settlement cycle complete.")

if __name__ == "__main__":
    settle_bets()
