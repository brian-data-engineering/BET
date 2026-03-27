import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Search, Zap, Loader2, Info } from 'lucide-react';

export default function CashierDashboard() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [bookingInput, setBookingInput] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);

  // 1. Fetch live matches (Sync with your scraper)
  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'open')
        .order('commence_time', { ascending: true });
      setMatches(data || []);
    };
    fetchMatches();
  }, []);

  const parseOdds = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 1.00 : parsed;
  };

  // 2. Booking Code Logic (Load pre-selected slips)
  const loadBookingCode = async () => {
    const cleanCode = bookingInput.trim().toUpperCase();
    if (!cleanCode) return;
    
    setIsLoadingCode(true);
    const { data, error } = await supabase
      .from('booking_codes')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (data && data.selections) {
      const sanitized = data.selections.map(item => ({
        ...item,
        odds: parseOdds(item.odds || item.odd) 
      }));
      setCart(sanitized); 
      setBookingInput('');
    } else {
      alert("INVALID CODE: Booking sequence not recognized in database.");
    }
    setIsLoadingCode(false);
  };

  const addToSlip = (match, selection, odd) => {
    const exists = cart.find(item => item.matchId === match.id);
    if (exists) return; 
    setCart([...cart, { 
      matchId: match.id, 
      matchName: `${match.home_team} vs ${match.away_team}`, 
      selection, 
      odds: parseOdds(odd) 
    }]);
  };

  const removeFromSlip = (id) => setCart(cart.filter(item => item.matchId !== id));

  // 3. Final Payout & Database Insertion (Mapping to betsnow)
  const handlePrint = async () => {
    if (cart.length === 0) return;

    // Generate high-visibility 6-digit Bet Code
    const betCode = 'BT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const calculatedTotalOdds = cart.reduce((acc, item) => acc * parseOdds(item.odds), 1);
    const numericStake = parseFloat(stake) || 0;
    const calculatedPayout = (calculatedTotalOdds * numericStake).toFixed(2);

    const ticketData = {
      bet_code: betCode,
      cashier_id: (await supabase.auth.getUser()).data.user.id,
      selections: cart, // Stored as JSONB in betsnow
      stake: numericStake,
      total_odds: parseFloat(calculatedTotalOdds.toFixed(2)),
      potential_payout: parseFloat(calculatedPayout),
      status: 'pending',
      is_paid: false,
      created_at: new Date().toISOString()
    };

    // Inserting into your production 'betsnow' table
    const { error } = await supabase.from('betsnow').insert([ticketData]);

    if (!error) {
      setCurrentTicket(ticketData);
      // Trigger thermal printer
      setTimeout(() => {
        window.print();
        setCart([]);
        setCurrentTicket(null);
      }, 500);
    } else {
      alert("SYSTEM ERROR: Failed to commit bet to betsnow table.");
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0b0f1a]">
        
        {/* Main Selection Area */}
        <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Betting Terminal</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1 italic">Node: 001-CASHIER-MAIN</p>
            </div>

            {/* Input for External Booking Codes */}
            <div className="flex gap-2 bg-[#111926] p-2 rounded-2xl border border-white/5 w-full md:w-80 shadow-2xl focus-within:border-[#10b981] transition-all">
              <input 
                placeholder="LOAD BOOKING CODE" 
                className="bg-transparent border-none outline-none text-[11px] font-black px-4 flex-1 tracking-[0.2em] text-white uppercase placeholder:text-slate-700"
                value={bookingInput}
                onChange={(e) => setBookingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadBookingCode()}
              />
              <button 
                onClick={loadBookingCode}
                disabled={isLoadingCode}
                className="bg-[#10b981] text-black p-3 rounded-xl hover:bg-white transition-all disabled:opacity-50 active:scale-90"
              >
                {isLoadingCode ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {matches.length > 0 ? (
              matches.map(m => (
                <MatchCard key={m.id} match={m} onSelect={addToSlip} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                <Info className="mx-auto text-slate-800 mb-4" size={48} />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic">No active matches in market</p>
              </div>
            )}
          </div>
        </div>

        {/* The Action Slip (Right Sidebar) */}
        <div className="w-[420px] border-l border-white/5 bg-[#111926]/50 backdrop-blur-md flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
            <BetSlip 
              cart={cart} 
              onRemove={removeFromSlip} 
              stake={stake} 
              setStake={setStake} 
              onPrint={handlePrint} 
            />
          </div>
        </div>
      </div>

      {/* Hidden container for Browser Print functionality */}
      <div className="hidden print:block">
        <PrintableTicket ticket={currentTicket} />
      </div>
      
    </CashierLayout>
  );
}
