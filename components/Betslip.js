import { Ticket, X, Trash2, Zap, CheckCircle2, Copy, Smartphone, Clock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stake, setStake] = useState(100);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

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
    } catch (err) {
      console.error(err);
    } finally {
      setIsBooking(false);
    }
  };

  const copyToClipboard = () => {
    if (!bookingCode) return;
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111926] border border-white/5 lg:rounded-2xl overflow-hidden flex flex-col h-full w-full">
      {/* HEADER */}
      <div className="bg-[#0b0f1a]/50 p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-[#10b981]" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white">Betslip ({items.length})</span>
        </div>
        {items.length > 0 && !bookingCode && (
          <button onClick={() => setItems([])} className="p-2 bg-white/5 hover:text-red-400 rounded-lg transition-all">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <Ticket size={40} className="text-slate-800 mb-2" />
            <p className="text-[10px] font-bold text-slate-600 uppercase">Your slip is empty</p>
          </div>
        ) : bookingCode ? (
          <div className="py-6 text-center animate-in zoom-in-95">
            <CheckCircle2 size={40} className="text-[#10b981] mx-auto mb-3" />
            <h3 className="text-sm font-black text-white uppercase mb-4">Booking Successful</h3>
            <div onClick={copyToClipboard} className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-5 rounded-xl mb-4 cursor-pointer relative">
              <span className="text-3xl font-black tracking-widest text-[#f59e0b]">{bookingCode}</span>
              {copied && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#10b981] text-white text-[9px] px-2 py-1 rounded-full">COPIED</span>}
            </div>
            <button onClick={() => {setBookingCode(null); setItems([]);}} className="text-[10px] font-bold text-slate-500 uppercase underline">Start New Slip</button>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-[#1c2636]/40 border border-white/5 rounded-xl p-3 relative group">
              <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-2 right-2 text-slate-600 hover:text-red-400">
                <X size={14} />
              </button>
              <p className="text-[9px] font-bold text-slate-500 uppercase truncate pr-5 mb-1">{item.matchName}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-black text-white">{item.selection}</p>
                  <p className="text-[9px] text-[#10b981] font-bold uppercase italic">Match Result</p>
                </div>
                <span className="text-sm font-black text-[#f59e0b]">{parseFloat(item.odds).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      {items.length > 0 && !bookingCode && (
        <div className="p-4 bg-[#0b0f1a] border-t border-white/5 space-y-3 shrink-0">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Odds</span>
            <span className="text-[#f59e0b] text-xl font-black">{totalOdds}</span>
          </div>

          <div className="bg-[#1c2636]/60 border border-white/5 rounded-xl p-3 flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Stake KES</span>
            <input 
              type="number" 
              value={stake} 
              onChange={(e) => setStake(e.target.value)} 
              className="bg-transparent text-right font-black text-white outline-none w-20 text-base" 
            />
          </div>

          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Payout</span>
            <span className="text-lg font-black text-[#10b981]">KES {potentialWinnings}</span>
          </div>

          <button 
            onClick={handleBookBet} 
            disabled={isBooking} 
            className="w-full bg-[#10b981] text-[#0b0f1a] font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#14d393] disabled:opacity-50 transition-all"
          >
            <Zap size={18} fill="currentColor" />
            <span className="uppercase italic tracking-wider">Book Bet</span>
          </button>
        </div>
      )}
    </div>
  );
}
