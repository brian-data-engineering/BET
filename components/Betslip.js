import { Ticket, X, Trash2, Zap } from 'lucide-react';

export default function Betslip({ items = [], setItems }) {
  // 1. Remove a specific selection
  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  // 2. Clear all selections
  const clearAll = () => setItems([]);

  // 3. Calculate Total Odds (Multiplicative for parlays/accumulators)
  const totalOdds = items.reduce((acc, item) => acc * parseFloat(item.odds), 1).toFixed(2);

  return (
    <div className="bg-lucra-card border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-fit sticky top-24 shadow-2xl">
      
      {/* HEADER */}
      <div className="bg-gray-800/30 p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-lucra-green" />
          <h4 className="font-black text-xs uppercase tracking-widest text-gray-100">Betslip</h4>
          {items.length > 0 && (
            <span className="bg-lucra-green text-black text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button 
            onClick={clearAll}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Clear All"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4">
        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
              <Ticket size={24} className="text-gray-700" />
            </div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-tight">Empty Slip</p>
            <p className="text-gray-600 text-[10px] mt-1 px-6">Select some odds to start building your winning bet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* SELECTION CARDS */}
            <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
              {items.map((item) => (
                <div key={item.id} className="bg-slate-900/80 border border-gray-800 p-3 rounded-xl relative group hover:border-gray-700 transition-all">
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 text-gray-600 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                  
                  <span className="text-[9px] text-lucra-green font-black uppercase tracking-tighter">
                    {item.matchName}
                  </span>
                  
                  <div className="flex justify-between items-end mt-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-200">
                        {item.selection}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        Match Winner
                      </span>
                    </div>
                    <span className="text-sm font-black text-white tabular-nums">
                      {parseFloat(item.odds).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* TOTALS & SUMMARY */}
            <div className="pt-4 mt-4 border-t border-gray-800 space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-gray-500 uppercase">Total Odds</span>
                <span className="text-lg font-black text-lucra-green tabular-nums">
                  {totalOdds}
                </span>
              </div>

              {/* ACTION BUTTON */}
              <button className="w-full bg-lucra-green hover:bg-white text-black font-black py-4 rounded-xl mt-2 shadow-lg shadow-lucra-green/5 flex items-center justify-center gap-2 transition-all active:scale-95 group">
                <Zap size={18} className="fill-current group-hover:scale-110 transition-transform" />
                PLACE BET
              </button>

              <p className="text-[9px] text-center text-gray-600 uppercase font-bold tracking-widest mt-2">
                Lucra Betting Protocol v1.0
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
