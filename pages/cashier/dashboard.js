import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, Coins, ReceiptText, Wallet } from 'lucide-react';

export default function UnifiedTerminal() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [cashierBalance, setCashierBalance] = useState(0); // Track Digital Balance
  
  const [searchQuery, setSearchQuery] = useState('');
  const [foundTicket, setFoundTicket] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { 
    fetchMatches();
    fetchCashierBalance();
  }, []);

  const fetchCashierBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (data) setCashierBalance(parseFloat(data.balance));
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

  // REDEEM TICKET: Increases Cashier Balance
  const processPayout = async () => {
    if (!foundTicket) return;
    setIsProcessing(true);

    const payoutAmount = parseFloat(foundTicket.potential_payout);
    const newBalance = cashierBalance + payoutAmount;

    // 1. Update Profile Balance
    const { data: { user } } = await supabase.auth.getUser();
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (!profileError) {
      // 2. Mark Ticket as Paid
      await supabase
        .from('betsnow')
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq('id', foundTicket.id);

      setCashierBalance(newBalance);
      setFoundTicket(null);
      setSearchQuery('');
      alert(`SUCCESS: KES ${payoutAmount} added to your balance.`);
    }
    setIsProcessing(false);
  };

  // PLACE BET: Deducts from Cashier Balance
  const handlePrintBet = async () => {
    if (cart.length === 0 || stake <= 0) return;
    
    if (cashierBalance < parseFloat(stake)) {
      alert("INSUFFICIENT BALANCE to place this bet.");
      return;
    }

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

    // 1. Deduct from Balance
    const newBalance = cashierBalance - parseFloat(stake);
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (balanceError) {
      alert("BALANCE UPDATE FAILED");
      setIsProcessing(false);
      return;
    }

    // 2. Update/Insert Ticket
    let error;
    if (activeTicketId) {
      const { error: updateError } = await supabase.from('betsnow').update(finalData).eq('id', activeTicketId);
      error = updateError;
    } else {
      const bCode = 'BK-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const { error: insertError } = await supabase.from('betsnow').insert([{ ...finalData, booking_code: bCode }]);
      error = insertError;
    }

    if (!error) {
      setCashierBalance(newBalance);
      setCurrentTicket({ ...finalData, booking_code: searchQuery || 'NEW' });
      setTimeout(() => {
        window.print();
        setCart([]);
        setActiveTicketId(null);
        setCurrentTicket(null);
        setIsProcessing(false);
      }, 500);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white">
        <div className="flex-1 p-6 overflow-y-auto border-r border-white/5">
          
          {/* BALANCE DISPLAY & SEARCH */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 bg-[#111926] p-4 rounded-[2rem] border border-white/5 flex items-center gap-4">
              <ReceiptText className="text-[#10b981] ml-2" size={20} />
              <input 
                placeholder="ENTER BOOKING CODE..." 
                className="bg-transparent flex-1 outline-none font-black uppercase tracking-widest text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
              />
              <button onClick={handleValidate} className="bg-[#10b981] text-black px-6 py-2 rounded-xl font-black text-xs italic">
                {isSearching ? <Loader2 className="animate-spin" size={16} /> : "PROCESS"}
              </button>
            </div>

            <div className="bg-[#10b981] px-8 py-4 rounded-[2rem] flex items-center gap-4 text-black shadow-lg shadow-[#10b981]/10">
              <Wallet size={24} />
              <div>
                <p className="text-[10px] font-black uppercase leading-none opacity-70">Your Balance</p>
                <p className="text-xl font-black italic tracking-tighter">KES {cashierBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {foundTicket ? (
            <div className="bg-[#10b981] text-black rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 border-4 border-white/20">
               <p className="font-black text-[10px] uppercase mb-1">Winning Ticket Found</p>
               <h2 className="text-5xl font-black italic mb-6 tracking-tighter">{foundTicket.booking_code}</h2>
               <div className="bg-black/10 p-6 rounded-3xl mb-6">
                  <p className="text-[10px] font-black uppercase mb-1">Redemption Value</p>
                  <p className="text-4xl font-black italic tracking-tighter">KES {parseFloat(foundTicket.potential_payout).toLocaleString()}</p>
               </div>
               <button 
                  onClick={processPayout} 
                  disabled={isProcessing}
                  className="w-full bg-black text-white py-6 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-transform"
                >
                 {isProcessing ? <Loader2 className="animate-spin" /> : <><Coins size={24} /> REDEEM TO BALANCE</>}
               </button>
               <button onClick={() => setFoundTicket(null)} className="w-full mt-4 text-xs font-black uppercase opacity-60">Dismiss</button>
            </div>
          ) : (
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
