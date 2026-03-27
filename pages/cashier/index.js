import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout'; // Ensure this exists
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { 
  Search, 
  Ticket, 
  Trash2, 
  Zap, 
  Trophy,
  Dribbble,
  Timer
} from 'lucide-react';

export default function BettingTerminal() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // 1. Fetch live matches from your 'scraped_matches' table
  useEffect(() => {
    const fetchMatches = async () => {
      const { data, error } = await supabase
        .from('matches') // Adjust table name to your schema
        .select('*')
        .eq('status', 'upcoming')
        .order('commence_time', { ascending: true });

      if (!error) setMatches(data || []);
      setLoading(false);
    };
    fetchMatches();
  }, []);

  const addToSlip = (match, selection, price) => {
    // Prevent duplicate matches in one slip
    if (cart.find(item => item.matchId === match.id)) return;
    
    setCart([...cart, {
      matchId: match.id,
      home: match.home_team,
      away: match.away_team,
      selection, // '1', 'X', or '2'
      price: parseFloat(price)
    }]);
  };

  const removeFromSlip = (id) => setCart(cart.filter(item => item.matchId !== id));

  const totalOdds = cart.reduce((acc, item) => acc * item.price, 1).toFixed(2);
  const potentialPayout = (totalOdds * stake).toFixed(2);

  const handleBookBet = async () => {
    setBookingLoading(true);
    // Logic to generate booking_code and save to 'booked_bets'
    // ...
    alert("BET BOOKED SUCCESSFULLY");
    setCart([]);
    setBookingLoading(false);
  };

  return (
    <ProtectedRoute allowedRoles={['cashier', 'operator']}>
      <CashierLayout>
        <div className="grid grid-cols-12 h-screen bg-[#0b0f1a] text-white">
          
          {/* LEFT: Match Feed */}
          <div className="col-span-8 p-6 overflow-y-auto space-y-6 border-r border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">Live Terminal</h1>
                <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-[0.3em]">Lucra Rapid-Odds Engine</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input className="w-full bg-[#111926] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase outline-none focus:border-[#10b981]" placeholder="Search Team..." />
              </div>
            </div>

            <div className="space-y-3">
              {matches.map(match => (
                <div key={match.id} className="bg-[#111926] p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                  <div className="flex items-center gap-6 w-1/3">
                    <div className="flex flex-col text-[10px] font-black text-slate-500 italic">
                      <Timer size={14} className="mb-1" />
                      {new Date(match.commence_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase italic tracking-tight">{match.home_team}</span>
                      <span className="text-xs font-bold text-slate-500 uppercase italic">vs {match.away_team}</span>
                    </div>
                  </div>

                  {/* Odds Buttons */}
                  <div className="flex gap-2">
                    <OddsBtn label="1" price={match.home_odds} onClick={() => addToSlip(match, 'Home', match.home_odds)} />
                    <OddsBtn label="X" price={match.draw_odds} onClick={() => addToSlip(match, 'Draw', match.draw_odds)} />
                    <OddsBtn label="2" price={match.away_odds} onClick={() => addToSlip(match, 'Away', match.away_odds)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Bet Slip */}
          <div className="col-span-4 bg-[#111926] p-8 flex flex-col h-full shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center text-black shadow-lg shadow-[#10b981]/20">
                <Ticket size={20} />
              </div>
              <h2 className="font-black uppercase italic tracking-widest text-sm">Bet Slip</h2>
              <span className="ml-auto bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-[#10b981] uppercase">{cart.length} Selections</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {cart.map(item => (
                <div key={item.matchId} className="bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 relative group">
                  <button onClick={() => removeFromSlip(item.matchId)} className="absolute -top-2 -right-2 bg-red-500/10 text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                  <p className="text-[9px] font-black text-slate-500 uppercase italic mb-1">{item.home} vs {item.away}</p>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase text-[#10b981] italic">Pick: {item.selection}</span>
                    <span className="text-sm font-mono font-black italic">@{item.price}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Slip Calculations */}
            <div className="mt-8 border-t border-white/5 pt-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase italic">Total Combined Odds</span>
                <span className="text-xl font-black italic text-[#10b981]">x{cart.length > 0 ? totalOdds : '0.00'}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase italic ml-2">Stake Amount (KES)</label>
                <input 
                  type="number" 
                  value={stake} 
                  onChange={(e) => setStake(e.target.value)}
                  className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none font-black text-lg italic text-white" 
                />
              </div>

              <div className="bg-[#10b981]/5 p-6 rounded-[2rem] border border-[#10b981]/10 text-center">
                <p className="text-[9px] font-black text-[#10b981] uppercase tracking-[0.2em] mb-1">Potential Win</p>
                <p className="text-3xl font-black italic tracking-tighter text-white">KES {cart.length > 0 ? potentialPayout : '0.00'}</p>
              </div>

              <button 
                disabled={cart.length === 0 || bookingLoading}
                onClick={handleBookBet}
                className="w-full bg-[#10b981] text-black font-black py-6 rounded-2xl hover:bg-white transition-all active:scale-95 italic text-sm uppercase tracking-widest shadow-xl shadow-[#10b981]/10 disabled:opacity-20"
              >
                {bookingLoading ? "GENERATING..." : "BOOK BET"}
              </button>
            </div>
          </div>
        </div>
      </CashierLayout>
    </ProtectedRoute>
  );
}

function OddsBtn({ label, price, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="bg-[#0b0f1a] hover:bg-[#10b981] hover:text-black border border-white/5 px-6 py-3 rounded-2xl flex flex-col items-center min-w-[80px] transition-all active:scale-90 group"
    >
      <span className="text-[9px] font-black text-slate-500 group-hover:text-black/50 uppercase mb-1">{label}</span>
      <span className="text-xs font-black italic">{price || '—'}</span>
    </button>
  );
}
