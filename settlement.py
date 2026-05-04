"""
settlement.py
Settles pending tickets in `print` table against `finalresults`.
Matches by team names (fuzzy) since match IDs change between sources.
Rules:
  - All selections must WIN for the ticket to WIN
  - Any LOSS → whole ticket LOSES
  - Any selection still PENDING (no result yet) → ticket stays pending
  - Supported markets: Match Winner, Double Chance, Both Teams To Score,
    European Handicap, Total Goals (O/U), Home/Away Team Total Goals,
    Victory Margin
"""

import os
import re
from difflib import SequenceMatcher
from supabase import create_client

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(URL, KEY)

# ── Name similarity threshold ─────────────────────────────────────────
MATCH_THRESHOLD = 0.72  # 72% similarity — handles minor spelling diffs


def similarity(a, b):
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def names_match(name1, name2):
    return similarity(name1, name2) >= MATCH_THRESHOLD


def parse_match_name(match_name):
    """Split 'Braga vs Freiburg' → ('Braga', 'Freiburg')"""
    parts = re.split(r'\s+vs\.?\s+', match_name, flags=re.IGNORECASE)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return None, None


def find_result(home, away, results):
    """Find a result row matching both team names."""
    for r in results:
        if names_match(home, r['home_team']) and names_match(away, r['away_team']):
            return r
    return None


# ── Market settlement logic ───────────────────────────────────────────

def settle_selection(sel, result):
    """
    Returns: 'won', 'lost', or 'pending'
    result = { home_team, away_team, full_time_score: {home, away}, period_scores }
    """
    market = (sel.get('marketName') or '').strip()
    selection = (sel.get('selection') or '').strip()

    score = result.get('full_time_score') or {}
    h = int(score.get('home', 0))
    a = int(score.get('away', 0))

    # ── Match Winner ──────────────────────────────────────────────────
    if market in ('Match Winner', 'Full Time Result', '1X2 Regular Time'):
        if selection in ('Home', 'W1', 'Player 1', 'Home Win'):
            return 'won' if h > a else 'lost'
        elif selection in ('Away', 'W2', 'Player 2', 'Away Win'):
            return 'won' if a > h else 'lost'
        elif selection in ('Draw', 'X'):
            return 'won' if h == a else 'lost'

    # ── Double Chance ─────────────────────────────────────────────────
    elif market == 'Double Chance':
        if selection == '1X':
            return 'won' if h >= a else 'lost'
        elif selection == '12':
            return 'won' if h != a else 'lost'
        elif selection in ('X2', '2X'):
            return 'won' if a >= h else 'lost'

    # ── Both Teams To Score ───────────────────────────────────────────
    elif market == 'Both Teams To Score':
        btts = h > 0 and a > 0
        if selection == 'Yes':
            return 'won' if btts else 'lost'
        elif selection == 'No':
            return 'won' if not btts else 'lost'
        # Both Score 2+
        elif selection == 'Both Score 2+ Yes':
            return 'won' if h >= 2 and a >= 2 else 'lost'
        elif selection == 'Both Score 2+ No':
            return 'won' if not (h >= 2 and a >= 2) else 'lost'

    # ── Total Goals O/U ───────────────────────────────────────────────
    elif market in ('Total Goals (O/U)', 'Total Points (O/U)',
                    '1st Half Total Goals', 'Total Games (O/U)'):
        # Extract line from display e.g. "Over 2.5" → line = 2.5
        parts = selection.split()
        if len(parts) == 2:
            direction = parts[0]  # Over / Under
            try:
                line = float(parts[1])
            except ValueError:
                return 'pending'

            # Use period_scores for 1st Half
            if '1st Half' in market:
                p1 = result.get('period_scores', {}).get('p1', '')
                if p1 and ':' in p1:
                    ph, pa = map(int, p1.split(':'))
                    total = ph + pa
                else:
                    return 'pending'
            else:
                total = h + a

            if direction == 'Over':
                return 'won' if total > line else 'lost'
            elif direction == 'Under':
                return 'won' if total < line else 'lost'

    # ── Home Team Total Goals ─────────────────────────────────────────
    elif market == 'Home Team Total Goals':
        parts = selection.split()
        if len(parts) == 2:
            direction, line = parts[0], float(parts[1])
            if direction == 'Over':
                return 'won' if h > line else 'lost'
            elif direction == 'Under':
                return 'won' if h < line else 'lost'

    # ── Away Team Total Goals ─────────────────────────────────────────
    elif market == 'Away Team Total Goals':
        parts = selection.split()
        if len(parts) == 2:
            direction, line = parts[0], float(parts[1])
            if direction == 'Over':
                return 'won' if a > line else 'lost'
            elif direction == 'Under':
                return 'won' if a < line else 'lost'

    # ── European Handicap / Game Handicap ─────────────────────────────
    elif market in ('European Handicap', 'Game Handicap', 'Handicap'):
        parts = selection.split()
        if len(parts) == 2:
            side = parts[0]   # Home / Away / Player 1 / Player 2
            try:
                hdp = float(parts[1])
            except ValueError:
                return 'pending'

            if side in ('Home', 'Player 1'):
                adjusted = h + hdp
                if adjusted > a:
                    return 'won'
                elif adjusted < a:
                    return 'lost'
                else:
                    return 'won'  # push → treat as win (common in European HDP)
            elif side in ('Away', 'Player 2'):
                adjusted = a + hdp
                if adjusted > h:
                    return 'won'
                elif adjusted < h:
                    return 'lost'
                else:
                    return 'won'

    # ── Victory Margin ────────────────────────────────────────────────
    elif market == 'Victory Margin':
        diff = abs(h - a)
        if selection.startswith('Win by ') and '+' not in selection:
            try:
                margin = int(selection.replace('Win by ', ''))
                return 'won' if diff == margin else 'lost'
            except ValueError:
                return 'pending'
        elif selection.startswith('Win by ') and '+' in selection:
            try:
                margin = int(selection.replace('Win by ', '').replace('+', ''))
                return 'won' if diff >= margin else 'lost'
            except ValueError:
                return 'pending'
        elif selection.startswith('Not win by'):
            try:
                margin = int(re.search(r'\d+', selection).group())
                return 'won' if diff != margin else 'lost'
            except (ValueError, AttributeError):
                return 'pending'

    # ── Correct Score ─────────────────────────────────────────────────
    elif market == 'Correct Score':
        if '-' in selection and selection != 'Other scores':
            try:
                sh, sa = map(int, selection.split('-'))
                return 'won' if h == sh and a == sa else 'lost'
            except ValueError:
                return 'pending'
        elif selection == 'Other scores':
            # Known scores are those with H+A <= 5 — anything outside is "other"
            known_combos = [(i, j) for i in range(6) for j in range(6)]
            actual = (h, a)
            return 'won' if actual not in known_combos else 'lost'

    # ── Team Wins (Basketball / Ice Hockey incl OT) ───────────────────
    elif market in ('Team Wins', 'Team Wins (incl. OT)'):
        if selection in ('Home Win', 'W1'):
            return 'won' if h > a else 'lost'
        elif selection in ('Away Win', 'W2'):
            return 'won' if a > h else 'lost'

    # Unknown market — can't settle
    return 'pending'


# ── Main settlement loop ──────────────────────────────────────────────

def settle():
    print("🎯 Settlement started...\n")

    # 1. Fetch pending tickets
    res = supabase.table('print') \
        .select('id, ticket_serial, stake, total_odds, potential_payout, selections') \
        .eq('status', 'pending') \
        .execute()

    tickets = res.data or []
    if not tickets:
        print("📭 No pending tickets. Done.")
        return

    print(f"📋 Found {len(tickets)} pending tickets\n")

    # 2. Collect all match names needed
    all_names = set()
    for ticket in tickets:
        for sel in (ticket.get('selections') or []):
            mn = sel.get('matchName', '')
            h, a = parse_match_name(mn)
            if h:
                all_names.add(h.lower()[:20])  # first 20 chars for broad search

    # 3. Fetch all relevant results (last 7 days)
    results_res = supabase.table('finalresults') \
        .select('home_team, away_team, full_time_score, period_scores, raw_clean_score, display_league') \
        .execute()

    all_results = results_res.data or []
    print(f"📊 {len(all_results)} results available in finalresults\n")

    settled_won = 0
    settled_lost = 0
    still_pending = 0

    for ticket in tickets:
        serial = ticket['ticket_serial']
        selections = ticket.get('selections') or []

        if not selections:
            continue

        ticket_outcome = 'won'   # assume win until proven otherwise
        any_pending = False
        settled_selections = []

        for sel in selections:
            home, away = parse_match_name(sel.get('matchName', ''))
            if not home:
                sel['result'] = 'pending'
                any_pending = True
                settled_selections.append(sel)
                continue

            result = find_result(home, away, all_results)

            if not result:
                # No result yet — match hasn't finished
                sel['result'] = 'pending'
                any_pending = True
                ticket_outcome = 'pending'
            else:
                outcome = settle_selection(sel, result)
                sel['result'] = outcome
                sel['score'] = result.get('raw_clean_score', '')

                if outcome == 'lost':
                    ticket_outcome = 'lost'
                elif outcome == 'pending':
                    any_pending = True
                    if ticket_outcome != 'lost':
                        ticket_outcome = 'pending'

            settled_selections.append(sel)

        # If any pending and not already lost — keep pending
        if any_pending and ticket_outcome != 'lost':
            ticket_outcome = 'pending'

        # Update ticket in DB
        update_payload = {
            'selections': settled_selections,
        }

        if ticket_outcome == 'won':
            update_payload['status'] = 'won'
            update_payload['settled_at'] = 'now()'
            settled_won += 1
            print(f"✅ WON  — {serial}")
        elif ticket_outcome == 'lost':
            update_payload['status'] = 'lost'
            update_payload['settled_at'] = 'now()'
            settled_lost += 1
            print(f"❌ LOST — {serial}")
        else:
            still_pending += 1
            # Still update selections to save scores found so far
            supabase.table('print') \
                .update({'selections': settled_selections}) \
                .eq('id', ticket['id']) \
                .execute()
            print(f"⏳ PENDING — {serial} (waiting for {sum(1 for s in settled_selections if s.get('result') == 'pending')} results)")
            continue

        supabase.table('print') \
            .update(update_payload) \
            .eq('id', ticket['id']) \
            .execute()

    print(f"\n{'─'*40}")
    print(f"✅ Won:     {settled_won}")
    print(f"❌ Lost:    {settled_lost}")
    print(f"⏳ Pending: {still_pending}")
    print(f"{'─'*40}")
    print("✨ Settlement complete.")


if __name__ == '__main__':
    settle()
