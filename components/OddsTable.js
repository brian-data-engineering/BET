export default function OddsTable({ odds = [], onSelect, selectedId }) {
  // 1. Filter for the main market (1X2 / sub_type_id 1)
  const mainMarketRaw = odds.filter(o => 
    o.market_name === "1X2" || 
    o.market_name === "Match Winner" || 
    o.sub_type_id === 1 ||
    o.sub_type_id === "1"
  );

  // 2. SORTING LOGIC: This ensures the order is ALWAYS [1, X, 2]
  const orderMap = { '1': 1, 'X': 2, '2': 3 };
  
  const mainMarket = mainMarketRaw.sort((a, b) => {
    // We look at the 'display' column since that holds '1', 'X', '2'
    return (orderMap[a.display] || 99) - (orderMap[b.display] || 99);
  }).slice(0, 3);

  return (
    <div className="grid grid-cols-3 gap-2">
      {mainMarket.length > 0 ? (
        mainMarket.map((odd, idx) => {
          const isSelected = selectedId === odd.odd_key;
          // Safety: Make sure value is a number to avoid NaN
          const displayValue = odd.value ? parseFloat(odd.value).toFixed(2) : "1.00";

          return (
            <button 
              key={odd.id || idx} 
              onClick={() => onSelect(odd)}
              className={`group flex flex-col items-center p-2.5 rounded-xl border transition-all duration-200 ${
                isSelected 
                  ? 'bg-lucra-green border-lucra-green shadow-[0_0_15px_rgba(0,255,135,0.2)]' 
                  : 'bg-slate-900/40 border-gray-800 hover:border-gray-600 hover:bg-slate-800'
              }`}
            >
              {/* Box Header (1, X, or 2) */}
              <span className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 ${
                isSelected ? 'text-black/60' : 'text-gray-500 group-hover:text-gray-400'
              }`}>
                {odd.display}
              </span>
              
              {/* The Actual Odd Value */}
              <span className={`text-sm font-black tabular-nums ${
                isSelected ? 'text-black' : 'text-lucra-green'
              }`}>
                {displayValue}
              </span>
            </button>
          );
        })
      ) : (
        <div className="col-span-3 h-12 flex items-center justify-center bg-slate-900/10 rounded-xl border border-dashed border-gray-800/50">
          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic text-center px-2">
            Market Unavailable
          </span>
        </div>
      )}
    </div>
  );
}
