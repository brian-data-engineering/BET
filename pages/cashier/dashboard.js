import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, ReceiptText, Wallet } from 'lucide-react';

export default function UnifiedTerminal() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [cashierBalance, setCashierBalance] = useState(0); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCashierData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { 
    const fetchMatches = async () => {
      const { data } = await supabase.from('matches').select('*').eq('status', 'open');
      setMatches(data || []);
    };
    fetchMatches();
    fetchCashierData();
  }, [fetchCashierData]);

  // 1. IMPROVED LOADING LOGIC
  const handleLoadBooking = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const cleanCode = searchQuery.trim().toUpperCase();

    try {
      // We look for the ticket. Note: We removed the .is('ticket_serial', null) 
      // check temporarily to see if it exists at all
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .eq('booking_code', cleanCode)
        .single();

      if (error || !ticket) {
        alert("⚠️ BOOKING CODE NOT FOUND");
      } else if (ticket.booking_code === 'PAID' || ticket.ticket_serial) {
        // If it's already paid, we load it into the "Printable" view immediately
        alert("✅ THIS TICKET IS ALREADY PAID. PREPARING REPRINT...");
        setCurrentTicket(ticket);
        setTimeout(() => window.print(), 500);
      } else {
        // SUCCESS: Load into the cart for the cashier to finalize
        setCart(ticket.selections || []);
        setActiveTicketId(ticket.id);
        setStake(ticket.stake || 100); 
        setSearchQuery(''); 
      }
    } catch (err) {
      console.error("Booking load error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // 2. ATOMIC PRINT & DEDUCT (The "Place Bet" Action)
  const handlePrintBet = async () => {
    if (cart.length === 0 || !stake || stake <= 0) return;
    if (cashierBalance < stake) {
      alert("INSUFFICIENT FLOAT BALANCE");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const betStake = parseFloat(stake);
      const serial = `LCR-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
      const totalOdds = cart.reduce((acc, item) => acc * (item.odds || 1), 1);

      // Execute RPC
      const { data, error: rpcError } = await supabase.rpc('place_and_deduct_bet', {
        p_ticket_id: activeTicketId, 
        p_cashier_id: user.id,
        p_stake: betStake,
        p_selections: cart,
        p_odds: parseFloat(totalOdds.toFixed(2)),
        p_payout: parseFloat((totalOdds * betStake).toFixed(2)),
        p_serial: serial
      });

      if (rpcError) throw new Error(rpcError.message);

      // Success UI Flow
      setCashierBalance(prev => prev - betStake);
      setCurrentTicket(data || { ...cart, ticket_serial: serial, stake: betStake }); 
      
      setTimeout(() => {
        window.print();
        setCart([]);
        setActiveTicketId(null);
        setIsProcessing(false);
        fetchCashierData();
      }, 500);

    } catch (err) {
      alert(`SYSTEM ERROR: ${err.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden font-sans">
        <div className="flex-1 p-6 overflow-y-auto border-r border-white/5">
          
          {/* SEARCH BAR */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 bg-[#111926] p-4 rounded-[2rem] border border-white/5 flex items-center gap-4">
              <ReceiptText className="text-[#10b981] ml-2" size={20} />
              <input 
                placeholder="ENTER BOOKING CODE (e.g. 1165)..." 
                className="bg-transparent flex-1 outline-none font-black uppercase tracking-widest text-sm text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadBooking()}
              />
              <button 
                onClick={handleLoadBooking} 
                disabled={isSearching} 
                className="bg-[#10b981] text-black px-8 py-2 rounded-xl font-black text-xs italic hover:scale-105"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD TICKET"}
              </button>
            </div>

            {/* BALANCE DISPLAY */}
            <div className="bg-[#10b981] px-10 py-4 rounded-[2rem] flex items-center gap-4 text-black border-4 border-black/10">
              <Wallet size={24} />
              <div>
                <p className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">Available Float</p>
                <p className="text-2xl font-black italic leading-none">KES {cashierBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* MATCH SELECTION AREA */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {matches.map(m => (
              <MatchCard 
                key={m.id} 
                match={m} 
                onSelect={(match, selection, odd) => {
                  if(!cart.find(i => i.matchId === m.id)) {
                    setCart([...cart, { 
                      matchId: m.id, 
                      matchName: `${m.home_team} vs ${m.away_team}`, 
                      selection, 
                      odds: parseFloat(odd) 
                    }]);
                  }
                }} 
              />
            ))}
          </div>
        </div>

        {/* SIDEBAR: THIS IS WHERE THE PRINT BUTTON IS */}
        <div className="w-[420px] bg-[#111926]/50 p-6 flex flex-col border-l border-white/5">
            <h2 className="text-[#10b981] font-black italic mb-4 tracking-tighter text-xl">BETSLIP</h2>
          <BetSlip 
            cart={cart} 
            onRemove={(id) => setCart(cart.filter(i => i.matchId !== id))} 
            stake={stake} 
            setStake={setStake} 
            onPrint={handlePrintBet} 
            isProcessing={isProcessing} 
            insufficient={cashierBalance < stake}
          />
          {cart.length > 0 && (
            <p className="text-[10px] text-center mt-4 text-white/40 font-bold uppercase">
                Confirm selections then click print receipt
            </p>
          )}
        </div>
      </div>

      {/* HIDDEN PRINT VIEW */}
      <div className="hidden print:block">
        <PrintableTicket ticket={currentTicket} />
      </div>
    </CashierLayout>
  );
}
