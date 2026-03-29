import { Ticket, X, Trash2, Zap, CheckCircle2, Copy, Smartphone, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stake, setStake] = useState(100);
  const [currentTime, setCurrentTime] = useState(new Date());

  const MAX_GAMES = 20;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const isLocked = (startTime) => {
    if (!startTime) return false;
    try {
      const cleanTime = startTime.split('+')[0].replace('Z', '').replace(' ', 'T');
      const matchDate = new Date(cleanTime);
      const lockTime = matchDate.getTime() - 60000;
      return currentTime.getTime() >= lockTime;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const hasLockedItems = items.some(item => isLocked(item.startTime));
    if (hasLockedItems) {
      setItems(prevItems => {
        const filtered = prevItems.filter(item => !isLocked(item.startTime));
        if (filtered.length === 0 && bookingCode) setBookingCode(null);
        return filtered;
      });
    }
  }, [currentTime, items.length]); 

  const totalOdds = useMemo(() => {
    return items.reduce((acc, item) => acc * (parseFloat(item.odds) || 1), 1).toFixed(2);
  }, [items]);

  const potentialWinnings = useMemo(() => {
    const stakeNum = parseFloat(stake) || 0;
    return (parseFloat(totalOdds) * stakeNum).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [totalOdds, stake]);

  const removeItem = (id) => setItems(prev => prev.filter(item => item.id !== id));
  
  const clearAll = () => {
    setItems([]);
    setBookingCode(null);
    setCopied(false);
  };

  const handleBookBet = async () => {
    if (items.length === 0 || items.length > MAX_GAMES) return;
    setIsBooking(true);
    try {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase.from('betsnow').delete().lt('created_at', tenMinsAgo);
      let finalCode = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 15) {
        finalCode = Math.floor(1000 + Math.random() * 9000).toString();
        const { data } = await supabase.from('betsnow').select('booking_code').eq('booking_code', finalCode).maybeSingle();
        if (!data) isUnique = true;
        attempts++;
      }
      const { error } = await supabase.from('betsnow').insert([{ 
        booking_code: finalCode, 
        selections: items, 
        status: 'pending' 
      }]);
      if (error) throw error;
      setBookingCode(finalCode);
    } catch (err) {
      console.error("Booking Error:", err);
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
    /* Removed sticky from here - move to parent container for better zoom stability */
    <div className="bg-[#111926] border border-white/5 lg:rounded-3xl overflow-hidden flex flex-col h-full max-h-[85vh] min-w-[320px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full transition-all">
      
      {/* HEADER */}
      <div className="bg-[#0b0f1a]/80 backdrop-blur-md p-5 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#10b981]/20 p-2 rounded-xl">
            <Ticket size={18} className="text-[#10b981]" />
          </div>
          <div>
            <h4 className="font-black text-[11px] uppercase italic tracking-wider text-white">Betslip</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase">{items.length} / {MAX_GAMES} Selections</p>
          </div>
        </div>
        {items.length > 0 && !bookingCode && (
          <button onClick={clearAll} className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all text-slate-500">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* SCROLLABLE ITEMS BODY */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 bg-gradient-to-b from-[#111926] to-[#0b0f1a]">
        {items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                <Ticket size={32} className="text-slate-700" />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase italic tracking-[0.2em]">Select odds to start</p>
          </div>
        ) : bookingCode ? (
          <div className="py-6 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-[#10b981]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#10b981]/20 rotate-3">
              <CheckCircle2 size={40} className="text-[#10b981]" />
            </div>
            <h3 className="text-lg font-black uppercase italic text-white mb-1">Code Ready</h3>
            <p className="text-[10px] text-red-500 mb-8 uppercase font-black italic tracking-widest">Valid for 10 minutes</p>
            <div onClick={copyToClipboard} className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-8 rounded-2xl mb-8 cursor-pointer hover:border-[#10b981] transition-all relative group active:scale-95">
              <span className="text-6xl font-black tracking-[12px] text-[#f59e0b] drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">{bookingCode}</span>
              <div className="absolute top-3 right-3 opacity-30 group-hover:opacity-100 text-[#10b981]"><Copy size={16} /></div>
              {copied && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#10b981] text-white text-[10px] px-3 py-1 rounded-full font-black shadow-xl">COPIED!</span>}
            </div>
            <button onClick={clearAll} className="w-full bg-white/5 text-slate-400 font-black py-4 rounded-xl text-[10px] uppercase italic hover:bg-white/10 transition-all border border-white/5">Clear & Start New</button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const cleanTime = item.startTime?.split('+')[0].replace('Z', '').replace(' ', 'T');
              const timeLeft = Math.floor((new Date(cleanTime) - currentTime) / 1000);
              const warning = timeLeft < 300;
              return (
                <div key={item.id} className={`group bg-[#1c2636]/40 border rounded-2xl relative transition-all duration-300 ${warning ? 'border-orange-500/30' : 'border-white/5 hover:border-white/10'}`}>
                  <button onClick={() => removeItem(item.id)} className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <X size={14} />
                  </button>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[9px] text-slate-500 font-black uppercase italic tracking-wider truncate max-w-[140px]">{item.matchName}</p>
                      {warning && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20">
                           <Clock size={10} className="text-orange-500 animate-spin-slow" />
                           <span className="text-[8px] text-orange-500 font-black uppercase">{timeLeft > 60 ? 'LOCKING' : 'PURGING'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-white italic tracking-tight">{item.selection}</p>
                        <p className="text-[9px] text-[#10b981] font-bold uppercase italic opacity-80">{item.marketName}</p>
                      </div>
                      <span className="text-base font-black text-[#f59e0b] italic">
                        {(parseFloat(item.odds) || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      {items.length > 0 && !bookingCode && (
        <div className="p-6 bg-[#0b0f1a] border-t border-white/5 space-y-4 shrink-0 relative">
          {items.length >= MAX_GAMES && (
            <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 mb-2">
              <ShieldAlert size={16} />
              <span className="text-[9px] font-black uppercase italic">Bet Limit Reached (20)</span>
            </div>
          )}
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase italic text-slate-500 tracking-[0.1em]">Total Odds</span>
            <span className="text-[#f59e0b] text-xl font-black italic">{totalOdds}</span>
          </div>
          <div className="bg-[#1c2636]/60 border border-white/5 rounded-2xl p-4 flex justify-between items-center focus-within:border-[#10b981]/50 transition-all">
            <span className="text-[9px] font-black uppercase italic text-slate-400">Stake</span>
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-600">KES</span>
               <input 
                type="number" 
                value={stake} 
                onChange={(e) => setStake(e.target.value)} 
                className="bg-transparent text-right font-black text-white outline-none w-24 text-lg" 
              />
            </div>
          </div>
          <div className="px-1 flex flex-col gap-1">
            <div className="flex justify-between items-center opacity-60">
                <span className="text-[9px] font-black uppercase italic text-slate-400">Est. Payout</span>
                <span className="text-xs font-black text-white">KES {potentialWinnings}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase italic text-slate-400">Total Return</span>
                <span className="font-black text-2xl italic tracking-tighter text-[#10b981]">KES {potentialWinnings}</span>
            </div>
          </div>
          <button 
            onClick={handleBookBet} 
            disabled={isBooking || items.length > MAX_GAMES} 
            className="group w-full font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] bg-[#10b981] text-[#0b0f1a] hover:bg-[#14d393] disabled:opacity-50 disabled:grayscale"
          >
            <Zap size={20} className={isBooking ? 'animate-bounce' : 'fill-current group-hover:scale-110 transition-transform'} />
            <span className="uppercase tracking-[0.05em] italic text-sm">
              {isBooking ? 'Generating Code...' : 'GENERATE BOOKING CODE'}
            </span>
          </button>
          <div className="flex items-center justify-center gap-3 opacity-30">
             <div className="h-[1px] flex-1 bg-slate-700" />
             <p className="text-[8px] font-black uppercase italic text-slate-500 tracking-widest flex items-center gap-1.5">
                <Smartphone size={10} /> Lucra Mobile Engine
             </p>
             <div className="h-[1px] flex-1 bg-slate-700" />
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1c2636; border-radius: 10px; }
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
