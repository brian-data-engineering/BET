export default function OddsTable({ odds = [], onSelect, selectedId }) {
  // Filter for 1X2 market (Home, Draw, Away)
  const mainMarket = odds.filter(o => 
    o.market_name === "1X2" || 
    o.market_name === "Match Winner" || 
    o.sub_type_id === "1"
  ).slice(0, 3);

  return (
    <div className="grid grid-cols-3 gap-2">
      {mainMarket.length > 0 ? (
        mainMarket.map((odd, idx) => {
          const isSelected = selectedId === odd.odd_key;

          return (
            <button 
              key={idx} 
              onClick={() => onSelect(odd)}
              className={`group flex flex-col items-center p-2.5 rounded-xl border transition-all duration-200 ${
                isSelected 
                  ? 'bg-lucra-green border-lucra-green shadow-[0_0_15px_rgba(0,255,135,0.2)]' 
                  : 'bg-slate-900/40 border-gray-800 hover:border-gray-600 hover:bg-slate-800'
              }`}
            >
              <span className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 ${
                isSelected ? 'text-black/60' : 'text-gray-500 group-hover:text-gray-400'
              }`}>
                {odd.display}
              </span>
              
              <span className={`text-sm font-black tabular-nums ${
                isSelected ? 'text-black' : 'text-lucra-green'
              }`}>
                {parseFloat(odd.value).toFixed(2)}
              </span>
            </button>
          );
        })
      ) : (
        <div className="col-span-3 h-12 flex items-center justify-center bg-slate-900/10 rounded-xl border border-dashed border-gray-800/50">
          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic">Locked</span>
        </div>
      )}
    </div>
  );
}
