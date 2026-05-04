import { Ticket, X, Trash2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [stake, setStake] = useState(100);
  const MAX_GAMES = 20;

  // Auto-clear booking code when slip changes
  useEffect(() => {
    if (bookingCode && items.length > 0) {
      setBookingCode(null);
    }
  }, [items, bookingCode]);

  // Auto-remove expired matches every 5s
  useEffect(() => {
    const checkInterval = setInterval(() => {
      // Use UTC time for the current comparison
      const nowUTC = new Date().getTime();

      setItems(prevItems => {
        const filtered = prevItems.filter(item => {
          if (!item.startTime) return true;

          // 1. Ensure the string is ISO format (replace space with T)
          // 2. If the string doesn't end in Z or an offset, append Z 
          //    to force the browser to read it as UTC (Database Standard)
          let dateStr = item.startTime.replace(' ', 'T');
          if (!dateStr.includes('Z') && !dateStr.includes('+')) {
            dateStr += 'Z'; 
          }

          const matchDateUTC = new Date(dateStr).getTime();

          if (isNaN(matchDateUTC)) return true;

          // If matchDate is 18:00 UTC and now is 18:01 UTC, remove it.
          // This ignores your computer's local 3-hour offset entirely.
          return (matchDateUTC - nowUTC) > 60000;
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
    return potentialWinningsRaw.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, [potentialWinningsRaw]);

  const handleBookBet = async () => {
    if (items.length === 0 || items.length > MAX_GAMES) return;

    setIsBooking(true);
    try {
      const finalCode = Math.floor(1000 + Math.random() * 9000).toString();

      // All meta is already on each slip item — no extra DB fetch needed
      const sports    = [...new Set(items.map(i => i.sport_key).filter(Boolean))];
      const leagues   = [...new Set(items.map(i => i.display_league).filter(Boolean))];
      const countries = [...new Set(items.map(i => i.country).filter(Boolean))];
      const leagueIds = [...new Set(items.map(i => i.league_id).filter(Boolean))];

      const { error } = await supabase.from('betsnow').insert([{
        booking_code:     finalCode,
        selections:       items,
        stake:            parseFloat(stake) || 100,
        total_odds:       parseFloat(totalOdds),
        potential_payout: potentialWinningsRaw,
        status:           'pending',
        is_paid:          false,
        event_id:         items.map(i => i.matchId).filter(Boolean).join(','),
        country:          countries.join(', ') || 'Unknown',
        league_name:      leagues.join(',, ')  || 'Unknown League',
        // sport_key not a column in betsnow but kept in selections JSONB per item
      }]);

      if (error) throw error;

      setBookingCode(finalCode);
      setItems([]);

      if (navigator.clipboard) {
        navigator.clipboard.writeText(finalCode).catch(() => {});
      }
    } catch (err) {
      console.error('Booking Error:', err);
      alert('System Busy. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="bg-[#111926] border border-white/5 lg:rounded-2xl overflow-hidden flex flex-col h-full w-full">

      {/* Header */}
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-3">

          {/* Booking code success */}
          {bookingCode ? (
            <div className="py-6 text-center animate-in zoom-in-95">
              <CheckCircle2 size={44} className="text-[#10b981] mx-auto mb-3" />
              <div className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-6 rounded-2xl mb-4">
                <span className="text-4xl font-black tracking-[0.2em] text-[#f59e0b]">{bookingCode}</span>
                <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">Code Copied!</p>
              </div>
              <button onClick={() => setBookingCode(null)} className="text-[10px] font-bold text-[#10b981] uppercase hover:underline">
                Done
              </button>
            </div>

          ) : items.length === 0 ? (
            /* Empty slip */
            <div className="py-20 flex flex-col items-center justify-center opacity-20">
              <Ticket size={48} className="text-white mb-2" />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest">Empty Slip</p>
            </div>

          ) : (
            /* Slip items + footer */
            <div className="flex flex-col">

              {/* Selections */}
              <div className="space-y-2 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="bg-[#1c2636]/60 border border-white/5 rounded-xl p-3 relative">
                    <button
                      onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                    <p className="text-[9px] font-bold text-slate-500 uppercase truncate pr-8 mb-1">
                      {item.matchName}
                    </p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black text-white">{item.selection}</p>
                        <p className="text-[10px] text-[#10b981] font-black uppercase italic tracking-tighter">
                          {item.marketName || 'Match Winner'}
                        </p>
                      </div>
                      <span className="text-sm font-black text-[#f59e0b] tabular-nums">
                        {parseFloat(item.odds).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-white/10 space-y-4">

                {items.length > MAX_GAMES && (
                  <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg flex items-center gap-2 text-red-500">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-bold uppercase">Max {MAX_GAMES} games allowed</span>
                  </div>
                )}

                {/* Total odds */}
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Total Odds</span>
                  <span className="text-[#f59e0b] text-xl font-black italic">{totalOdds}</span>
                </div>

                {/* Stake input */}
                <div className="bg-[#1c2636] border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Stake KES</span>
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    className="bg-transparent text-right font-black text-white outline-none w-24 text-lg"
                  />
                </div>

                {/* Payout */}
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Payout</span>
                  <span className="text-lg font-black text-[#10b981]">KES {potentialWinningsFormatted}</span>
                </div>

                {/* Book button */}
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
                    {isBooking
                      ? 'Booking...'
                      : items.length > MAX_GAMES
                        ? 'Too many games'
                        : 'Book Bet Code'}
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
