/**
 * lib/useCashierRoulette.js
 *
 * Updated for rtickets system with 5 actions:
 * Print, Reprint, Payout, Cancel, Delete
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';

// ── Pure helpers ─────────────────────────────────────────────────────────────

export function winsBet(bet, winningNumber) {
  if (bet.type === 'single') return bet.numbers[0] === winningNumber;
  return bet.numbers.includes(winningNumber);
}

export function getPayout(bet) {
  return bet.amount * bet.payout;
}

export function groupedBets(bets) {
  return bets.reduce((acc, bet) => {
    if (acc[bet.key]) acc[bet.key] = { ...acc[bet.key], amount: acc[bet.key].amount + bet.amount };
    else              acc[bet.key] = { ...bet };
    return acc;
  }, {});
}

export function calculatePayout(bets, winningNumber) {
  const map     = groupedBets(bets);
  const entries = Object.values(map);
  const winners = entries.filter((b) => winsBet(b, winningNumber));
  return {
    grossWin:      winners.reduce((s, b) => s + getPayout(b), 0),
    winningBets:   winners.map((b) => b.key),
    winningLabels: winners.map((b) => b.label),
    totalStake:    entries.reduce((s, b) => s + b.amount, 0),
  };
}

// ── DB adapters ───────────────────────────────────────────────────────────────

async function dbFetchTickets(cashierId) {
  const { data, error } = await supabase
    .from('rtickets')
    .select('*')
    .eq('cashier_id', cashierId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

async function dbFetchCurrentDraw() {
  const { data, error } = await supabase
    .from('spin_draws')
    .select('id, winning_number, status, ends_at, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function dbFetchHistory() {
  const { data, error } = await supabase
    .from('spin_history_200')
    .select('num, color, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCashierRoulette({ terminalId = 'T1' } = {}) {

  // Auth
  const [cashierId, setCashierId] = useState(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCashierId(user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCashierId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Bet state
  const [bets, setBets]                 = useState([]);
  const [betSnapshots, setBetSnapshots] = useState([]);
  const [selectedChip, setSelectedChip] = useState(20);

  // Phase
  const [phase, setPhase]             = useState('BETTING');
  const [pendingTicketId, setPending] = useState(null);

  // Draw
  const [currentDraw, setCurrentDraw] = useState(null);

  // Results
  const [lastResult, setLastResult]       = useState(null);
  const [resultHistory, setResultHistory] = useState([]);
  const [jackpot, setJackpot]             = useState(1540); // Base jackpot

  // Tickets
  const [sessionTickets, setSessionTickets] = useState([]);

  // Derived
  const betMap      = useMemo(() => groupedBets(bets), [bets]);
  const betEntries  = useMemo(() => Object.values(betMap), [betMap]);
  const totalStake  = useMemo(() => betEntries.reduce((s, b) => s + b.amount, 0), [betEntries]);
  const maxTotalWin = useMemo(() => betEntries.reduce((s, b) => s + getPayout(b), 0), [betEntries]);

  // Last ticket reference
  const lastTicket = sessionTickets[0] ?? null;

  // ── resolveRound ──────────────────────────────────────────────────────────
  const resolveRound = useCallback(async (winningNumber, drawId) => {
    // 1. Update all 'active' tickets for this draw in the DB
    // In a real system, this would be a Postgres trigger or a cron job.
    // For now, we fetch active tickets for this draw and update them locally + DB.
    
    const { data: activeTickets, error } = await supabase
      .from('rtickets')
      .select('*')
      .eq('draw_id', drawId)
      .eq('status', 'active');
      
    if (error) {
      console.error('[useCashierRoulette] Error fetching active tickets for resolution:', error);
      return;
    }

    const updates = activeTickets.map(ticket => {
      const { grossWin, winningBets, winningLabels } = calculatePayout(ticket.bets, winningNumber);
      const status = grossWin > 0 ? 'won' : 'lost';
      return supabase.from('rtickets').update({
        status,
        winning_number: winningNumber,
        winning_labels: winningLabels
      }).eq('id', ticket.id);
    });

    await Promise.all(updates);

    // Refresh history and jackpot
    setResultHistory((prev) => [winningNumber, ...prev].slice(0, 200));
    setLastResult({ winningNumber });
    setPhase('RESULT');
    
    // Refresh tickets
    if (cashierId) {
      const tickets = await dbFetchTickets(cashierId);
      setSessionTickets(tickets);
    }
  }, [cashierId]);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    dbFetchHistory().then((rows) => setResultHistory(rows.map((r) => r.num)));
    dbFetchCurrentDraw().then((draw) => { if (draw) setCurrentDraw(draw); });
  }, []);

  useEffect(() => {
    if (!cashierId) return;
    dbFetchTickets(cashierId).then(setSessionTickets);
  }, [cashierId]);

  // ── Realtime: spin_draws ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('roulette_draws')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spin_draws' },
        (payload) => { setCurrentDraw(payload.new); }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'spin_draws' },
        (payload) => {
          const row = payload.new;
          if (row.winning_number != null && row.status === 'closed') {
            resolveRound(row.winning_number, row.id);
          }
          dbFetchCurrentDraw().then((draw) => { if (draw) setCurrentDraw(draw); });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [resolveRound]);

  // ── Realtime: spin_history_200 ────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('roulette_history')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spin_history_200' },
        (payload) => {
          setResultHistory((prev) => [payload.new.num, ...prev].slice(0, 200));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  
  const placeBet = useCallback((betDef) => {
    if (phase !== 'BETTING') return;
    setBetSnapshots((prev) => [...prev, bets]);
    setBets((prev) => [
      ...prev,
      { id: `bet-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, ...betDef, amount: selectedChip },
    ]);
  }, [phase, bets, selectedChip]);

  const undoBet = useCallback(() => {
    setBetSnapshots((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      setBets(next.pop() ?? []);
      return next;
    });
  }, []);

  const clearBets = useCallback(() => {
    setBetSnapshots((prev) => [...prev, bets]);
    setBets([]);
  }, [bets]);

  const doubleBets = useCallback(() => {
    if (!bets.length || phase !== 'BETTING') return;
    setBetSnapshots((prev) => [...prev, bets]);
    setBets((prev) => prev.map((b) => ({ ...b, amount: b.amount * 2 })));
  }, [bets, phase]);

  const removeBet = useCallback((key) => {
    setBets((prev) => {
      const idx = [...prev].reverse().findIndex((b) => b.key === key);
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== prev.length - 1 - idx);
    });
  }, []);

  // ── Ticket Actions ──

  const submitTicket = useCallback(async () => {
    if (phase !== 'BETTING' || totalStake <= 0 || !cashierId) return null;

    const draw = currentDraw ?? await dbFetchCurrentDraw();
    if (!draw) {
      alert("No active draw found. Please wait.");
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('process_roulette_bet', {
        p_cashier_id:       cashierId,
        p_terminal_id:      terminalId,
        p_draw_id:          draw.id,
        p_bets:             betMap,
        p_stake:            totalStake,
        p_potential_payout: maxTotalWin
      });

      if (error) throw error;

      // Fetch full ticket
      const { data: ticket, error: fetchErr } = await supabase
        .from('rtickets')
        .select('*')
        .eq('id', data.ticket_id)
        .single();
      
      if (fetchErr) throw fetchErr;

      setSessionTickets((prev) => [ticket, ...prev]);
      setBets([]);
      setBetSnapshots([]);
      setPending(ticket.id);
      
      return ticket;
    } catch (e) {
      alert(`Bet Failed: ${e.message}`);
      return null;
    }
  }, [phase, totalStake, cashierId, betMap, maxTotalWin, terminalId, currentDraw]);

  const cancelTicket = useCallback(async (ticketId) => {
    if (!cashierId || !ticketId) return;
    try {
      const { data, error } = await supabase.rpc('cancel_roulette_ticket', {
        p_ticket_id: ticketId,
        p_cashier_id: cashierId
      });
      if (error) throw error;

      setSessionTickets((prev) =>
        prev.map((t) => t.id === ticketId ? { ...t, status: 'cancelled' } : t)
      );
      
      alert(`Ticket Cancelled. Refunded: KSh ${data.refund_amount}`);
    } catch (e) {
      alert(`Cancel Error: ${e.message}`);
    }
  }, [cashierId]);

  const markPaid = useCallback(async (ticketId) => {
    if (!cashierId || !ticketId) return;
    try {
      const { data, error } = await supabase.rpc('execute_roulette_payout', {
        p_ticket_id: ticketId,
        p_cashier_id: cashierId
      });
      if (error) throw error;

      setSessionTickets((prev) =>
        prev.map((t) => t.id === ticketId ? { ...t, status: 'paid', paid_at: new Date().toISOString() } : t)
      );
      
      alert(`Payout Successful: KSh ${data.amount}`);
    } catch (e) {
      alert(`Payout Error: ${e.message}`);
    }
  }, [cashierId]);

  const startNextRound = useCallback(() => {
    setPhase('BETTING');
    setLastResult(null);
    dbFetchCurrentDraw().then((draw) => { if (draw) setCurrentDraw(draw); });
  }, []);

  return {
    cashierId,
    bets, betMap, betEntries, totalStake, maxTotalWin,
    selectedChip, setSelectedChip,
    placeBet, undoBet, clearBets, doubleBets, removeBet,
    phase, currentDraw,
    submitTicket, cancelTicket, markPaid, startNextRound,
    lastResult, resultHistory, jackpot,
    sessionTickets, lastTicket,
    winsBet, getPayout, calculatePayout, groupedBets,
    supabase,
  };
}

export default useCashierRoulette;
