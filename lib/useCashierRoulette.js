/**
 * lib/useCashierRoulette.js
 *
 * Supabase tables used:
 *   READ-ONLY  : spin_draws, spin_history_200, spin_wheel_config
 *   READ-WRITE : roulettetickets, roulettepayouts, ledger (via RPCs)
 *
 * RPCs called:
 *   process_roulette_payment(p_cashier_id, p_terminal_id, p_draw_id,
 *                             p_bets, p_bets_map, p_stake)
 *     → deducts profiles.balance, writes roulettetickets + ledger debit
 *     → returns { ticket_id, serial, new_balance }
 *
 *   execute_roulette_payout(p_payout_id, p_ticket_id, p_cashier_id, p_amount)
 *     → credits profiles.balance, marks roulettepayouts.paid, writes ledger credit
 *     → mirrors execute_lucra_payout exactly
 *
 * Realtime:
 *   spin_draws     → UPDATE fires resolveRound() automatically when wheel lands
 *   spin_history_200 → INSERT keeps result strip live
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL   ?? import.meta.env?.VITE_SUPABASE_URL   ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env?.VITE_SUPABASE_ANON_KEY ?? '',
);

// ── Pure helpers (mirror CashierSpin exactly) ─────────────────────────────────

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

async function dbUpdateTicket(id, fields) {
  const { error } = await supabase.from('roulettetickets').update(fields).eq('id', id);
  if (error) throw error;
}

async function dbFetchTickets() {
  const { data, error } = await supabase
    .from('roulettetickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

async function dbInsertPayout(payout) {
  const { data, error } = await supabase
    .from('roulettepayouts').insert(payout).select().single();
  if (error) throw error;
  return data;
}

async function dbFetchPayoutForTicket(ticketId) {
  const { data, error } = await supabase
    .from('roulettepayouts').select('*').eq('ticket_id', ticketId).maybeSingle();
  if (error) throw error;
  return data;
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
  const [pendingBets, setPendingBets] = useState([]);

  // Draw
  const [currentDraw, setCurrentDraw] = useState(null);

  // Results
  const [lastResult, setLastResult]       = useState(null);
  const [resultHistory, setResultHistory] = useState([]);
  const [jackpot, setJackpot]             = useState(89);

  // Tickets & payouts
  const [sessionTickets, setSessionTickets] = useState([]);
  const [lastPayout, setLastPayout]         = useState(null);

  // Derived
  const betMap      = useMemo(() => groupedBets(bets), [bets]);
  const betEntries  = useMemo(() => Object.values(betMap), [betMap]);
  const totalStake  = useMemo(() => betEntries.reduce((s, b) => s + b.amount, 0), [betEntries]);
  const maxTotalWin = useMemo(() => betEntries.reduce((s, b) => s + getPayout(b), 0), [betEntries]);

  // Stable refs so Realtime callback sees latest without re-subscribing
  const refs = useMemo(() => ({ pendingTicketId: null, pendingBets: [] }), []);
  useEffect(() => { refs.pendingTicketId = pendingTicketId; }, [pendingTicketId]);
  useEffect(() => { refs.pendingBets     = pendingBets;     }, [pendingBets]);

  // ── resolveRound ──────────────────────────────────────────────────────────
  // Called by Realtime when spin_draws row gets winning_number set.
  // Writes roulettepayouts, does NOT call execute_roulette_payout yet —
  // that RPC is called only when cashier physically clicks pay (markPaid).
  const resolveRound = useCallback(async (winningNumber, drawId) => {
    const ticketId   = refs.pendingTicketId;
    const ticketBets = refs.pendingBets;
    if (!ticketId) return null;

    const { grossWin, winningBets, winningLabels, totalStake: stake } =
      calculatePayout(ticketBets, winningNumber);

    const status = grossWin > 0 ? 'WON' : 'LOST';

    try {
      // Update roulettetickets status + link draw_id
      await dbUpdateTicket(ticketId, { status, draw_id: drawId });

      // Write roulettepayouts row (paid=false until cashier clicks pay)
      const payout = await dbInsertPayout({
        ticket_id:      ticketId,
        draw_id:        drawId,
        winning_number: winningNumber,
        winning_bets:   winningBets,
        winning_labels: winningLabels,
        gross_win:      grossWin,
        total_stake:    stake,
        amount:         grossWin,
        paid:           false,
        paid_at:        null,
      });

      setLastPayout(payout);
      setLastResult({ winningNumber, payout: grossWin, wins: winningLabels });
      setResultHistory((prev) => [winningNumber, ...prev].slice(0, 200));
      setJackpot((prev) => prev + Math.max(1, Math.round(stake * 0.01)));
      setSessionTickets((prev) =>
        prev.map((t) => t.id === ticketId ? { ...t, status, draw_id: drawId } : t)
      );

      setBets([]);
      setBetSnapshots([]);
      setPendingBets([]);
      setPending(null);
      setPhase('RESULT');

      return payout;
    } catch (e) {
      console.error('[useCashierRoulette] resolveRound error', e);
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    dbFetchHistory().then((rows) => setResultHistory(rows.map((r) => r.num)));
    dbFetchCurrentDraw().then((draw) => { if (draw) setCurrentDraw(draw); });
  }, []);

  useEffect(() => {
    if (!cashierId) return;
    dbFetchTickets().then(setSessionTickets);
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
          // If this is the draw we're waiting on and it just got a result
          if (refs.pendingTicketId && row.winning_number != null && row.status === 'closed') {
            resolveRound(row.winning_number, row.id);
          }
          // Refresh current draw pointer
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

  // ── Betting actions ───────────────────────────────────────────────────────
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

  // ── submitTicket — calls process_roulette_payment RPC ────────────────────
  // Deducts balance + ledger debit atomically server-side.
  // Stamps serial/shop_name/logo_url on the ticket.
  // Does NOT touch the print table.
  const submitTicket = useCallback(async () => {
    if (phase !== 'BETTING' || totalStake <= 0 || !cashierId) return null;

    const draw         = currentDraw ?? await dbFetchCurrentDraw();
    const betsSnapshot = [...bets];
    const mapSnapshot  = groupedBets(betsSnapshot);

    try {
      const { data, error } = await supabase.rpc('process_roulette_payment', {
        p_cashier_id:  cashierId,
        p_terminal_id: terminalId,
        p_draw_id:     draw?.id ?? null,
        p_bets:        betsSnapshot,
        p_bets_map:    mapSnapshot,
        p_stake:       totalStake,
      });

      if (error) throw error;

      // Fetch full ticket row — has serial + branding stamped by RPC
      const { data: ticket, error: fetchErr } = await supabase
        .from('roulettetickets')
        .select('*')
        .eq('id', data.ticket_id)
        .single();
      if (fetchErr) throw fetchErr;

      setSessionTickets((prev) => [ticket, ...prev]);
      setPending(ticket.id);
      setPendingBets(betsSnapshot);
      setCurrentDraw(draw);
      setPhase('SPINNING');

      return ticket.id;
    } catch (e) {
      console.error('[useCashierRoulette] submitTicket error', e);
      alert(`Roulette Error: ${e.message}`);
      return null;
    }
  }, [phase, totalStake, cashierId, bets, terminalId, currentDraw]);

  // ── markPaid — calls execute_roulette_payout RPC ─────────────────────────
  // Credits cashier balance + ledger credit. Mirrors execute_lucra_payout.
  // Call this when cashier physically hands cash to the player.
  const markPaid = useCallback(async (payoutId, ticketId, amount) => {
    if (!cashierId) return;
    try {
      const { data, error } = await supabase.rpc('execute_roulette_payout', {
        p_payout_id:  payoutId,
        p_ticket_id:  ticketId,
        p_cashier_id: cashierId,
        p_amount:     amount,
      });
      if (error) throw error;

      setLastPayout((prev) =>
        prev?.id === payoutId
          ? { ...prev, paid: true, paid_at: new Date().toISOString(), paid_by: cashierId }
          : prev
      );

      return data;
    } catch (e) {
      console.error('[useCashierRoulette] markPaid error', e);
      alert(`Payout Error: ${e.message}`);
    }
  }, [cashierId]);

  const startNextRound = useCallback(() => {
    setPhase('BETTING');
    setLastResult(null);
    setLastPayout(null);
    dbFetchCurrentDraw().then((draw) => { if (draw) setCurrentDraw(draw); });
  }, []);

  const getPayoutForTicket = useCallback(
    (ticketId) => dbFetchPayoutForTicket(ticketId),
    [],
  );

  return {
    cashierId,
    bets, betMap, betEntries, totalStake, maxTotalWin,
    selectedChip, setSelectedChip,
    placeBet, undoBet, clearBets, doubleBets, removeBet,
    phase, currentDraw,
    submitTicket, resolveRound, startNextRound,
    lastResult, resultHistory, jackpot,
    pendingTicketId, sessionTickets, lastPayout,
    markPaid, getPayoutForTicket,
    winsBet, getPayout, calculatePayout, groupedBets,
    supabase,
  };
}

export default useCashierRoulette;
