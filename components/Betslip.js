import { Ticket, X, Trash2, Zap, CheckCircle2, Copy, Smartphone, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stake, setStake] = useState(100);
  const [currentTime, setCurrentTime] = useState(new Date());

  const MAX_GAMES = 20;

  // 1. Live Clock Sync (Every 10 seconds for tighter locking)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // 2. Reliable Time Parsing
  const isExpired = (startTime) => {
    if (!startTime) return false;
    try {
      const cleanTime = startTime.replace('+00', '').replace('Z', '').replace(' ', 'T');
      const matchDate = new Date(cleanTime);
      return currentTime >= matchDate;
    } catch (e) {
      return false;
    }
  };

  // 3. Derived State Logic Fixes
  const expiredGames = useMemo(() => items.filter(item => isExpired(item.startTime)), [items, currentTime]);
  const hasExpired = expiredGames.length > 0;

  const totalOdds = useMemo(() => {
    return items.reduce((acc, item) => {
      // FIX: If game started, multiply by 1.00 to neutralize it
      if (isExpired(item.startTime)) return acc * 1;
      return acc * (parseFloat(item.odds) || 1);
    }, 1).toFixed(2);
  }, [items, currentTime]);

  const potentialWinnings = useMemo(() => {
    // FIX: Show 0.00 if any game has started to prevent misleading the user
    if (hasExpired) return "0.00";
    
    const stakeNum = parseFloat(stake) || 0;
    return (parseFloat(totalOdds) * stakeNum).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [totalOdds, stake, hasExpired]);

  // 4. Handlers
  const removeItem = (id) => setItems(prev => prev.filter(item => item.id !== id));
  const removeExpired = () => setItems(prev => prev.filter(item => !isExpired(item.startTime)));
  
  const clearAll = () => {
    setItems([]);
    setBookingCode(null);
    setCopied(false);
  };

  const handleBookBet = async () => {
    if (items.length === 0 || items.length > MAX_GAMES || hasExpired) return;
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
      alert("System Busy: Try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111926] border border-white/5 rounded-2xl overflow-hidden flex flex-col max-h-[85vh] sticky top-24 shadow-2xl w-full">
      
      {/* HEADER */}
      <div className="bg-[#0b0f1a] p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Ticket size={16} className="text-[#10b981]" />
          <h4 className="font-black text-xs uppercase italic tracking-tighter text-white">
            Betslip ({items.length}/{MAX_GAMES})
          </h4>
        </div>
        {items.length > 0 && !bookingCode && (
          <div className="flex gap-3">
            {hasExpired && (
              <button onClick={removeExpired} className="text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors group">
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-[9px] font-black uppercase">Clear Started</span>
              </button>
            )}
            <button onClick={clearAll} className="text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
            <Ticket size={40} className="text-slate-500 mb-2" />
            <p className="text-slate-500 text-[10px] font-black uppercase italic tracking-widest">Your slip is empty</p>
          </div>
        ) : bookingCode ? (
          <div className="py-4 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#10b981]/20">
              <CheckCircle2 size={28} className="text-[#10b981]" />
            </div>
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-white mb-1">Booking Successful</h3>
            <p className="text-[10px] text-red-500 mb-6 uppercase font-black italic animate-pulse">Expires in 10 minutes</p>
            
            <div onClick={copyToClipboard} className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-6 rounded-xl mb-6 cursor-pointer hover:border-[#10b981] transition-all relative group">
              <span className="text-5xl font-black tracking-[10px] text-[#f59e0b] ml-[10px]">{bookingCode}</span>
              <div className="absolute top-2 right-2 opacity-30 group-hover:opacity-100 text-white"><Copy size={14} /></div>
              {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#10b981] text-white text-[9px] px-2 py-1 rounded font-black">COPIED!</span>}
            </div>
            <button onClick={clearAll} className="w-full bg-[#1c2636] text-white font-black py-3 rounded-lg text-[10px] uppercase italic hover:bg-slate-700 transition-all">Start New Slip</button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const started = isExpired(item.startTime);
              return (
                <div key={item.id} className={`bg-[#1c2636] border p-3 rounded-xl relative transition-all ${started ? 'border-red-500/50 bg-red-500/5 opacity-70' : 'border-white/5'}`}>
                  <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-slate-600 hover:text-white transition-colors z-20">
                    <X size={14} />
                  </button>
                  {started && (
                    <div className="absolute inset-0 bg-[#0b0f1a]/60 flex items-center justify-center rounded-xl z-10 backdrop-blur-[1px]">
                      <div className="flex flex-col items-center gap-1">
                        <Lock size={12} className="text-red-500" />
                        <span className="text-red-500 text-[8px] font-black uppercase italic tracking-widest">LOCKED</span>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-black uppercase italic tracking-tighter truncate w-[85%] mb-1">{item.matchName}</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-black text-white italic">{item.selection}</p>
                      <p className="text-[9px] text-[#10b981] font-bold uppercase italic">{item.marketName}</p>
                    </div>
                    <span className="text-sm font-black text-[#f59e0b] italic">
                        {started ? '1.00' : (parseFloat(item.odds) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      {items.length > 0 && !bookingCode && (
        <div className="p-4 bg-[#0b0f1a] border-t border-white/5 space-y-3 shrink-0">
          {hasExpired ? (
            <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20 animate-in slide-in-from-bottom-2">
              <AlertTriangle size={14} className="animate-pulse" />
              <span className="text-[9px] font-black uppercase italic">Slip contains started matches</span>
            </div>
          ) : items.length >= MAX_GAMES && (
            <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              <AlertTriangle size={14} />
              <span className="text-[9px] font-black uppercase italic">Max limit reached</span>
            </div>
          )}

          <div className="flex justify-between items-center text-[11px] font-black uppercase italic text-slate-500">
            <span className="flex items-center gap-1">Total Odds {hasExpired && <Lock size={10} className="text-red-500" />}</span>
            <span className={`text-base font-black transition-colors ${hasExpired ? 'text-red-500' : 'text-[#f59e0b]'}`}>{totalOdds}</span>
          </div>
          
          <div className="bg-[#111926] border border-white/5 rounded-lg p-3 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase italic text-slate-400">Stake (KES)</span>
            <input type="number" value={stake} onChange={(e) => setStake(e.target.value)} className="bg-transparent text-right font-black text-white outline-none w-20 text-sm" />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase italic text-slate-400">Potential Win</span>
            <span className={`font-black text-lg italic tracking-tighter transition-colors ${hasExpired ? 'text-slate-600' : 'text-[#10b981]'}`}>
                KES {potentialWinnings}
            </span>
          </div>

          <button 
            onClick={handleBookBet} 
            disabled={isBooking || items.length > MAX_GAMES || hasExpired} 
            className={`w-full font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]
              ${hasExpired ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' : 'bg-[#f59e0b] text-[#0b0f1a] hover:bg-[#fbbf24]'}`}
          >
            {hasExpired ? <Lock size={18} /> : <Zap size={18} className={isBooking ? 'animate-pulse' : 'fill-current'} />}
            <span className="uppercase tracking-tighter italic text-sm">
              {hasExpired ? 'Slip Blocked' : isBooking ? 'Processing...' : 'BOOK BET CODE'}
            </span>
          </button>
          <p className="text-[8px] text-center font-black uppercase italic text-slate-600 tracking-widest flex items-center justify-center gap-2">
            <Smartphone size={10} /> Powered by Lucra Mobile
          </p>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1c2636; border-radius: 10px; }
      `}</style>
    </div>
  );
}
