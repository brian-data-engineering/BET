import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, Coins, ReceiptText } from 'lucide-react';

export default function UnifiedTerminal() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [activeTicketId, setActiveTicketId] = useState(null); // Track if we are editing an existing booking
  const [currentTicket, setCurrentTicket] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [foundTicket, setFoundTicket] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { fetchMatches(); }, []);

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').eq('status', 'open');
    setMatches(data || []);
  };

  // --- SMART SEARCH: HANDLES BOTH BOOKINGS AND PAYOUTS ---
  const handleValidate = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setFoundTicket(null);
    const cleanCode = searchQuery.trim().toUpperCase();

    const { data: ticket, error } = await supabase
      .from('betsnow')
      .select('*')
      .eq('booking_code', cleanCode)
      .single();

    if (error || !ticket) {
      alert("CODE NOT FOUND");
      setIsSearching(false);
      return;
    }

    // CASE 1: UNPAID BOOKING (Stake is 0 or it's just created)
    if (parseFloat(ticket.stake) === 0 && !ticket.is_paid) {
      setCart(ticket.selections);
      setActiveTicketId(ticket.id); // Store ID to update later
      setSearchQuery('');
      alert("BOOKING LOADED: Ready for payment.");
    } 
    // CASE 2: WINNING TICKET READY FOR PAYOUT
    else if (ticket.status === 'won' && !ticket.is_paid) {
      setFoundTicket(ticket);
    } 
    // CASE 3: ALREADY PAID
    else if (ticket.is_paid) {
      alert(`ALREADY PAID on ${new Date(ticket.paid_at).toLocaleDateString()}`);
    } 
    else {
      alert("TICKET STATUS: " + ticket.status.toUpperCase());
    }
    setIsSearching(false);
  };

  const processPayout = async () => {
    const { error } = await supabase
      .from('betsnow')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('id', foundTicket.id);

    if (!error) {
      alert("CASH PAID OUT");
      setFoundTicket(null);
      setSearchQuery('');
    }
  };

  // --- ACTIVATE BOOKING & PRINT ---
  const handlePrintBet = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    const totalOdds = cart.reduce((acc, item) => acc * item.odds, 1);
    const payout = totalOdds * stake;

    const finalData = {
      selections: cart,
      stake: parseFloat(stake),
      total_odds: parseFloat(totalOdds.toFixed(2)),
      potential_payout: parseFloat(payout.toFixed(2)),
      cashier_id: user?.id,
      status: 'pending',
      is_paid: false
    };

    let error;
    if (activeTicketId) {
      // Update the existing booking
      const { error: updateError } = await supabase
        .from('betsnow')
        .update(finalData)
        .eq('id', activeTicketId);
      error = updateError;
    } else {
      // Fresh walk-in bet (No booking code)
      const bCode = 'BK-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const { error: insertError } = await supabase
        .from('betsnow')
        .insert([{ ...finalData, booking_code: bCode }]);
      error = insertError;
    }

    if (!error) {
      setCurrentTicket({ ...finalData, booking_code: searchQuery || 'NEW' });
      setTimeout(() => {
        window.print();
        setCart([]);
        setActiveTicketId(null);
        setCurrentTicket(null);
        setIsProcessing(false);
      }, 500);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white">
        <div className="flex-1 p-6 overflow-y-auto border-r border-white/5">
          
          {/* SEARCH BAR */}
          <div className="bg-[#111926] p-4 rounded-[2rem] border border-white/5 mb-8 flex items-center gap-4">
            <ReceiptText className="text-[#10b981] ml-2" size={20} />
            <input 
              placeholder="ENTER CODE (4721...)" 
              className="bg-transparent flex-1 outline-none font-black uppercase tracking-widest text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            />
            <button onClick={handleValidate} className="bg-[#10b981] text-black px-6 py-2 rounded-xl font-black text-xs italic">
              {isSearching ? <Loader2 className="animate-spin" size={16} /> : "PROCESS"}
            </button>
          </div>

          {foundTicket ? (
            /* PAYOUT CARD */
            <div className="bg-[#10b981] text-black rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
               <h2 className="text-4xl font-black italic mb-6">{foundTicket.booking_code}</h2>
               <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-black/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase">Win Amount</p>
                    <p className="text-2xl font-black italic">KES {foundTicket.potential_payout}</p>
                 </div>
               </div>
               <button onClick={processPayout} className="w-full bg-black text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3">
                 <Coins size={20} /> PAY CUSTOMER
               </button>
               <button onClick={() => setFoundTicket(null)} className="w-full mt-4 text-xs font-black uppercase opacity-60">Cancel</button>
            </div>
          ) : (
            /* GAMES LIST */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {matches.map(m => (
                <MatchCard key={m.id} match={m} onSelect={(match, selection, odd) => {
                  if(!cart.find(i => i.matchId === m.id)) {
                    setCart([...cart, { matchId: m.id, matchName: `${m.home_team} vs ${m.away_team}`, selection, odds: parseFloat(odd) }]);
                  }
                }} />
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR SLIP */}
        <div className="w-[400px] bg-[#111926]/50 p-6">
          <BetSlip 
            cart={cart} 
            onRemove={(id) => setCart(cart.filter(i => i.matchId !== id))} 
            stake={stake} 
            setStake={setStake} 
            onPrint={handlePrintBet} 
            isProcessing={isProcessing}
          />
        </div>
      </div>
      <div className="hidden print:block"><PrintableTicket ticket={currentTicket} /></div>
    </CashierLayout>
  );
}
