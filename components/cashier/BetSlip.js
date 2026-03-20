import { Ticket, Trash2, Printer } from 'lucide-react';

export default function BetSlip({ cart, onRemove, stake, setStake, onPrint }) {
  const totalOdds = cart.reduce((acc, item) => acc * item.odd, 1).toFixed(2);
  const potentialWin = (totalOdds * stake).toLocaleString();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black italic flex items-center gap-2">
          <Ticket className="text-lucra-green" size={20} /> SLIP
        </h2>
        <span className="bg-lucra-green text-black px-2 py-0.5 rounded text-[10px] font-black">{cart.length} EVENTS</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {cart.map((item) => (
          <div key={item.matchId} className="bg-black border border-gray-800 p-4 rounded-2xl relative animate-in slide-in-from-right-4">
            <button onClick={() => onRemove(item.matchId)} className="absolute right-3 top-3 text-gray-600 hover:text-red-500">
              <Trash2 size={14} />
            </button>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{item.home} v {item.away}</p>
            <div className="flex justify-between items-end">
              <span className="text-lucra-green font-black">Pick: {item.selection}</span>
              <span className="font-mono font-bold text-sm">@{item.odd}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4 pt-6 border-t border-gray-800">
        <div className="flex justify-between font-bold text-sm uppercase">
          <span className="text-gray-500">Total Odds</span>
          <span className="text-lucra-green">{totalOdds}</span>
        </div>
        <div className="bg-black p-4 rounded-2xl border border-gray-800">
          <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Stake Amount</label>
          <input 
            type="number" 
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="w-full bg-transparent text-2xl font-black outline-none" 
          />
        </div>
        <div className="bg-lucra-green p-5 rounded-2xl text-black">
          <p className="text-[10px] font-black uppercase opacity-60 mb-1">Potential Payout</p>
          <p className="text-3xl font-black tracking-tighter italic">KES {potentialWin}</p>
        </div>
        <button 
          onClick={onPrint}
          disabled={cart.length === 0}
          className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-lucra-green transition-all disabled:opacity-20 disabled:grayscale"
        >
          <Printer size={20} /> PRINT TICKET
        </button>
      </div>
    </div>
  );
}
