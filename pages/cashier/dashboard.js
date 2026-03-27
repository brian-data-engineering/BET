import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Search, Zap, Loader2 } from 'lucide-react';

export default function CashierDashboard() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [bookingInput, setBookingInput] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase.from('matches').select('*').eq('status', 'open');
      setMatches(data || []);
    };
    fetchMatches();
  }, []);

  const loadBookingCode = async () => {
    if (!bookingInput) return;
    setIsLoadingCode(true);
    const { data } = await supabase.from('booking_codes').select('*').eq('code', bookingInput.toUpperCase()).single();

    if (data?.selections) {
      setCart(data.selections.map(s => ({ ...s, odds: parseFloat(s.odds || s.odd || 1) })));
      setBookingInput('');
    } else {
      alert("Invalid Code");
    }
    setIsLoadingCode(false);
  };

  const addToSlip = (match, selection, odd) => {
    if (cart.find(item => item.matchId === match.id)) return;
    setCart([...cart, { 
      matchId: match.id, 
      matchName: `${match.home_team} vs ${match.away_team}`, 
      selection, 
      odds: parseFloat(odd) 
    }]);
  };

  const handlePrint = async () => {
    if (cart.length === 0) return;
    const bookingCode = 'BK-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const totalOdds = cart.reduce((acc, item) => acc * item.odds, 1);
    const payout = totalOdds * stake;

    const ticketData = {
      booking_code: bookingCode,
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
      setTimeout(() => { window.print(); setCart([]); setCurrentTicket(null); }, 500);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0b0f1a]">
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Live Terminal</h1>
            <div className="flex gap-2 bg-[#111926] p-2 rounded-2xl border border-white/5 w-80">
              <input 
                placeholder="LOAD CODE" 
                className="bg-transparent border-none outline-none text-[11px] font-black px-4 flex-1 text-white uppercase"
                value={bookingInput}
                onChange={(e) => setBookingInput(e.target.value)}
              />
              <button onClick={loadBookingCode} className="bg-[#10b981] text-black p-3 rounded-xl">
                {isLoadingCode ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {matches.map(m => <MatchCard key={m.id} match={m} onSelect={addToSlip} />)}
          </div>
        </div>
        <div className="w-[400px] border-l border-white/5 bg-[#111926]/50 p-8">
          <BetSlip cart={cart} onRemove={(id) => setCart(cart.filter(i => i.matchId !== id))} stake={stake} setStake={setStake} onPrint={handlePrint} />
        </div>
      </div>
      <div className="hidden print:block"><PrintableTicket ticket={currentTicket} /></div>
    </CashierLayout>
  );
}
