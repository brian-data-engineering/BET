import os
from supabase import create_client
from rapidfuzz import fuzz

# --- CONFIGURATION ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def settle_bets():
    print("🚀 Starting Lucra Settlement Engine...")

    # 1. FETCH PENDING TICKETS
    tickets_res = supabase.table("betsnow").select("id, selections").eq("status", "pending").execute()
    tickets = tickets_res.data

    if not tickets:
        print("✅ No pending tickets found in 'betsnow'.")
        return
    
    print(f"📋 Found {len(tickets)} tickets waiting for results.")

    # 2. FETCH RECENT RESULTS
    # We grab more results to ensure we don't miss the game that was "bet long ago"
    results_res = supabase.table("results").select("*").order("match_date", desc=True).limit(300).execute()
    results = results_res.data

    if not results:
        print("⚠️ 'results' table is empty. Scraper might not have updated yet.")
        return

    for ticket in tickets:
        ticket_id = ticket['id']
        selections = ticket['selections']
        
        ticket_won = True
        all_matches_found = True
        processed_selections = 0

        print(f"\n🔍 Checking Ticket: {ticket_id}")

        for sel in selections:
            # Flexible key fetching to handle different JSON formats
            b_home = sel.get('home_team') or sel.get('home')
            b_away = sel.get('away_team') or sel.get('away')
            
            # Fallback if names are stored in a single 'matchName' string
            if not b_home and sel.get('matchName'):
                parts = sel.get('matchName').split(' vs ')
                b_home = parts[0] if len(parts) > 0 else ''
                b_away = parts[1] if len(parts) > 1 else ''

            user_pick = str(sel.get('selection') or sel.get('pick') or sel.get('outcome')).upper()

            print(f"   ⚽ Bet: {b_home} vs {b_away} | Pick: {user_pick}")

            # Fuzzy Match Logic
            match_result = None
            highest_sim = 0
            
            for r in results:
                h_sim = fuzz.token_sort_ratio(str(b_home), str(r.get('home_name')))
                a_sim = fuzz.token_sort_ratio(str(b_away), str(r.get('away_name')))
                avg_sim = (h_sim + a_sim) / 2
                
                # Threshold at 75 to handle "Man Utd" vs "Manchester United"
                if h_sim > 75 and a_sim > 75:
                    match_result = r
                    highest_sim = avg_sim
                    break
            
            if match_result:
                res_h = int(match_result.get('fulltime_home') or match_result.get('home_score') or 0)
                res_a = int(match_result.get('fulltime_away') or match_result.get('away_score') or 0)
                print(f"   ✅ Match Found! ({highest_sim:.1f}% Match) Score: {res_h}-{res_a}")

                # SETTLEMENT LOGIC
                is_win = False
                if user_pick in ['1', 'HOME'] and res_h > res_a: is_win = True
                elif user_pick in ['2', 'AWAY'] and res_a > res_h: is_win = True
                elif user_pick in ['X', 'DRAW'] and res_h == res_a: is_win = True
                elif user_pick == 'GG' and res_h > 0 and res_a > 0: is_win = True
                elif user_pick == 'NG' and (res_h == 0 or res_a == 0): is_win = True
                elif user_pick == 'OV25' and (res_h + res_a) > 2.5: is_win = True
                elif user_pick == 'UN25' and (res_h + res_a) < 2.5: is_win = True
                
                if not is_win:
                    print(f"   ❌ Selection Lost.")
                    ticket_won = False
                else:
                    print(f"   🌟 Selection Won!")
                
                processed_selections += 1
            else:
                print(f"   ⏳ No result found in DB yet for {b_home} vs {b_away}.")
                all_matches_found = False
                break

        # 3. UPDATE TICKET STATUS
        if all_matches_found and processed_selections > 0:
            final_status = "won" if ticket_won else "lost"
            supabase.table("betsnow").update({"status": final_status}).eq("id", ticket_id).execute()
            print(f"‼️ TICKET {ticket_id} SETTLED AS {final_status.upper()}")

    print("\n🏁 Settlement cycle complete.")

if __name__ == "__main__":
    settle_bets()
