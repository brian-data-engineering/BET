import { Trash2, Ticket, Zap, AlertCircle, Clock, Printer, Loader2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export default function Betslip({ 
  items = [],       
  setItems,         
  stake, 
  setStake,         
  onProcess, 
  isProcessing, 
  user,
  maxGames 
}) {
  
  // 1. DYNAMIC LIMIT CHECK
  const selectionLimit = maxGames || user?.cashier_selection_limit || 20;
  const isOverLimit = items.length > selectionLimit;

  // 2. LIVE AUTO-EXPIRY LOGIC
  // Automatically purges games that are about to start (30s buffer)
  useEffect(() => {
    if (isProcessing || !items?.length) return;
    
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = 30000; // 30 seconds
      
      const validItems = items.filter(item => {
        if (!item.startTime) return true; // Keep if no time provided
        const startTime = new Date(item.startTime).getTime();
        return (startTime - now) > cutoff;
      });

      if (validItems.length !== items.length) {
        setItems(validItems);
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [items, isProcessing, setItems]);

  // 3. CALCULATIONS
  const totalOdds = useMemo(() => 
    items.reduce((acc, item) => acc * parseFloat(item?.odds || 1), 1), 
  [items]);

  const potentialPayout = useMemo(() => 
    (parseFloat(stake) || 0) * totalOdds, 
  [stake, totalOdds]);

  const isInsufficientFloat = useMemo(() => 
    (parseFloat(stake) || 0) > (user?.balance || 0), 
  [stake, user?.balance]);

  // 4. ACTIONS
  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const clearSlip = () => {
    if (window.confirm("Clear all selections?")) {
      setItems([]);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-white/5 bg-[#111926] p-6 shadow-2xl">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[100px] -mr-16 -mt-16 pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500 rounded-xl shadow-lg shadow-yellow-500/20">
            <Ticket size={20} className="text-black" />
          </div>
          <div>
            <h3 className="text-white font-black italic uppercase text-lg tracking-tighter leading-none">Terminal Slip</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Cashier: {user?.username || 'Active'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {items.length > 0 && !isProcessing && (
            <button 
              onClick={clearSlip} 
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Games List */}
      <div className="mb-6 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700">
            <div className="p-6 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center">
              <Zap size={40} className="mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center">Waiting for selection</p>
            </div>
          </div>
        ) : (
          items.map((item, idx) => (
            <div 
              key={`${item.id}-${idx}`} 
              className={`bg-white/5 rounded-2xl p-4 border border-white/5 relative group transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-white/20 hover:bg-white/[0.07]'}`}
            >
              {!isProcessing && (
                <button 
                  onClick={() => removeItem(idx)} 
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white/30 hover:text-red-500 hover:bg-black transition-all"
                >
                  ×
                </button>
              )}
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                  {item.sport_key || 'Soccer'}
                </span>
                <span className="text-[9px] text-slate-500 font-bold truncate max-w-[150px]">
                  {item.display_league}
                </span>
              </div>

              <p className="text-sm font-black text-white italic mb-1 truncate pr-6">
                {item.matchName || `${item.homeTeam} v ${item.awayTeam}`}
              </p>
              
              <div className="flex justify-between items-end mt-2">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="text-yellow-500 font-black text-xs uppercase leading-none">{item.selection}</p>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{item.marketName || 'Result'}</p>
                </div>
                <p className="font-mono font-black text-white text-sm">@{parseFloat(item.odds || 0).toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Financial Controls */}
      <div className="mt-auto shrink-0 space-y-4">
        
        {/* Odds & Summary */}
        <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-slate-500 uppercase font-black text-[10px] tracking-widest">
            <Zap size={14} className="text-yellow-500" /> Total Odds
          </div>
          <span className="text-2xl font-black italic text-white tabular-nums">{totalOdds.toFixed(2)}</span>
        </div>

        {/* Stake Input */}
        <div className="relative group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase leading-none mb-0.5">Currency</span>
            <span className="text-sm font-black text-white">KSh</span>
          </div>
          <input 
            type="number" 
            placeholder="0.00" 
            disabled={isProcessing || !items.length}
            value={stake} 
            onChange={(e) => setStake(e.target.value)} 
            className={`w-full bg-black border-2 rounded-2xl pl-20 pr-6 py-6 text-4xl font-black text-yellow-500 outline-none transition-all tabular-nums placeholder:opacity-10
              ${isInsufficientFloat ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5 focus:border-yellow-500'}`}
          />
        </div>

        {/* Est. Payout */}
        <div className="flex justify-between items-center px-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Return</span>
          <span className="text-3xl font-black italic text-white tabular-nums">
            {potentialPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Error Handling UI */}
        {isOverLimit && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-pulse">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-[10px] font-bold text-red-500 uppercase leading-tight">
              Limit: {selectionLimit} Games. Remove {items.length - selectionLimit} to proceed.
            </p>
          </div>
        )}

        {/* Execution Button */}
        <button 
          onClick={onProcess} 
          disabled={isProcessing || !items.length || !stake || isInsufficientFloat || isOverLimit} 
          className={`w-full py-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl relative group overflow-hidden
            ${isProcessing ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-yellow-500 hover:bg-yellow-400 text-black font-black'}
            ${(isInsufficientFloat || isOverLimit) && !isProcessing ? 'bg-red-500/20 text-red-500 border border-red-500/50' : ''}`}
        >
          {isProcessing ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span className="uppercase tracking-tighter text-lg italic">Issuing...</span>
            </>
          ) : isOverLimit ? (
            <span className="uppercase tracking-tighter text-lg italic">Too Many Games</span>
          ) : isInsufficientFloat ? (
            <span className="uppercase tracking-tighter text-lg italic">Low Shop Balance</span>
          ) : (
            <>
              <span className="text-xl uppercase tracking-tighter italic">Process Ticket</span>
              <Printer size={22} />
            </>
          )}
          
          {/* Subtle Shine Effect */}
          {!isProcessing && !isOverLimit && !isInsufficientFloat && (
            <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-white/20 skew-x-[-25deg] group-hover:left-[150%] transition-all duration-700 ease-in-out" />
          )}
        </button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
