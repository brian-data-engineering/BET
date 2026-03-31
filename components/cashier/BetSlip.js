import { Trash2, Ticket } from 'lucide-react';

export default function Betslip({ cart, stake, onStakeChange, onRemove, onClear, isProcessing }) {
  const totalOdds = cart.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1);
  const potentialPayout = (parseFloat(stake) || 0) * totalOdds;

  return (
    <div className="flex flex-col h-full bg-[#111926]/40 backdrop-blur-md border-l border-white/5 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[#10b981] font-black italic uppercase tracking-widest text-sm">Betslip</h3>
        <button onClick={onClear} className="text-white/20 hover:text-red-400 transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Scrollable Selections Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6 custom-scrollbar pr-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <Ticket size={48} />
            <p className="text-[10px] font-bold uppercase mt-4">Slip is empty</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div key={idx} className="bg-white/5 rounded-2xl p-4 border border-white/5 relative group">
              <button 
                onClick={() => onRemove(idx)} 
                className="absolute top-2 right-2 text-white/10 group-hover:text-red-400"
              >
                ×
              </button>
              <p className="text-[9px] font-bold text-white/30 uppercase truncate pr-4">{item.matchName}</p>
              <div className="flex justify-between items-end mt-2">
                <div>
                  <span className="text-[#10b981] font-black italic text-lg">{item.selection}</span>
                  <span className="text-[10px] text-white/40 ml-2">[{item.marketName || '1X2'}]</span>
                </div>
                <span className="font-black text-white/90">@{parseFloat(item.odds).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Financials Summary */}
      <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
          <span>Total Odds</span>
          <span className="text-[#10b981]">{totalOdds.toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Stake (KES)</label>
          <input 
            type="number"
            value={stake}
            onChange={(e) => onStakeChange(e.target.value)}
            disabled={isProcessing}
            placeholder="0.00"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-black text-[#10b981] outline-none focus:border-[#10b981]/50 transition-all"
          />
        </div>

        <div className="pt-4 border-t border-white/5">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Potential Payout</span>
            <span className="text-2xl font-black italic text-white leading-none">
              {new Intl.NumberFormat('en-KE').format(potentialPayout.toFixed(2))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
