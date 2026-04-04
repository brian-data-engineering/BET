import { Trash2, Ticket, Coins, Percent, UserCheck, Store } from 'lucide-react';
import { useEffect } from 'react';

export default function Betslip({ 
  cart, 
  setCart, 
  stake, 
  onStakeChange, 
  onRemove, 
  onClear, 
  isProcessing,
  user // Expecting { username: "...", email: "...", shop_name: "..." }
}) {
  
  // --- LUCRA AUTO-SYNC LOGIC (CASHIER SIDE) ---
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date().getTime();
      
      setCart(prevCart => {
        const filtered = prevCart.filter(item => {
          if (!item.startTime) return true;

          // Standardizing '2026-04-04T14:00:00+00:00' to Date object
          const matchDate = new Date(item.startTime).getTime();

          if (isNaN(matchDate)) return true;

          // Keep match only if kickoff is more than 60s away
          return (matchDate - now) > 60000; 
        });

        return filtered.length !== prevCart.length ? filtered : prevCart;
      });
    }, 3000); 

    return () => clearInterval(checkInterval);
  }, [setCart]);

  // Totals Calculation (Dynamic Odds)
  const totalOdds = cart.length > 0 
    ? cart.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1) 
    : 0;

  const numStake = parseFloat(stake) || 0;
  const potentialPayout = numStake * totalOdds;

  return (
    <div className="flex flex-col h-full bg-[#111926]/40 backdrop-blur-md border-l border-white/5 p-6 shadow-2xl">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-[#10b981]/10 p-2 rounded-lg">
            <Ticket size={16} className="text-[#10b981]" />
          </div>
          <div>
            <h3 className="text-white font-black italic uppercase tracking-tighter text-lg leading-none">Active Slip</h3>
            <div className="flex items-center gap-1 mt-1">
               <Store size={8} className="text-slate-500" />
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{user?.shop_name || 'Terminal #016'}</p>
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

      {/* SELECTIONS AREA */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-6 custom-scrollbar pr-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale">
            <Ticket size={64} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase mt-4 tracking-[0.3em]">Empty Slip</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div 
              key={idx} 
              className="bg-[#1c2636] rounded-2xl p-4 border border-white/5 relative group transition-all hover:border-[#10b981]/30 shadow-lg"
            >
              <button 
                onClick={() => onRemove(idx)} 
                className="absolute top-3 right-3 text-white/10 group-hover:text-red-500 transition-colors font-bold text-xl"
              >
                ×
              </button>
              
              {/* Match Name & MatchID Badge (Mapped to your scrapped matchId) */}
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-black text-[#10b981] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#10b981]/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                  {item.matchId?.toString().slice(-4) || 'MID'}
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase truncate pr-4">
                  {item.matchName}
                </p>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-white font-black italic text-base uppercase tracking-tight">
                    {item.selection}
                  </p>
                  <p className="text-[9px] text-[#10b981] font-bold uppercase tracking-widest">
                    {item.marketName || '1X2'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-white text-sm bg-white/5 px-2 py-1 rounded-md border border-white/5">
                    {parseFloat(item.odds).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="bg-[#0b0f1a] rounded-[2rem] p-6 border border-white/5 space-y-5 shadow-inner">
        
        {/* CASHIER IDENTITY (Dynamic from user profile) */}
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div className="flex items-center gap-2 opacity-40">
            <UserCheck size={12} className="text-[#10b981]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">Cashier</span>
          </div>
          <span className="text-[10px] font-black text-[#10b981] uppercase tracking-tighter">
            {user?.username || 'Lucra_Admin'}
          </span>
        </div>

        {/* Total Odds */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 opacity-40">
            <Percent size={12} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Odds</span>
          </div>
          <span className="text-xl font-black italic text-white tabular-nums">
            {totalOdds.toFixed(2)}
          </span>
        </div>

        {/* Stake Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 opacity-40">
            <Coins size={12} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest">Stake Amount</span>
          </div>
          <div className="relative">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">KES</span>
             <input 
              type="number"
              value={stake}
              onChange={(e) => onStakeChange(e.target.value)}
              disabled={isProcessing}
              placeholder="0.00"
              className="w-full bg-white/5 border-2 border-white/5 rounded-2xl pl-12 pr-4 py-4 text-2xl font-black text-[#10b981] outline-none focus:border-[#10b981] transition-all placeholder:text-white/10"
            />
          </div>
        </div>

        {/* Payout Calculation */}
        <div className="pt-5 border-t border-white/5">
          <div className="flex justify-between items-end">
            <div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Potential Payout</span>
               <span className="text-[8px] font-bold text-[#10b981] uppercase">Pre-tax Estimate</span>
            </div>
            <div className="text-right">
               <span className="text-3xl font-black italic text-white tabular-nums leading-none">
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
    </div>
  );
}
