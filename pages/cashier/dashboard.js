import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, ReceiptText, Wallet, Printer } from 'lucide-react';

export default function UnifiedTerminal() {
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(0);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [cashierBalance, setCashierBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Cashier Balance
  const fetchCashierData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { fetchCashierData(); }, [fetchCashierData]);

  // 2. LOAD BOOKING CODE: This is the core fix
  const handleLoadBooking = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const cleanCode = searchQuery.trim().toUpperCase();

    try {
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .eq('booking_code', cleanCode)
        .is('ticket_serial', null) // Ensure it hasn't been printed/paid yet
        .single();

      if (error || !ticket) {
        alert("⚠️ CODE NOT FOUND OR ALREADY PAID");
        return;
      }

      // Populate everything from the booking immediately
      setCart(ticket.selections || []);
      setStake(ticket.stake || 0);
      setActiveTicketId(ticket.id);
      
      // Clear the search box so the cashier knows it worked
      setSearchQuery(''); 
      console.log("Ticket Loaded:", ticket.id);

    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. FINAL PRINT & DEDUCT
  const handlePrintBet = async () => {
    if (!activeTicketId || cart.length === 0) {
        alert("PLEASE LOAD A VALID BOOKING FIRST");
        return;
    }
    if (cashierBalance < stake) {
      alert("⚠️ INSUFFICIENT FLOAT");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const serial = `LCR-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
      const totalOdds = cart.reduce((acc, item) => acc * (item.odds || 1), 1);

      // CALL YOUR DATABASE FUNCTION
      const { data, error: rpcError } = await supabase.rpc('place_and_deduct_bet', {
        p_ticket_id: activeTicketId,
        p_cashier_id: user.id,
        p_stake: parseFloat(stake),
        p_selections: cart,
        p_odds: parseFloat(totalOdds.toFixed(2)),
        p_payout: parseFloat((totalOdds * stake).toFixed(2)),
        p_serial: serial
      });

      if (rpcError) throw rpcError;

      setCurrentTicket(data);
      
      // TRIGGER PHYSICAL PRINT
      setTimeout(() => {
        window.print();
        // RESET FOR NEXT CUSTOMER
        setCart([]);
        setStake(0);
        setActiveTicketId(null);
        setIsProcessing(false);
        fetchCashierData();
      }, 300);

    } catch (err) {
      alert("ERROR: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden">
        
        {/* LEFT SIDE: SEARCH & PREVIEW */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-2xl bg-[#111926] p-8 rounded-[3rem] border border-white/10 shadow-2xl">
            <h1 className="text-[#10b981] font-black italic text-3xl mb-6 tracking-tighter text-center">LUCRA TERMINAL</h1>
            
            <div className="relative flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 focus-within:border-[#10b981] transition-all">
              <ReceiptText className="text-[#10b981]" size={32} />
              <input 
                className="bg-transparent flex-1 text-2xl font-black uppercase tracking-widest outline-none"
                placeholder="ENTER BOOKING CODE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadBooking()}
              />
              <button 
                onClick={handleLoadBooking}
                disabled={isSearching}
                className="bg-[#10b981] text-black px-10 py-4 rounded-xl font-black italic hover:scale-105 active:scale-95 transition-all"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            {/* QUICK PREVIEW OF LOADED TICKET */}
            {activeTicketId && (
              <div className="mt-10 p-6 bg-white/5 rounded-2xl border border-[#10b981]/20 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-[#10b981] uppercase">Ticket Loaded</p>
                        <p className="text-xl font-black tracking-tighter">KES {stake.toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-bold opacity-50 uppercase">{cart.length} Selections</p>
                </div>
                <button 
                  onClick={handlePrintBet}
                  disabled={isProcessing}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-black py-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <><Printer size={32}/> PRINT RECEIPT</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: STATUS & FLOAT */}
        <div className="w-[400px] p-8 flex flex-col gap-6 bg-[#111926]/30">
            <div className="bg-[#10b981] p-6 rounded-[2rem] text-black">
                <p className="text-xs font-black uppercase opacity-60">Float Balance</p>
                <p className="text-3xl font-black italic">KES {cashierBalance.toLocaleString()}</p>
            </div>

            <div className="flex-1 bg-black/20 rounded-[2rem] p-6 border border-white/5
