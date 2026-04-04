import { Trash2, Ticket, Percent, UserCheck, Store } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export default function Betslip({ 
  cart = [], 
  setCart, 
  stake, 
  onStakeChange, 
  onRemove, 
  onClear, 
  isProcessing,
  user 
}) {
  
  // 1. AUTO-EXPIRY LOGIC (Optimized for performance)
  useEffect(() => {
    // Kill interval if we're paying or slip is empty to save CPU
    if (isProcessing || !cart || cart.length === 0) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      
      setCart(prevCart => {
        if (!prevCart || prevCart.length === 0) return prevCart;
        
        const filtered = prevCart.filter(item => {
          if (!item?.startTime) return true;
          const matchDate = new Date(item.startTime).getTime();
          if (isNaN(matchDate)) return true;
          
          // Drop matches starting in less than 60 seconds
          return (matchDate - now) > 60000; 
        });

        // Only trigger React state update if items were actually removed
        return filtered.length !== prevCart.length ? filtered : prevCart;
      });
    }, 3000); 

    return () => clearInterval(checkInterval);
  }, [cart.length, isProcessing, setCart]);

  // 2. MATH CALCULATIONS
  const totalOdds = useMemo(() => {
    if (!cart || cart.length === 0) return 0;
    return cart.reduce((acc, item) => acc * parseFloat(item?.odds || 1), 1);
  }, [cart]);

  const potentialPayout = useMemo(() => {
    const numStake = parseFloat(stake) || 0;
    return numStake * totalOdds;
  }, [stake, totalOdds]);

  return (
    <div className="flex flex-col h-full bg-[#111926]/40 backdrop-blur-md border-l border-white/5 p-6 shadow-2xl">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-[#10b981]/10 p-2 rounded-lg">
            <Ticket size={16} className="text-[#10b981]" />
          </div>
          <div>
            <h3 className="text-white font-black italic uppercase tracking-tighter text-lg leading-none">Active Slip</h3>
            <div className="flex items-center gap-1 mt-1">
               <Store size={8} className="text-slate-500" />
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                 {user?.shop_name || 'Terminal #016'}
               </p>
            </div>
          </div>
        </div>
        {cart.length > 0 && (
          <button 
            onClick={onClear} 
            disabled={isProcessing} 
            className="text-white/20 hover:text-red-500 transition-all hover:scale-110 disabled:opacity-0"
            title="Clear All"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* SELECTIONS LIST */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-6 custom-scrollbar pr-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale">
            <Ticket size={64} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase mt-4 tracking-[0.3em]">Empty Slip</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div 
              key={`${item.matchId}-${idx}`} 
              className="bg-[#1c2636] rounded-2xl p-4 border border-white/5 relative group transition-all hover:border-[#10b981]/30"
            >
              <button 
                onClick={() => onRemove(idx)} 
                disabled={isProcessing}
                className="absolute top-3 right-3 text-white/10 group-hover:text-red-500 font-bold text-xl disabled:hidden transition-colors"
              >
                ×
              </button>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-black text-[#10b981] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#10b981]/20">
                  {item?.matchId ? String(item.matchId).slice(-4) : 'MID'}
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase truncate pr-6">
                  {item?.matchName || "Unknown Match"}
                </p>
              </div>

              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-white font-black italic text-base uppercase tracking-tight">
                    {item?.selection || "N/A"}
                  </p>
                  <p className="text-[9px] text-[#10b981] font-bold uppercase tracking-widest">
                    {item?.marketName || 'Match Result'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-[1000] text-white text-sm bg-white/5 px-2 py-1 rounded-md tabular-nums">
                    {parseFloat(item?.odds || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER TOTALS */}
      <div className="bg-[#0b0f1a] rounded-[2rem] p-6 border border-white/5 space-y-5 shadow-inner">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div className="flex items-center gap-2 opacity-40">
            <UserCheck size={12} className="text-[#10b981]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">Cashier</span>
          </div>
          <span className="text-[10px] font-black text-[#10b981] uppercase">
            {user?.username || 'Admin'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 opacity-40">
            <Percent size={12} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Odds</span>
          </div>
          <span className="text-xl font-black italic text-white tabular-nums">
            {totalOdds.toFixed(2)}
          </span>
        </div>

        {/* STAKE INPUT */}
        <div className="space-y-2">
          <div className="relative">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">KES</span>
             <input 
               type="number" 
               step="any"
               placeholder="0"
               value={stake} 
               onChange={(e) => onStakeChange(e.target.value)} 
               disabled={isProcessing} 
               className="w-full bg-white/5 border-2 border-white/5 rounded-2xl pl-12 pr-4 py-4 text-2xl font-black text-[#10b981] outline-none focus:border-[#10b981] transition-all disabled:opacity-50 placeholder:text-white/5" 
             />
          </div>
        </div>

        {/* POTENTIAL PAYOUT */}
        <div className="pt-5 border-t border-white/5">
          <div className="flex justify-between items-end text-right">
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Potential Payout</span>
            </div>
            <span className="text-3xl font-black italic text-white leading-none tabular-nums">
              {new Intl.NumberFormat('en-KE', { 
                style: 'currency', 
                currency: 'KES', 
                minimumFractionDigits: 0 
              }).format(potentialPayout)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
