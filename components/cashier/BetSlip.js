import { Trash2, Ticket, Percent, UserCheck, Store, Zap } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export default function Betslip({ 
  cart = [], 
  setCart, 
  stake, 
  onStakeChange, 
  onRemove, 
  onClear, 
  onProcess, // Added this back
  isProcessing,
  user 
}) {
  
  // 1. AUTO-EXPIRY LOGIC
  useEffect(() => {
    if (isProcessing || !cart || cart.length === 0) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      setCart(prevCart => {
        if (!prevCart || prevCart.length === 0) return prevCart;
        const filtered = prevCart.filter(item => {
          if (!item?.startTime) return true;
          const matchDate = new Date(item.startTime).getTime();
          return (matchDate - now) > 60000; 
        });
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
          <div className="bg-yellow-500/10 p-2 rounded-lg">
            <Ticket size={16} className="text-yellow-500" />
          </div>
          <div>
            <h3 className="text-white font-black italic uppercase tracking-tighter text-lg leading-none">Active Slip</h3>
            <div className="flex items-center gap-1 mt-1">
               <Store size={8} className="text-slate-500" />
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                 {user?.shop_name || 'LUCRA TERMINAL'}
               </p>
            </div>
          </div>
        </div>
        {cart.length > 0 && (
          <button 
            onClick={onClear} 
            disabled={isProcessing} 
            className="text-white/20 hover:text-red-500 transition-all hover:scale-110 disabled:opacity-0"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* SELECTIONS LIST */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale">
            <Ticket size={64} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase mt-4 tracking-[0.3em]">Empty Slip</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div 
              key={`${item.matchId}-${idx}`} 
              className="bg-[#1c2636] rounded-2xl p-4 border border-white/5 relative group transition-all hover:border-yellow-500/30"
            >
              <button 
                onClick={() => onRemove(idx)} 
                disabled={isProcessing}
                className="absolute top-3 right-3 text-white/10 group-hover:text-red-500 font-bold text-xl transition-colors"
              >
                ×
              </button>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-black text-yellow-500 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-yellow-500/20">
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
                  <p className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest">
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
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">KSh</span>
             <input 
               type="number" 
               placeholder="Enter Stake"
               value={stake} 
               onChange={(e) => onStakeChange(e.target.value)} 
               disabled={isProcessing} 
               className="w-full bg-white/5 border-2 border-white/5 rounded-2xl pl-12 pr-4 py-4 text-2xl font-black text-yellow-500 outline-none focus:border-yellow-500 transition-all disabled:opacity-50" 
             />
          </div>
        </div>

        {/* POTENTIAL PAYOUT */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Potential Payout</span>
            <span className="text-2xl font-black italic text-white tabular-nums">
              {potentialPayout.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
          </div>

          {/* ACTION BUTTON (This was missing!) */}
          <button
            onClick={onProcess}
            disabled={isProcessing || cart.length === 0 || !stake}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-yellow-500/10"
          >
            {isProcessing ? (
              <Zap className="animate-spin" size={20} />
            ) : (
              <>PLACE TICKET <Zap size={20} fill="currentColor" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
