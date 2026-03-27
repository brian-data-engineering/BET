import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, ReceiptText, Wallet, History } from 'lucide-react';

export default function UnifiedTerminal() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [cashierBalance, setCashierBalance] = useState(0); 
  const [recentBets, setRecentBets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { 
    fetchMatches();
    fetchCashierData();
  }, []);

  const fetchCashierData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (profile) setCashierBalance(parseFloat(profile.balance));

    const { data: bets } = await supabase.from('betsnow')
      .select('*').eq('cashier_id', user.id)
      .order('created_at', { ascending: false }).limit(5);
    setRecentBets(bets || []);
  };

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').eq('status', 'open');
    setMatches(data || []);
  };

  const handleLoadBooking = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const cleanCode = searchQuery.trim().toUpperCase();

    const { data: ticket, error } = await supabase.from('betsnow')
      .select('*').eq('booking_code', cleanCode).single();

    if (error || !ticket) {
      alert("BOOKING CODE NOT FOUND");
    } else if (parseFloat(ticket.stake) > 0) {
      alert("THIS IS ALREADY A PLACED TICKET. USE TICKET MANAGER TO PAY OUT.");
    } else {
      setCart(ticket.selections);
      setActiveTicketId(ticket.id);
      setSearchQuery('');
    }
    setIsSearching(false);
  };

  const handlePrintBet = async () => {
    if (cart.length === 0 || !stake || stake <= 0) return;
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Fresh balance check
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    const currentBal = parseFloat(profile?.balance || 0);
    const betStake = parseFloat(stake);

    if (currentBal < betStake) {
      alert("INSUFFICIENT FLOAT");
      setIsProcessing(false);
      return;
    }

    const totalOdds = cart.reduce((acc, item) => acc * (item.odds || 1), 1);
    const payout = totalOdds * betStake;

    const finalData = {
      selections: cart,
      stake: betStake,
      total_odds: parseFloat(totalOdds.toFixed(2)),
      potential_payout: parseFloat(payout.toFixed(2)),
      cashier_id: user?.id,
      status: 'pending',
      is_paid: false,
      booking_code: 'PAID' // Mark as used
    };

    // Atomic Deduction
    const { data: updated, error: balErr } = await supabase.from('profiles')
      .update({ balance: currentBal - betStake }).eq('id', user.id).gte('balance', betStake).select().single();

    if (balErr || !updated) {
      alert("TRANSACTION REJECTED");
      setIsProcessing(false);
      return;
    }

    // Convert Booking to Ticket or Create New
    let result;
    if (activeTicketId) {
      result = await supabase.from('betsnow').update(finalData).eq('id', activeTicketId).select().single();
    } else {
      result = await supabase.from('betsnow').insert([finalData]).select().single();
    }

    if (!result.error) {
      setCashierBalance(updated.balance);
      setCurrentTicket(result.data);
      setTimeout(() => {
        window.print();
        setCart([]);
        setActiveTicketId(null);
        setIsProcessing(false);
        fetchCashierData();
      }, 500);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto border-r border-white/5 custom-scrollbar">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 bg-[#111926] p-4 rounded-[2rem] border border-white/5 flex items-center gap-4">
              <ReceiptText className="text-[#10b981] ml-2" size={20} />
              <input 
                placeholder="LOAD 5-DIGIT BOOKING CODE..." 
                className="bg-transparent flex-1 outline-none font-black uppercase tracking-widest text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadBooking()}
              />
              <button onClick={handleLoadBooking} className="bg-[#10b981] text-black px-8 py-2 rounded-xl font-black text-xs italic">
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>
            <div className="bg-[#10b981] px-10 py-4 rounded-[2rem] flex items-center gap-4 text-black shadow-2xl">
              <Wallet size={24} />
              <div>
                <p className="text-[10px] font-black uppercase opacity-60">Float</p>
                <p className="text-2xl font-black italic">KES {cashierBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {matches.map(m => (
              <MatchCard key={m.id} match={m} onSelect={(match, selection, odd) => {
                if(!cart.find(i => i.matchId === m.id)) {
                  setCart([...cart, { matchId: m.id, matchName: `${m.home_team} vs ${m.away_team}`, selection, odds: parseFloat(odd) }]);
                }
              }} />
            ))}
          </div>
        </div>
        <div className="w-[420px] bg-[#111926]/50 p-6 flex flex-col">
          <BetSlip cart={cart} onRemove={(id) => setCart(cart.filter(i => i.matchId !== id))} stake={stake} setStake={setStake} onPrint={handlePrintBet} isProcessing={isProcessing} />
        </div>
      </div>
      <div className="hidden print:block"><PrintableTicket ticket={currentTicket} /></div>
    </CashierLayout>
  );
}
