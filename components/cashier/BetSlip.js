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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-white/5 bg-[#111926] p-4 shadow-2xl mt-4 rounded-3xl">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[100px] -mr-16 -mt-16 pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500 rounded-xl shadow-lg shadow-yellow-500/20">
            <Ticket size={16} className="text-black" />
          </div>
          <div>
            <h3 className="text-white font-black italic uppercase text-sm tracking-tighter leading-none">Terminal Slip</h3>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Cashier: {user?.username || 'Active'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {items.length > 0 && !isProcessing && (
            <button 
              onClick={clearSlip} 
              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Games List */}
      <div className="mb-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700">
            <div className="p-4 border-2 border-dashed border-white/5 rounded-[1.5rem] flex flex-col items-center">
              <Zap size={32} className="mb-2 opacity-20" />
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-center">Empty</p>
            </div>
          </div>
        ) : (
          items.map((item, idx) => (
            <div 
              key={`${item.id}-${idx}`} 
              className={`bg-white/5 rounded-xl p-3 border border-white/5 relative group transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-white/20 hover:bg-white/[0.07]'}`}
            >
              {!isProcessing && (
                <button 
                  onClick={() => removeItem(idx)} 
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white/30 hover:text-red-500 hover:bg-black transition-all text-xs"
                >
                  ×
                </button>
              )}
              
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[8px] bg-white/10 text-slate-400 px-1 py-0.5 rounded font-bold uppercase tracking-tighter">
                  {item.sport_key || 'Soccer'}
                </span>
                <span className="text-[8px] text-slate-500 font-bold truncate max-w-[120px]">
                  {item.display_league}
                </span>
              </div>

              <p className="text-xs font-black text-white italic mb-1 truncate pr-5">
                {item.matchName || `${item.homeTeam} v ${item.awayTeam}`}
              </p>
              
              <div className="flex justify-between items-end mt-1">
                <div className="flex items-center gap-2">
                  <div className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="text-yellow-500 font-black text-[9px] uppercase leading-none">{item.selection}</p>
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none">Winner</p>
                </div>
                <p className="font-mono font-black text-white text-xs leading-none">@{parseFloat(item.odds || 0).toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Financial Controls */}
      <div className="mt-auto shrink-0 space-y-3">
        
        {/* Stake Input */}
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col">
            <span className="text-[8px] font-black text-slate-500 uppercase leading-none mb-0.5">STAKE</span>
            <span className="text-xs font-black text-white leading-none">KSh</span>
          </div>
          <input 
            type="number" 
            placeholder="0.00" 
            disabled={isProcessing || !items.length}
            value={stake} 
            onChange={(e) => setStake(e.target.value)} 
            className={`w-full bg-black border-2 rounded-xl pl-16 pr-4 py-3 text-2xl font-black text-yellow-500 outline-none transition-all tabular-nums placeholder:opacity-10
              ${isInsufficientFloat ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5 focus:border-yellow-500'}`}
          />
        </div>

        {/* Est. Payout */}
        <div className="flex justify-between items-center px-1">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Return</span>
            <span className="text-[9px] font-black text-slate-600 uppercase italic leading-none mt-1">Odds: {totalOdds.toFixed(2)}</span>
          </div>
          <span className="text-2xl font-black italic text-white tabular-nums leading-none">
            {potentialPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Error Handling UI */}
        {isOverLimit && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-[8px] font-bold text-red-500 uppercase leading-tight">
              Limit: {selectionLimit} Games.
            </p>
          </div>
        )}

        {/* Execution Button */}
        <button 
          onClick={onProcess} 
          disabled={isProcessing || !items.length || !stake || isInsufficientFloat || isOverLimit} 
          className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl relative group overflow-hidden
            ${isProcessing ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-yellow-500 hover:bg-yellow-400 text-black font-black'}
            ${(isInsufficientFloat || isOverLimit) && !isProcessing ? 'bg-red-500/20 text-red-500 border border-red-500/50' : ''}`}
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span className="uppercase tracking-tighter text-sm italic">Issuing...</span>
            </>
          ) : isOverLimit ? (
            <span className="uppercase tracking-tighter text-sm italic">Limit Exceeded</span>
          ) : isInsufficientFloat ? (
            <span className="uppercase tracking-tighter text-sm italic">Low Balance</span>
          ) : (
            <>
              <span className="text-lg uppercase tracking-tighter italic">Process Ticket</span>
              <Printer size={18} />
            </>
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
