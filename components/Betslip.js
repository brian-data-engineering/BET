import { Ticket, X, Trash2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [stake, setStake] = useState(100);
  const MAX_GAMES = 20;

  const totalOdds = useMemo(() => {
    return items.reduce((acc, item) => acc * (parseFloat(item.odds) || 1), 1).toFixed(2);
  }, [items]);

  const potentialWinnings = useMemo(() => {
    const total = parseFloat(totalOdds) * (parseFloat(stake) || 0);
    return total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [totalOdds, stake]);

  const handleBookBet = async () => {
    if (items.length === 0) return;
    setIsBooking(true);
    try {
      const finalCode = Math.floor(1000 + Math.random() * 9000).toString();
      const { error } = await supabase.from('betsnow').insert([{ 
        booking_code: finalCode, 
        selections: items, 
        status: 'pending' 
      }]);
      if (error) throw error;
      setBookingCode(finalCode);
      navigator.clipboard.writeText(finalCode);
    } catch (err) {
      console.error(err);
    } finally { setIsBooking(false); }
  };

  return (
    <div className="bg-[#111926] border border-white/5 lg:rounded-2xl overflow-hidden flex flex-col h-full w-full">
      {/* HEADER */}
      <div className="bg-[#0b0f1a]/50 p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-[#10b981]" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white">
            Betslip ({items.length}/{MAX_GAMES})
          </span>
        </div>
        {items.length > 0 && !bookingCode && (
          <button onClick={() => setItems([])} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* THE DYNAMIC CONTAINER */}
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
              {/* LIST OF GAMES */}
              <div className="space-y-2 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="bg-[#1c2636]/60 border border-white/5 rounded-xl p-3 relative animate-in slide-in-from-right-2">
                    <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-red-400">
                      <X size={14} />
                    </button>
                    <p className="text-[9px] font-bold text-slate-500 uppercase truncate pr-8 mb-1">{item.matchName}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black text-white">{item.selection}</p>
                        <p className="text-[10px] text-[#10b981] font-black uppercase italic tracking-tighter">1X2 Market</p>
                      </div>
                      <span className="text-sm font-black text-[#f59e0b] tabular-nums">{parseFloat(item.odds).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER AREA - ATTACHED TO THE LAST ITEM */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Total Odds</span>
                  <span className="text-[#f59e0b] text-xl font-black italic">{totalOdds}</span>
                </div>

                <div className="bg-[#1c2636] border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Stake KES</span>
                  <input type="number" value={stake} onChange={(e) => setStake(e.target.value)} className="bg-transparent text-right font-black text-white outline-none w-24 text-lg" />
                </div>

                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Payout</span>
                  <span className="text-lg font-black text-[#10b981]">KES {potentialWinnings}</span>
                </div>

                <button 
                  onClick={handleBookBet} 
                  disabled={isBooking} 
                  className="w-full bg-[#10b981] text-[#0b0f1a] font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.97] transition-all shadow-lg"
                >
                  <Zap size={18} fill="currentColor" />
                  <span className="uppercase italic tracking-tighter text-[13px]">Book Bet Code</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
