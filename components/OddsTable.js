import React from 'react';

export default function OddsTable({ odds = [], onSelect, selectedId, homeTeam, awayTeam }) {
  // 1. Filter for the main Match Winner market
  const mainMarketRaw = odds.filter(o => 
    o.market_name === "1X2" || 
    o.market_name === "Match Winner" || 
    String(o.sub_type_id) === "1"
  );

  // 2. BonusBet Logic: Simple finding
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

  const finalOdds = [
    { label: '1', data: findOdd('1') },
    { label: 'X', data: findOdd('X') },
    { label: '2', data: findOdd('2') }
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5 w-full">
      {finalOdds.map((item, idx) => {
        const odd = item.data;
        const isSelected = odd && selectedId === odd.odd_key;
        
        // BonusBet uses white/slate for unselected odds
        const price = odd?.value ? parseFloat(odd.value).toFixed(2) : "—";

        return (
          <button 
            key={idx} 
            disabled={!odd}
            onClick={() => odd && onSelect(odd)}
            className={`h-11 flex items-center justify-center rounded-md transition-all duration-150 border font-black text-xs italic ${
              !odd ? 'opacity-20 bg-transparent border-white/5' :
              isSelected 
                ? 'bg-[#10b981] border-[#10b981] text-white shadow-lg scale-[0.98]' 
                : 'bg-[#1c2636] border-white/5 text-slate-200 hover:bg-[#253247] hover:border-white/10'
            }`}
          >
            {/* BonusBet typically displays only the price in these small boxes */}
            <span className="tabular-nums">
              {price}
            </span>
          </button>
        );
      })}
    </div>
  );
}
