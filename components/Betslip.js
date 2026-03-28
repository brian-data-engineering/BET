import { Ticket, X, Trash2, Zap, CheckCircle2, Copy, Smartphone, AlertTriangle, Clock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stake, setStake] = useState(100);
  const [currentTime, setCurrentTime] = useState(new Date());

  const MAX_GAMES = 20;

  // 1. Precise Clock Sync
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  /**
   * 2. NAIROBI ABSOLUTE TIME CHECK
   * Strips offsets and checks if we are within the 60-second lock window.
   */
  const isLocked = (startTime) => {
    if (!startTime) return false;
    try {
      // Strip +00 or Z to treat as local Nairobi time
      const cleanTime = startTime.replace('+00', '').replace('Z', '').replace(' ', 'T');
      const matchDate = new Date(cleanTime);
      
      // Lock 60 seconds before start
      const lockTime = matchDate.getTime() - 60000;
      return currentTime.getTime() >= lockTime;
    } catch (e) {
      return false;
    }
  };

  /**
   * 3. AUTO-PURGE LOGIC
   * Removes matches from the slip 1 minute before they start.
   */
  useEffect(() => {
    const expiredExist = items.some(item => isLocked(item.startTime));
    
    if (expiredExist) {
      setItems(prevItems => {
        const filtered = prevItems.filter(item => !isLocked(item.startTime));
        
        // Clear booking state if the slip becomes empty via auto-purge
        if (filtered.length === 0 && bookingCode) {
          setBookingCode(null);
        }
        
        return filtered;
      });
    }
  }, [currentTime, items.length]); 

  // 4. Derived State
  const totalOdds = useMemo(() => {
    return items.reduce((acc, item) => {
      return acc * (parseFloat(item.odds) || 1);
    }, 1).toFixed(2);
  }, [items]);

  const potentialWinnings = useMemo(() => {
    const stakeNum = parseFloat(stake) || 0;
    const wins = parseFloat(totalOdds) * stakeNum;
    return wins.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [totalOdds, stake]);

  // 5. Handlers
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
        const { data } = await supabase.from('betsnow')
          .select('booking_code')
          .eq('booking_code', finalCode)
          .maybeSingle();
        
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
      alert("System Busy: Try again.");
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
          <button onClick={clearAll} className="text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={16} />
          </button>
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
              // Calculate time remaining for this specific item
              const cleanTime = item.startTime?.replace('+00', '').replace('Z', '').replace(' ', 'T');
              const timeLeft = Math.floor((new Date(cleanTime) - currentTime) / 1000);
              const warning = timeLeft < 300; // 5 min warning

              return (
                <div key={item.id} className={`bg-[#1c2636] border p-3 rounded-xl relative transition-all animate-in slide-in-from-right-2 ${warning ? 'border-orange-500/30' : 'border-white/5'}`}>
                  <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-slate-600 hover:text-white transition-colors z-20">
                    <X size={14} />
                  </button>
                  
                  <div className="flex items-center gap-2 mb-1">
                     <p className="text-[10px] text-slate-400 font-black uppercase italic tracking-tighter truncate w-[70%]">{item.matchName}</p>
                     {warning && <span className="text-[8px] text-orange-500 font-black animate-pulse flex items-center gap-1"><Clock size={8}/> LOCKING</span>}
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-black text-white italic">{item.selection}</p>
                      <p className="text-[9px] text-[#10b981] font-bold uppercase italic">{item.marketName}</p>
                    </div>
                    <span className="text-sm font-black text-[#f59e0b] italic">
                      {(parseFloat(item.odds) || 0).toFixed(2)}
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
          {items.length >= MAX_GAMES && (
            <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              <AlertTriangle size={14} />
              <span className="text-[9px] font-black uppercase italic">Max limit reached</span>
            </div>
          )}

          <div className="flex justify-between items-center text-[11px] font-black uppercase italic text-slate-500">
            <span>Total Odds</span>
            <span className="text-[#f59e0b] text-base font-black">{totalOdds}</span>
          </div>
          
          <div className="bg-[#111926] border border-white/5 rounded-lg p-3 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase italic text-slate-400">Stake (KES)</span>
            <input 
              type="number" 
              value={stake} 
              onChange={(e) => setStake(e.target.value)} 
              className="bg-transparent text-right font-black text-white outline-none w-20 text-sm" 
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase italic text-slate-400">Potential Win</span>
            <span className="font-black text-lg italic tracking-tighter text-[#10b981]">
                KES {potentialWinnings}
            </span>
          </div>

          <button 
            onClick={handleBookBet} 
            disabled={isBooking || items.length > MAX_GAMES} 
            className="w-full font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-[#f59e0b] text-[#0b0f1a] hover:bg-[#fbbf24] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={18} className={isBooking ? 'animate-pulse' : 'fill-current'} />
            <span className="uppercase tracking-tighter italic text-sm">
              {isBooking ? 'Processing...' : 'BOOK BET CODE'}
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
