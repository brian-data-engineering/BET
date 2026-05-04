import os
import sys
from supabase import create_client, Client
from difflib import SequenceMatcher

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Credentials missing.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def similarity(a, b):
    if not a or not b: return 0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def run_team_mapping():
    print("🔄 Starting Lucra Team Name Mapper...", flush=True)

    # 1. Fetch pending bets to see which teams need mapping
    bets_res = supabase.table("betsnow").select("selections").eq("status", "pending").execute()
    
    bet_teams = set()
    for ticket in bets_res.data:
        selections = ticket.get('selections', [])
        for sel in selections:
            m_name = sel.get('matchName', "")
            if " vs " in m_name:
                parts = m_name.split(" vs ")
                bet_teams.add(parts[0].strip()) # Home
                bet_teams.add(parts[1].strip()) # Away

    # 2. Fetch recent results to use as the "Official" reference
    results_res = supabase.table("soccer_results").select("home_team, away_team").limit(1000).execute()
    official_teams = set()
    for res in results_res.data:
        official_teams.add(res['home_team'])
        official_teams.add(res['away_team'])

    mapping_payload = []

    # 3. Fuzzy Match Bet Teams to Official Scraper Teams
    for b_team in bet_teams:
        best_match = None
        highest_score = 0

        for o_team in official_teams:
            score = similarity(b_team, o_team)
            
            # Special check: If the bet name is "inside" the official name
            # (e.g., "Londrina" inside "Londrina EC")
            if b_team.lower() in o_team.lower() or o_team.lower() in b_team.lower():
                score += 0.2 

            if score > highest_score:
                highest_score = score
                best_match = o_team

        # Threshold check (0.5 is usually safe for team abbreviations)
        if highest_score > 0.5:
            mapping_payload.append({
                "bet_team_name": b_team,
                "official_team_name": best_match,
                "confidence": round(highest_score, 2)
            })
            print(f"✅ Map: '{b_team}' -> '{best_match}' [{highest_score:.2f}]")

    # 4. Upsert to your team_mappings table
    if mapping_payload:
        try:
            supabase.table("team_mappings").upsert(
                mapping_payload, on_conflict="bet_team_name"
            ).execute()
            print(f"\n✨ Successfully updated {len(mapping_payload)} team mappings.")
        except Exception as e:
            print(f"❌ DB Error: {e}")
    else:
        print("🏁 No new team matches found.")

if __name__ == "__main__":
    run_team_mapping()
