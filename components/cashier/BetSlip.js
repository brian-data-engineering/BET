import { Trash2, Ticket, Percent, Store, Zap } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export default function Betslip({ cart = [], setCart, stake, onStakeChange, onRemove, onClear, onProcess, isProcessing, user }) {
  
  useEffect(() => {
    if (isProcessing || !cart?.length) return;
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const hasExpired = cart.some(item => item.startTime && (new Date(item.startTime).getTime() - now) < 60000);
      if (hasExpired) {
        setCart(prev => prev.filter(item => !item.startTime || (new Date(item.startTime).getTime() - now) > 60000));
      }
    }, 5000);
    return () => clearInterval(checkInterval);
  }, [cart, isProcessing, setCart]);

  const totalOdds = useMemo(() => cart.reduce((acc, item) => acc * parseFloat(item?.odds || 1), 1), [cart]);
  const potentialPayout = useMemo(() => (parseFloat(stake) || 0) * totalOdds, [stake, totalOdds]);

  return (
    <div className="flex flex-col h-full bg-[#111926]/40 backdrop-blur-md border-l border-white/5 p-6">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-white font-black italic uppercase text-lg">Active Slip</h3>
        {cart.length > 0 && <button onClick={onClear} className="text-white/20 hover:text-red-500"><Trash2 size={20} /></button>}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-6">
        {cart.map((item, idx) => (
          <div key={`${item.matchId}-${idx}`} className="bg-[#1c2636] rounded-2xl p-4 relative border border-white/5">
            <button onClick={() => onRemove(idx)} className="absolute top-3 right-3 text-white/20">×</button>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{item.matchName}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-white font-black italic">{item.selection}</p>
                <p className="text-[9px] text-yellow-500 font-bold uppercase">{item.marketName}</p>
              </div>
              <span className="font-mono font-bold text-white bg-white/5 px-2 rounded">@{parseFloat(item.odds).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#0b0f1a] rounded-[2rem] p-6 border border-white/5 space-y-4">
        <div className="flex justify-between text-white font-black italic"><span>ODDS</span><span>{totalOdds.toFixed(2)}</span></div>
        <div className="relative">
           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">KSh</span>
           <input type="number" value={stake} onChange={(e) => onStakeChange(e.target.value)} className="w-full bg-white/5 border-2 border-white/5 rounded-2xl pl-12 py-4 text-2xl font-black text-yellow-500 outline-none focus:border-yellow-500" />
        </div>
        <div className="flex justify-between text-white">
          <span className="text-[10px] font-black uppercase text-slate-500">Payout</span>
          <span className="text-2xl font-black italic">{potentialPayout.toLocaleString()}</span>
        </div>
        <button onClick={onProcess} disabled={isProcessing || !cart.length || !stake} className="w-full bg-yellow-500 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2">
          {isProcessing ? <Zap className="animate-spin" /> : <>PLACE TICKET <Zap size={20} fill="currentColor" /></>}
        </button>
      </div>
    </div>
  );
}
