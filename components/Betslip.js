import { Ticket, X, Trash2, Zap, CheckCircle2, Copy, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stake, setStake] = useState(100);

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));
  
  const clearAll = () => {
    setItems([]);
    setBookingCode(null);
    setCopied(false);
  };

  const totalOdds = items.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1).toFixed(2);
  const potentialWinnings = (totalOdds * stake).toFixed(2);

  const handleBookBet = async () => {
    if (items.length === 0) return;
    setIsBooking(true);

    try {
      // 1. AUTO-CLEAN: Purge codes older than 10 minutes from 'betsnow'
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase.from('betsnow').delete().lt('created_at', tenMinsAgo);

      let isUnique = false;
      let finalCode = '';
      let attempts = 0;

      // 2. GENERATE UNIQUE 4-DIGIT CODE
      while (!isUnique && attempts < 15) {
        finalCode = Math.floor(1000 + Math.random() * 9000).toString();

        const { data } = await supabase
          .from('betsnow')
          .select('booking_code')
          .eq('booking_code', finalCode)
          .single();

        if (!data) isUnique = true;
        attempts++;
      }

      // 3. SAVE TO NEW 'betsnow' TABLE
      const { error } = await supabase
        .from('betsnow')
        .insert([{ 
          booking_code: finalCode,
          selections: items,
          // We can also store metadata if you added columns for odds/stake
          // total_odds: parseFloat(totalOdds), 
          // stake: parseFloat(stake)
        }]);

      if (error) throw error;
      setBookingCode(finalCode);

    } catch (err) {
      console.error("Booking Error:", err.message);
      alert("System Busy: Could not generate 4-digit code.");
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
    <div className="bg-[#111926] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-fit sticky top-24 shadow-2xl">
      
      {/* HEADER */}
      <div className="bg-[#0b0f1a] p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket size={16} className="text-[#10b981]" />
          <h4 className="font-black text-xs uppercase italic tracking-tighter text-white">Betslip ({items.length})</h4>
        </div>
        {items.length > 0 && !bookingCode && (
          <button onClick={clearAll} className="text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
            <Ticket size={40} className="text-slate-500 mb-2" />
            <p className="text-slate-500 text-[10px] font-black uppercase italic tracking-widest">Your slip is empty</p>
          </div>
        ) : bookingCode ? (
          /* SUCCESS / BOOKED VIEW */
          <div className="py-4 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#10b981]/20">
              <CheckCircle2 size={28} className="text-[#10b981]" />
            </div>
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-white mb-1">Booking Successful</h3>
            <p className="text-[10px] text-red-500 mb-6 uppercase font-black italic animate-pulse">
              Expires in 10 minutes
            </p>
            
            <div 
              onClick={copyToClipboard}
              className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-6 rounded-xl mb-6 cursor-pointer hover:border-[#10b981] transition-all relative group"
            >
              <span className="text-5xl font-black tracking-[10px] text-[#f59e0b] ml-[10px]">
                {bookingCode}
              </span>
              <div className="absolute top-2 right-2 opacity-30 group-hover:opacity-100 transition-opacity text-white">
                <Copy size={14} />
              </div>
              {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#10b981] text-white text-[9px] px-2 py-1 rounded font-black">COPIED!</span>}
            </div>

            <button 
              onClick={clearAll}
              className="w-full bg-[#1c2636] text-white font-black py-3 rounded-lg text-[10px] uppercase italic hover:bg-slate-700 transition-all"
            >
              Start New Slip
            </button>
          </div>
        ) : (
          /* ACTIVE SLIP VIEW */
          <div className="space-y-4">
            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {items.map((item) => (
                <div key={item.id} className="bg-[#1c2636] border border-white/5 p-3 rounded-xl relative group">
                  <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-slate-600 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                  <p className="text-[10px] text-slate-400 font-black uppercase italic tracking-tighter truncate w-[90%] mb-1">
                    {item.matchName}
                  </p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-black text-white italic">{item.selection}</p>
                      <p className="text-[9px] text-[#10b981] font-bold uppercase italic">
                        {item.marketName}
                      </p>
                    </div>
                    <span className="text-sm font-black text-[#f59e0b] italic">
                      {parseFloat(item.odds || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[11px] font-black uppercase italic text-slate-500">
                <span>Total Odds</span>
                <span className="text-[#f59e0b] text-base">{totalOdds}</span>
              </div>
              
              <div className="bg-[#0b0f1a] border border-white/5 rounded-lg p-3 flex justify-between items-center">
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
                <span className="text-[#10b981] font-black text-lg italic tracking-tighter">KES {potentialWinnings}</span>
              </div>

              <button 
                onClick={handleBookBet}
                disabled={isBooking}
                className="w-full bg-[#f59e0b] text-[#0b0f1a] font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-[#fbbf24] disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                <Zap size={18} className={`${isBooking ? 'animate-pulse' : 'fill-current'}`} />
                <span className="uppercase tracking-tighter italic text-sm">{isBooking ? 'CLEANING SYSTEM...' : 'BOOK BET CODE'}</span>
              </button>

              <p className="text-[8px] text-center font-black uppercase italic text-slate-600 tracking-widest flex items-center justify-center gap-2">
                <Smartphone size={10} /> Powered by Lucra Mobile
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1c2636; border-radius: 10px; }
      `}</style>
    </div>
  );
}
