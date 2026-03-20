export default function OddsTable({ odds = [], onSelect, selectedId, homeTeam, awayTeam }) {
  // 1. Filter for the main 1X2 / Match Winner market
  const mainMarketRaw = odds.filter(o => 
    o.market_name === "1X2" || 
    o.market_name === "Match Winner" || 
    String(o.sub_type_id) === "1"
  );

  // 2. Smart Finding: Look for 1/X/2 OR check if the name matches the Team Name
  const findOdd = (type) => {
    return mainMarketRaw.find(o => {
      const display = String(o.display || "").toUpperCase();
      const key = String(o.odd_key || "").toLowerCase();
      
      if (type === '1') return display === '1' || (homeTeam && key.includes(homeTeam.toLowerCase()));
      if (type === 'X') return display === 'X' || key.includes('draw');
      if (type === '2') return display === '2' || (awayTeam && key.includes(awayTeam.toLowerCase()));
      return false;
    });
  };

  const homeOdd = findOdd('1');
  const drawOdd = findOdd('X');
  const awayOdd = findOdd('2');

  const finalOdds = [
    { label: '1', data: homeOdd },
    { label: 'X', data: drawOdd },
    { label: '2', data: awayOdd }
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {finalOdds.map((item, idx) => {
        const odd = item.data;
        const isSelected = odd && selectedId === odd.odd_key;
        
        // Use 1.00 as a placeholder if data is missing
        const price = odd?.value ? parseFloat(odd.value).toFixed(2) : "---";

        return (
          <button 
            key={idx} 
            disabled={!odd}
            onClick={() => odd && onSelect(odd)}
            className={`group flex flex-col items-center p-2.5 rounded-xl border transition-all duration-200 ${
              !odd ? 'opacity-40 cursor-not-allowed bg-slate-900/10 border-gray-900' :
              isSelected 
                ? 'bg-lucra-green border-lucra-green shadow-[0_0_15px_rgba(0,255,135,0.2)]' 
                : 'bg-slate-900/40 border-gray-800 hover:border-gray-600 hover:bg-slate-800'
            }`}
          >
            <span className={`text-[9px] font-black uppercase mb-0.5 ${
              isSelected ? 'text-black/60' : 'text-gray-500'
            }`}>
              {item.label}
            </span>
            
            <span className={`text-sm font-black tabular-nums ${
              isSelected ? 'text-black' : 'text-lucra-green'
            }`}>
              {price}
            </span>
          </button>
        );
      })}
    </div>
  );
}
