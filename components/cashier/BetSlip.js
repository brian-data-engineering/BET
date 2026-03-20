// Ensure 'Zap' is in the list of imports at the very top
import { Ticket, Trash2, Printer, AlertCircle, Zap } from 'lucide-react';

export default function BetSlip({ cart, onRemove, stake, setStake, onPrint }) {
  
  // 1. SAFE MATH HELPERS
  const parseValue = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 1.00 : parsed;
  };

  const calculateTotalOdds = () => {
    if (cart.length === 0) return (0).toFixed(2);
    const total = cart.reduce((acc, item) => {
      // Handles both 'odd' and 'odds' keys just in case
      const val = parseValue(item.odds || item.odd);
      return acc * val;
    }, 1);
    return total.toFixed(2);
  };

  const totalOdds = calculateTotalOdds();
  
  // 2. POTENTIAL WIN CALCULATION
  const numericStake = parseFloat(stake) || 0;
  const potentialWin = (parseFloat(totalOdds) * numericStake).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col h-full text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black italic flex items-center gap-2 tracking-tighter">
          <Ticket className="text-lucra-green" size={20} /> TERMINAL SLIP
        </h2>
        <span className="bg-lucra-green/10 text-lucra-green border border-lucra-green/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          {cart.length} {cart.length === 1 ? 'Event' : 'Events'}
        </span>
      </div>

      {/* Selections List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {cart.length > 0 ? (
          cart.map((item) => (
            <div 
              key={item.matchId} 
              className="bg-white/5 border border-white/5 p-4 rounded-2xl relative animate-in fade-in slide-in-from-right-2 duration-300 group"
            >
              <button 
                onClick={() => onRemove(item.matchId)} 
                className="absolute right-3 top-3 text-gray-500 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              
              <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-tight truncate pr-6">
                {item.matchName || `${item.home} v ${item.away}`}
              </p>
              
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Selection</span>
                  <span className="text-lucra-green font-black text-sm uppercase">{item.selection}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-lg">@{parseValue(item.odds || item.odd).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-gray-600">
            <AlertCircle size={32} className="mb-2 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">Slip is empty</p>
          </div>
        )}
      </div>

      {/* Summary & Controls */}
      <div className="mt-6 space-y-4 pt-6 border-t border-white/10">
        <div className="flex justify-between font-black text-xs uppercase tracking-widest px-1">
          <span className="text-gray-500">Total Odds</span>
          <span className="text-lucra-green font-mono text-lg">{totalOdds}</span>
        </div>

        {/* Stake Input */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 focus-within:border-lucra-green/30 transition-all">
          <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Stake Amount (KES)</label>
          <div className="flex items-center">
            <span className="text-xl font-black text-gray-600 mr-2">KES</span>
            <input 
              type="number" 
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-3xl font-black outline-none text-white placeholder:text-white/10" 
            />
          </div>
        </div>

        {/* Payout Display */}
        <div className="bg-lucra-green shadow-[0_0_30px_rgba(0,255,135,0.15)] p-5 rounded-2xl text-black relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <Zap size={40} fill="currentColor" />
          </div>
          <p className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">Potential Payout</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-black">KES</span>
            <p className="text-3xl font-black tracking-tighter italic leading-none">
              {potentialWin}
            </p>
          </div>
        </div>

        {/* Print Button */}
        <button 
          onClick={onPrint}
          disabled={cart.length === 0 || numericStake <= 0}
          className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-lucra-green hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] transition-all disabled:opacity-10 disabled:grayscale cursor-pointer"
        >
          <Printer size={20} /> 
          <span className="uppercase tracking-widest text-sm">Print Ticket</span>
        </button>
      </div>
    </div>
  );
}
