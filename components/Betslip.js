import { Ticket, X, Trash2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);
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
      // Auto-copy to clipboard
      navigator.clipboard.writeText(finalCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBooking(false);
    }
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
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

      {/* DYNAMIC SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-3">
          {items.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
              <Ticket size={48} className="text-white mb-2" />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest">Empty Slip</p>
            </div>
          ) : bookingCode ? (
            <div className="py-6 text-center animate-in zoom-in-95">
              <CheckCircle2 size={44} className="text-[#10b981] mx-auto mb-3" />
              <h3 className="text-sm font-black text-white uppercase mb-4 tracking-tight">Bet Booked!</h3>
              <div className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-6 rounded-2xl mb-4 relative">
                <span className="text-4xl font-black tracking-[0.2em] text-[#f59e0b]">{bookingCode}</span>
                <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">Code copied to clipboard</p>
              </div>
              <button onClick={() => {setBookingCode(null); setItems([]);}} className="text-[10px] font-bold text-[#10b981] uppercase hover:underline">Start New Slip</button>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* GAME CARDS */}
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-[#1c2636]/60 border border-white/5 rounded-xl p-3 relative animate-in slide-in-from-right-2 duration-200">
                    <button 
                      onClick={() => removeItem(item.id)} 
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    >
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

              {/* LIMIT WARNING */}
              {items.length >= MAX_GAMES && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <AlertCircle size={14} className="text-red-400" />
                  <span className="text-[10px] font-bold text-red-400 uppercase">Maximum 20 games reached</span>
                </div>
              )}

              {/* FOOTER (Flows with content) */}
              <div className="pt-2 border-t border-white/5 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Acca Odds</span>
                  <span className="text-[#f59e0b] text-xl font-black italic tabular-nums">{totalOdds}</span>
                </div>

                <div className="bg-[#1c2636] border border-white/10 rounded-xl p-3 flex justify-between items-center focus-within:ring-1 ring-[#10b981]/50 transition-all">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stake KES</span>
                  <input 
                    type="number" 
                    value={stake} 
                    onChange={(e) => setStake(e.target.value)} 
                    className="bg-transparent text-right font-black text-white outline-none w-24 text-lg" 
                  />
                </div>

                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Est. Payout</span>
                  <span className="text-lg font-black text-[#10b981]">KES {potentialWinnings}</span>
                </div>

                <button 
                  onClick={handleBookBet} 
                  disabled={isBooking} 
                  className="w-full bg-[#10b981] text-[#0b0f1a] font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.97] disabled:opacity-50 transition-all shadow-xl shadow-[#10b981]/10"
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
