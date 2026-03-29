import { Ticket, X, Trash2, Zap, CheckCircle2, Copy, Smartphone, Clock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [stake, setStake] = useState(100);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalOdds = useMemo(() => {
    return items.reduce((acc, item) => acc * (parseFloat(item.odds) || 1), 1).toFixed(2);
  }, [items]);

  const potentialWinnings = useMemo(() => {
    return (parseFloat(totalOdds) * (parseFloat(stake) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 });
  }, [totalOdds, stake]);

  const handleBookBet = async () => {
    if (items.length === 0) return;
    setIsBooking(true);
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const { error } = await supabase.from('betsnow').insert([{ booking_code: code, selections: items, status: 'pending' }]);
      if (!error) setBookingCode(code);
    } finally { setIsBooking(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#111926] border border-white/5 lg:rounded-2xl overflow-hidden w-full">
      {/* Header */}
      <div className="p-4 bg-[#0b0f1a]/50 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-[#10b981]" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white">Betslip ({items.length})</span>
        </div>
        {items.length > 0 && <button onClick={() => setItems([])} className="text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <Ticket size={40} className="opacity-10 mb-2" />
            <p className="text-[10px] font-bold uppercase">Slip is empty</p>
          </div>
        ) : bookingCode ? (
          <div className="text-center py-8 animate-in zoom-in-95">
             <div className="text-4xl font-black text-[#f59e0b] tracking-widest mb-4">{bookingCode}</div>
             <button onClick={() => {setBookingCode(null); setItems([]);}} className="text-[10px] text-slate-400 underline">Clear & Continue</button>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-[#1c2636]/40 p-3 rounded-xl border border-white/5 relative">
              <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-2 right-2 text-slate-500"><X size={14}/></button>
              <p className="text-[9px] font-bold text-slate-500 uppercase truncate pr-4">{item.matchName}</p>
              <div className="flex justify-between items-end mt-1">
                <div>
                  <p className="text-xs font-black text-white">Selection: {item.selection}</p>
                  <p className="text-[9px] text-[#10b981] font-bold uppercase">1X2 Market</p>
                </div>
                <span className="text-sm font-black text-[#f59e0b]">{parseFloat(item.odds).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && !bookingCode && (
        <div className="p-4 bg-[#0b0f1a] border-t border-white/5 space-y-3 shrink-0">
          <div className="flex justify-between text-xs font-bold px-1">
            <span className="text-slate-500 uppercase">Total Odds</span>
            <span className="text-[#f59e0b] text-lg">{totalOdds}</span>
          </div>
          <div className="bg-[#1c2636]/60 p-3 rounded-xl flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Stake KES</span>
            <input type="number" value={stake} onChange={(e) => setStake(e.target.value)} className="bg-transparent text-right font-black text-white w-20 outline-none" />
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Return</span>
            <span className="text-xl font-black text-[#10b981]">KES {potentialWinnings}</span>
          </div>
          <button onClick={handleBookBet} className="w-full bg-[#10b981] text-[#0b0f1a] font-black py-4 rounded-xl flex items-center justify-center gap-2">
            <Zap size={18} fill="currentColor" /> BOOK BET
          </button>
        </div>
      )}
    </div>
  );
}
