import { Trash2, Ticket, Zap, AlertCircle } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export default function Betslip({ 
  cart = [], 
  setCart, 
  stake, 
  onStakeChange, 
  onRemove, 
  onClear, 
  onProcess, 
  isProcessing, 
  user 
}) {
  
  // 1. DYNAMIC LIMIT CHECK
  // Fetches the limit from the user profile (Operator's preference) or defaults to 20
  const selectionLimit = user?.cashier_selection_limit || 20;
  const isOverLimit = cart.length > selectionLimit;

  // Auto-Expiry Logic
  useEffect(() => {
    if (isProcessing || !cart?.length) return;
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const needsUpdate = cart.some(item => 
        item.startTime && (new Date(item.startTime).getTime() - now) < 30000 
      );
      if (needsUpdate) {
        setCart(prev => prev.filter(item => 
          !item.startTime || (new Date(item.startTime).getTime() - now) > 30000
        ));
      }
    }, 5000);
    return () => clearInterval(checkInterval);
  }, [cart, isProcessing, setCart]);

  // 2. RECALCULATE ODDS ON EVERY CART CHANGE
  const totalOdds = useMemo(() => 
    cart.reduce((acc, item) => acc * parseFloat(item?.odds || 1), 1), 
  [cart]);

  // 3. RECALCULATE PAYOUT ON STAKE OR ODDS CHANGE
  // This ensures that if the cashier changes 100 to 50, the payout updates instantly
  const potentialPayout = useMemo(() => 
    (parseFloat(stake) || 0) * totalOdds, 
  [stake, totalOdds]);

  const isInsufficientFloat = useMemo(() => 
    (parseFloat(stake) || 0) > (user?.balance || 0), 
  [stake, user?.balance]);

  return (
    <div className="flex flex-col h-full bg-[#111926]/40 backdrop-blur-md border-l border-white/5 p-6 shadow-2xl relative">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Ticket size={18} className="text-yellow-500" />
          </div>
          <h3 className="text-white font-black italic uppercase text-lg tracking-tighter">Current Slip</h3>
        </div>
        <div className="flex items-center gap-3">
           {/* Limit Indicator */}
           <span className={`text-[10px] font-bold px-2 py-1 rounded border ${isOverLimit ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-white/10 text-slate-400'}`}>
            {cart.length}/{selectionLimit} GAMES
          </span>
          {cart.length > 0 && !isProcessing && (
            <button 
              onClick={onClear} 
              className="text-white/20 hover:text-red-500 transition-all p-2 hover:bg-red-500/10 rounded-xl"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
            <Ticket size={64} className="animate-pulse" />
            <p className="text-[10px] font-black uppercase mt-4 tracking-[0.3em]">No Selection</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div 
              key={`${item.matchId}-${idx}`} 
              className={`bg-[#1c2636] rounded-2xl p-4 border border-white/5 relative group transition-all ${isProcessing ? 'opacity-50' : 'hover:border-white/20'}`}
            >
              {!isProcessing && (
                <button 
                  onClick={() => onRemove(idx)} 
                  className="absolute top-3 right-3 text-white/10 hover:text-red-500 text-xl font-bold"
                >
                  ×
                </button>
              )}
              <p className="text-[10px] font-bold text-slate-500 uppercase truncate pr-6 mb-1">{item.matchName}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white font-black italic text-base leading-tight">{item.selection}</p>
                  <p className="text-[9px] text-yellow-500 font-bold uppercase tracking-wider">
                    {item.marketName || 'Match Result'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-white bg-white/5 px-2 py-1 rounded text-sm">
                    @{parseFloat(item.odds || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Controls */}
      <div className="bg-[#0b0f1a] rounded-[2.5rem] p-6 border border-white/10 shadow-inner space-y-4">
        
        <div className="flex justify-between items-center px-2">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Combined Odds</span>
          <span className="text-xl font-black italic text-white tabular-nums">{totalOdds.toFixed(2)}</span>
        </div>

        <div className="relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">KSh</span>
          <input 
            type="number" 
            placeholder="0.00" 
            disabled={isProcessing || !cart.length}
            value={stake} 
            onChange={(e) => onStakeChange(e.target.value)} 
            className={`w-full bg-black/40 border-2 rounded-2xl pl-14 pr-4 py-5 text-3xl font-black text-yellow-500 outline-none transition-all tabular-nums
              ${isInsufficientFloat ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-yellow-500'}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <div className="flex justify-between items-center pt-2 px-2 border-t border-white/5 mt-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Return</span>
          <span className="text-3xl font-black italic text-white tabular-nums">
            {potentialPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <button 
          onClick={onProcess} 
          disabled={isProcessing || !cart.length || !stake || isInsufficientFloat || isOverLimit} 
          className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl
            ${isProcessing ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-yellow-500 hover:bg-yellow-400 text-black font-black'}
            ${(isInsufficientFloat || isOverLimit) && !isProcessing ? 'bg-red-500/20 text-red-500 border border-red-500/50' : ''}`}
        >
          {isProcessing ? (
            <>
              <Zap size={22} className="animate-spin text-yellow-500 fill-yellow-500" />
              <span className="uppercase tracking-tighter">Syncing Ledger...</span>
            </>
          ) : isOverLimit ? (
            <>
              <AlertCircle size={20} />
              <span className="uppercase tracking-tighter">Too many games</span>
            </>
          ) : isInsufficientFloat ? (
            <>
              <AlertCircle size={20} />
              <span className="uppercase tracking-tighter">Low Float</span>
            </>
          ) : (
            <>
              <span className="text-lg uppercase tracking-tighter">Place Ticket</span>
              <Zap size={22} fill="currentColor" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
