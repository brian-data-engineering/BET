import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, Coins, ReceiptText, Wallet, History } from 'lucide-react';

export default function UnifiedTerminal() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [cashierBalance, setCashierBalance] = useState(0); 
  const [recentBets, setRecentBets] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [foundTicket, setFoundTicket] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { 
    fetchMatches();
    fetchCashierData();
  }, []);

  const fetchCashierData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch Balance
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (profile) setCashierBalance(parseFloat(profile.balance));

    // Fetch Last 5 Bets for History
    const { data: bets } = await supabase
      .from('betsnow')
      .select('*')
      .eq('cashier_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentBets(bets || []);
  };

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').eq('status', 'open');
    setMatches(data || []);
  };

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

    if (parseFloat(ticket.stake) === 0 && !ticket.is_paid) {
      setCart(ticket.selections);
      setActiveTicketId(ticket.id);
      setSearchQuery('');
    } 
    else if (ticket.status === 'won' && !ticket.is_paid) {
      setFoundTicket(ticket);
    } 
    else if (ticket.is_paid) {
      alert(`ALREADY PAID on ${new Date(ticket.paid_at).toLocaleDateString()}`);
    } 
    else {
      alert("TICKET STATUS: " + ticket.status.toUpperCase());
    }
    setIsSearching(false);
  };

  const processPayout = async () => {
    if (!foundTicket) return;
    setIsProcessing(true);

    const payoutAmount = parseFloat(foundTicket.potential_payout);
    const newBalance = cashierBalance + payoutAmount;

    const { data: { user } } = await supabase.auth.getUser();
    
    // Update Wallet
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (!profileError) {
      await supabase
        .from('betsnow')
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq('id', foundTicket.id);

      setCashierBalance(newBalance);
      setFoundTicket(null);
      setSearchQuery('');
      fetchCashierData(); // Refresh history
      alert(`REDEEMED: KES ${payoutAmount.toLocaleString()} added to terminal.`);
    }
    setIsProcessing(false);
  };

  const handlePrintBet = async () => {
    if (cart.length === 0 || stake <= 0) return;
    
    if (cashierBalance < parseFloat(stake)) {
      alert("INSUFFICIENT TERMINAL BALANCE. Contact Operator WAZIRI.");
      return;
    }

    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const totalOdds = cart.reduce((acc, item) => acc * (item.odds || 1), 1);
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

    // 1. Deduct Credit
    const newBalance = cashierBalance - parseFloat(stake);
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (balanceError) {
      alert("WALLET ERROR");
      setIsProcessing(false);
      return;
    }

    let error;
    let bCodeForPrint = searchQuery || '';

    if (activeTicketId) {
      const { error: updateError } = await supabase.from('betsnow').update(finalData).eq('id', activeTicketId);
      error = updateError;
      bCodeForPrint = searchQuery;
    } else {
      bCodeForPrint = 'BK-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const { error: insertError } = await supabase.from('betsnow').insert([{ ...finalData, booking_code: bCodeForPrint }]);
      error = insertError;
    }

    if (!error) {
      setCashierBalance(newBalance);
      setCurrentTicket({ ...finalData, booking_code: bCodeForPrint });
      setTimeout(() => {
        window.print();
        setCart([]);
        setActiveTicketId(null);
        setCurrentTicket(null);
        setIsProcessing(false);
        fetchCashierData(); // Refresh history
      }, 500);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto border-r border-white/5 custom-scrollbar">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 bg-[#111926] p-4 rounded-[2rem] border border-white/5 flex items-center gap-4 focus-within:border-[#10b981]/50 transition-all">
              <ReceiptText className="text-[#10b981] ml-2" size={20} />
              <input 
                placeholder="LOAD BOOKING OR PAYOUT CODE..." 
                className="bg-transparent flex-1 outline-none font-black uppercase tracking-widest text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
              />
              <button onClick={handleValidate} className="bg-[#10b981] text-black px-8 py-2 rounded-xl font-black text-xs italic active:scale-95 transition-all">
                {isSearching ? <Loader2 className="animate-spin" size={16} /> : "PROCESS"}
              </button>
            </div>

            <div className="bg-[#10b981] px-10 py-4 rounded-[2rem] flex items-center gap-4 text-black shadow-2xl shadow-[#10b981]/20">
              <Wallet size={24} />
              <div>
                <p className="text-[10px] font-black uppercase leading-none opacity-60">Terminal Float</p>
                <p className="text-2xl font-black italic tracking-tighter leading-tight">KES {cashierBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {foundTicket ? (
            /* PAYOUT UI */
            <div className="bg-[#10b981] text-black rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 border-8 border-white/10 mb-10">
               <div className="flex justify-between items-start mb-4">
                 <p className="font-black text-[12px] uppercase bg-black text-white px-3 py-1 rounded-lg">Win Validated</p>
                 <span className="font-mono text-xs opacity-50 font-bold">{foundTicket.id.split('-')[0]}</span>
               </div>
               <h2 className="text-6xl font-black italic mb-8 tracking-tighter uppercase leading-none">{foundTicket.booking_code}</h2>
               <div className="bg-black/10 p-8 rounded-[2rem] mb-8 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] font-black uppercase opacity-60">Redemption Amount</p>
                    <p className="text-5xl font-black italic tracking-tighter leading-none">KES {parseFloat(foundTicket.potential_payout).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black uppercase opacity-60">Total Odds</p>
                    <p className="text-2xl font-black italic">@{foundTicket.total_odds}</p>
                  </div>
               </div>
               <button 
                  onClick={processPayout} 
                  disabled={isProcessing}
                  className="w-full bg-black text-white py-8 rounded-[2rem] font-black text-xl italic flex items-center justify-center gap-4 hover:bg-zinc-900 active:scale-95 transition-all shadow-xl shadow-black/20"
                >
                 {isProcessing ? <Loader2 className="animate-spin" /> : <><Coins size={28} /> PAY & RELOAD FLOAT</>}
               </button>
               <button onClick={() => setFoundTicket(null)} className="w-full mt-6 text-[10px] font-black uppercase opacity-40 tracking-[0.3em] hover:opacity-100 transition-opacity">Discard Search</button>
            </div>
          ) : (
            <div className="space-y-10">
              {/* GAMES */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {matches.map(m => (
                  <MatchCard key={m.id} match={m} onSelect={(match, selection, odd) => {
                    if(!cart.find(i => i.matchId === m.id)) {
                      setCart([...cart, { matchId: m.id, matchName: `${m.home_team} vs ${m.away_team}`, selection, odds: parseFloat(odd) }]);
                    }
                  }} />
                ))}
              </div>

              {/* RECENT ACTIVITY */}
              <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5">
                <div className="flex items-center gap-3 mb-6 opacity-40">
                  <History size={18} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Recent Terminal Tickets</h3>
                </div>
                <div className="space-y-3">
                  {recentBets.length > 0 ? recentBets.map(bet => (
                    <div key={bet.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 text-[11px]">
                      <span className="font-black italic text-[#10b981] w-24">{bet.booking_code}</span>
                      <span className="text-slate-500 font-bold uppercase">{new Date(bet.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="font-black text-slate-300">KES {bet.stake}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${bet.is_paid ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {bet.is_paid ? 'Paid' : 'Active'}
                      </span>
                    </div>
                  )) : <p className="text-[10px] text-slate-600 font-black italic">No recent transactions recorded</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR SLIP */}
        <div className="w-[420px] bg-[#111926]/50 p-6 flex flex-col">
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
      
      {/* Hidden Thermal Printer Component */}
      <div className="hidden print:block"><PrintableTicket ticket={currentTicket} /></div>
    </CashierLayout>
  );
}
