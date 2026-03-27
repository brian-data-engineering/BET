import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Search, Zap, Loader2, CheckCircle2, Coins, ShieldAlert, ReceiptText } from 'lucide-react';

export default function UnifiedTerminal() {
  // --- STATE FOR BETTING ---
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [bookingInput, setBookingInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);

  // --- STATE FOR VALIDATION/PAYOUT ---
  const [searchQuery, setSearchQuery] = useState('');
  const [foundTicket, setFoundTicket] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').eq('status', 'open').order('commence_time', { ascending: true });
    setMatches(data || []);
  };

  // --- LOGIC: VALIDATE & PAYOUT ---
  const handleValidate = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setFoundTicket(null);
    
    const { data } = await supabase
      .from('betsnow')
      .select('*')
      .eq('booking_code', searchQuery.trim().toUpperCase())
      .single();

    if (data) setFoundTicket(data);
    else alert("TICKET NOT FOUND");
    setIsSearching(false);
  };

  const processPayout = async () => {
    if (!foundTicket || foundTicket.status !== 'won' || foundTicket.is_paid) return;
    
    const { error } = await supabase
      .from('betsnow')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('id', foundTicket.id);

    if (!error) {
      alert("CASH DISBURSED SUCCESSFULLY");
      setFoundTicket({ ...foundTicket, is_paid: true });
      setSearchQuery('');
    }
  };

  // --- LOGIC: CREATE NEW BET ---
  const handlePrintBet = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    
    const bCode = 'BK-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const totalOdds = cart.reduce((acc, item) => acc * item.odds, 1);
    const payout = totalOdds * stake;

    const ticketData = {
      booking_code: bCode,
      cashier_id: (await supabase.auth.getUser()).data.user.id,
      selections: cart,
      stake: parseFloat(stake),
      total_odds: parseFloat(totalOdds.toFixed(2)),
      potential_payout: parseFloat(payout.toFixed(2)),
      status: 'pending'
    };

    const { error } = await supabase.from('betsnow').insert([ticketData]);

    if (!error) {
      setCurrentTicket(ticketData);
      setTimeout(() => {
        window.print();
        setCart([]);
        setCurrentTicket(null);
        setIsProcessing(false);
      }, 500);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0b0f1a] text-white">
        
        {/* LEFT: VALIDATION & MATCH FEED */}
        <div className="flex-1 p-6 overflow-y-auto border-r border-white/5">
          
          {/* TOP BAR: QUICK VALIDATE */}
          <div className="bg-[#111926] p-4 rounded-[2rem] border border-white/5 mb-8 flex items-center gap-4 shadow-2xl">
            <div className="bg-[#10b981]/10 p-3 rounded-xl">
               <ReceiptText className="text-[#10b981]" size={20} />
            </div>
            <input 
              placeholder="SCAN OR ENTER CODE TO PAY OUT..." 
              className="bg-transparent flex-1 outline-none font-black italic uppercase tracking-widest text-sm placeholder:text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            />
            <button onClick={handleValidate} className="bg-[#10b981] text-black px-6 py-2 rounded-xl font-black text-xs uppercase italic hover:bg-white transition-all">
              {isSearching ? <Loader2 className="animate-spin" size={16} /> : "Verify Ticket"}
            </button>
          </div>

          {/* DYNAMIC CONTENT: FOUND TICKET OR MATCH FEED */}
          {foundTicket ? (
            <div className="bg-[#10b981] text-black rounded-[2.5rem] p-8 mb-8 animate-in zoom-in-95 relative overflow-hidden">
               <button onClick={() => setFoundTicket(null)} className="absolute top-6 right-6 font-black uppercase text-[10px] border-2 border-black/20 px-3 py-1 rounded-full">Close X</button>
               <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 italic">Ticket Found</p>
               <h2 className="text-4xl font-black italic tracking-tighter mb-6">{foundTicket.booking_code}</h2>
               
               <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-black/5 p-4 rounded-2xl">
                    <p className="text-[8px] font-black uppercase mb-1">Status</p>
                    <p className="text-xl font-black uppercase italic">{foundTicket.status}</p>
                 </div>
                 <div className="bg-black/5 p-4 rounded-2xl">
                    <p className="text-[8px] font-black uppercase mb-1">Payout</p>
                    <p className="text-xl font-black italic tracking-tighter">KES {foundTicket.potential_payout}</p>
                 </div>
               </div>

               {foundTicket.status === 'won' && !foundTicket.is_paid ? (
                 <button onClick={processPayout} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 shadow-2xl">
                   <Coins size={20} /> Confirm Cash Payout
                 </button>
               ) : (
                 <div className="w-full bg-black/10 py-5 rounded-2xl text-center font-black uppercase text-xs italic">
                    {foundTicket.is_paid ? "Already Disbursed" : "Not a Winner"}
                 </div>
               )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {matches.map(m => (
                <MatchCard key={m.id} match={m} onSelect={(match, selection, odd) => {
                  if(!cart.find(i => i.matchId === match.id)) {
                    setCart([...cart, { matchId: match.id, matchName: `${match.home_team} vs ${match.away_team}`, selection, odds: parseFloat(odd) }]);
                  }
                }} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: ACTIVE SLIP */}
        <div className="w-[400px] bg-[#111926]/50 p-6 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <BetSlip 
              cart={cart} 
              onRemove={(id) => setCart(cart.filter(i => i.matchId !== id))} 
              stake={stake} 
              setStake={setStake} 
              onPrint={handlePrintBet} 
            />
          </div>
        </div>
      </div>

      <div className="hidden print:block">
        <PrintableTicket ticket={currentTicket} />
      </div>
    </CashierLayout>
  );
}
