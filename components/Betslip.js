import { Ticket, X, Trash2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [stake, setStake] = useState(100);
  const MAX_GAMES = 20;

  // --- AUTO-REMOVE EXPIRED MATCHES ---
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date().getTime();
      setItems(prevItems => {
        const filtered = prevItems.filter(item => {
          if (!item.startTime) return true;
          const cleanTime = item.startTime.split('+')[0].replace(' ', 'T');
          const matchTime = new Date(cleanTime).getTime();
          return (matchTime - now) > 60000; // 1 minute buffer
        });
        return filtered.length !== prevItems.length ? filtered : prevItems;
      });
    }, 5000);
    return () => clearInterval(checkInterval);
  }, [setItems]);

  const totalOdds = useMemo(() => {
    return items.reduce((acc, item) => acc * (parseFloat(item.odds) || 1), 1).toFixed(2);
  }, [items]);

  const potentialWinningsRaw = useMemo(() => {
    return parseFloat(totalOdds) * (parseFloat(stake) || 0);
  }, [totalOdds, stake]);

  const potentialWinningsFormatted = useMemo(() => {
    return potentialWinningsRaw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [potentialWinningsRaw]);

  // --- UPDATED MULTIBET-AWARE BOOKING LOGIC ---
  const handleBookBet = async () => {
    if (items.length === 0 || items.length > MAX_GAMES) return;
    
    setIsBooking(true);
    try {
      const finalCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // 1. Collect all unique matchIds from the slip
      const matchIds = items.map(item => item.matchId).filter(Boolean);
      
      let countryValue = "Unknown";
      let leagueValue = "Unknown League";

      if (matchIds.length > 0) {
        try {
          // 2. Fetch data for ALL matches in the slip at once
          const { data: eventsData } = await supabase
            .from('api_events')
            .select('country, display_league, league_name')
            .in('id', matchIds);

          if (eventsData && eventsData.length > 0) {
            // 3. Remove duplicates using Set and join with commas
            const countries = [...new Set(eventsData.map(e => e.country).filter(Boolean))];
            const leagues = [...new Set(eventsData.map(e => e.display_league || e.league_name).filter(Boolean))];

            countryValue = countries.length > 0 ? countries.join(', ') : "Unknown";
            leagueValue = leagues.length > 0 ? leagues.join(', ') : "Unknown League";
          }
        } catch (err) {
          console.warn("Could not fetch multi-match mapping from api_events.");
        }
      }
      
      // 4. INSERT into betsnow
      const { error } = await supabase.from('betsnow').insert([{ 
        booking_code: finalCode, 
        selections: items, 
        stake: parseFloat(stake) || 100,
        total_odds: parseFloat(totalOdds),
        potential_payout: potentialWinningsRaw,
        status: 'pending',
        is_paid: false,
        event_id: matchIds.join(','),
        country: countryValue,
        league_name: leagueValue
      }]);

      if (error) throw error;
      
      setBookingCode(finalCode);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(finalCode);
      }
    } catch (err) {
      console.error("Booking Error:", err);
      alert("System Busy. Please try again.");
    } finally { 
      setIsBooking(false); 
    }
  };

  return (
    <div className="bg-[#111926] border border-white/5 lg:rounded-2xl overflow-hidden flex flex-col h-full w-full">
      {/* HEADER */}
      <div className="bg-[#0b0f1a]/50 p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-[#10b981]" />
          <span className={`text-[11px] font-black uppercase tracking-wider ${items.length > MAX_GAMES ? 'text-red-500' : 'text-white'}`}>
            Betslip ({items.length}/{MAX_GAMES})
          </span>
        </div>
        {items.length > 0 && !bookingCode && (
          <button onClick={() => setItems([])} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-3">
          {items.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-20">
              <Ticket size={48} className="text-white mb-2" />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest">Empty Slip</p>
            </div>
          ) : bookingCode ? (
            <div className="py-6 text-center animate-in zoom-in-95">
              <CheckCircle2 size={44} className="text-[#10b981] mx-auto mb-3" />
              <div className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-6 rounded-2xl mb-4">
                <span className="text-4xl font-black tracking-[0.2em] text-[#f59e0b]">{bookingCode}</span>
                <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">Code Copied!</p>
              </div>
              <button onClick={() => {setBookingCode(null); setItems([]);}} className="text-[10px] font-bold text-[#10b981] uppercase hover:underline">Clear Slip</button>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="space-y-2 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="bg-[#1c2636]/60 border border-white/5 rounded-xl p-3 relative">
                    <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-red-400">
                      <X size={14} />
                    </button>
                    <p className="text-[9px] font-bold text-slate-500 uppercase truncate pr-8 mb-1">{item.matchName}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black text-white">{item.selection}</p>
                        <p className="text-[10px] text-[#10b981] font-black uppercase italic tracking-tighter">{item.marketName || '1X2 Market'}</p>
                      </div>
                      <span className="text-sm font-black text-[#f59e0b] tabular-nums">{parseFloat(item.odds).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-4">
                {items.length > MAX_GAMES && (
                  <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg flex items-center gap-2 text-red-500">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-bold uppercase">Max {MAX_GAMES} games allowed</span>
                  </div>
                )}

                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Total Odds</span>
                  <span className="text-[#f59e0b] text-xl font-black italic">{totalOdds}</span>
                </div>

                <div className="bg-[#1c2636] border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Stake KES</span>
                  <input 
                    type="number" 
                    value={stake} 
                    onChange={(e) => setStake(e.target.value)} 
                    className="bg-transparent text-right font-black text-white outline-none w-24 text-lg" 
                  />
                </div>

                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Payout</span>
                  <span className="text-lg font-black text-[#10b981]">KES {potentialWinningsFormatted}</span>
                </div>

                <button 
                  onClick={handleBookBet} 
                  disabled={isBooking || items.length > MAX_GAMES} 
                  className={`w-full font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg ${
                    items.length > MAX_GAMES 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50' 
                    : 'bg-[#10b981] text-[#0b0f1a] hover:brightness-110 active:scale-[0.97]'
                  }`}
                >
                  <Zap size={18} fill="currentColor" />
                  <span className="uppercase italic tracking-tighter text-[13px]">
                    {isBooking ? 'Booking...' : items.length > MAX_GAMES ? 'Too many games' : 'Book Bet Code'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
