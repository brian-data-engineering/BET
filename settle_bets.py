import os
import psycopg2
from psycopg2.extras import RealDictCursor
from rapidfuzz import fuzz

# Database Connection (Uses GitHub Secrets for safety)
DB_URL = os.getenv('DATABASE_URL')

def settle():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 1. Get Pending Bets
    cur.execute("SELECT id, selections, created_at FROM betsnow WHERE status = 'pending'")
    tickets = cur.fetchall()

    # 2. Get Recent Results (Last 2 days to be safe)
    cur.execute("SELECT home_name, away_name, fulltime_home, fulltime_away, match_date FROM results WHERE match_date > now() - interval '2 days'")
    results = cur.fetchall()

    for ticket in tickets:
        ticket_id = ticket['id']
        selections = ticket['selections'] # This is your JSONB array
        
        ticket_won = True
        match_found_for_all = True

        for selection in selections:
            b_home = selection.get('home_team') # Adjust based on your JSON keys
            b_away = selection.get('away_team')
            user_pick = selection.get('pick')

            # Find matching result using Fuzzy Logic
            best_match = None
            for r in results:
                h_score = fuzz.token_sort_ratio(b_home, r['home_name'])
                a_score = fuzz.token_sort_ratio(b_away, r['away_name'])
                
                if h_score > 85 and a_score > 85:
                    best_match = r
                    break
            
            if best_match:
                # Logic: Check if the specific pick won
                res_h = best_match['fulltime_home']
                res_a = best_match['fulltime_away']
                
                win_condition = False
                if user_pick == '1' and res_h > res_a: win_condition = True
                elif user_pick == '2' and res_a > res_h: win_condition = True
                elif user_pick == 'X' and res_h == res_a: win_condition = True
                elif user_pick == 'GG' and res_h > 0 and res_a > 0: win_condition = True
                elif user_pick == 'NG' and (res_h == 0 or res_a == 0): win_condition = True
                
                if not win_condition:
                    ticket_won = False
            else:
                match_found_for_all = False # Result isn't in yet

        # 3. Update Status
        if match_found_for_all:
            final_status = 'won' if ticket_won else 'lost'
            cur.execute("UPDATE betsnow SET status = %s WHERE id = %s", (final_status, ticket_id))

    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    settle()
