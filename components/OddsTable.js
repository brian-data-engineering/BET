import React from 'react';

export default function OddsTable({ 
  odds = [],          // This is now the markets array from your JSONB column
  onSelect, 
  selectedId, 
  marketType = "1X2", // Tell the component which market to show
  homeTeam, 
  awayTeam 
}) {
  
  // 1. Find the specific market we want (e.g., "1X2", "Both teams to score", "Over/Under")
  const selectedMarket = odds.find(m => 
    m.market_name.toLowerCase().includes(marketType.toLowerCase()) || 
    String(m.sub_type_id) === marketType
  );

  // 2. Extract the outcomes (the actual odds) from that market
  const outcomes = selectedMarket?.odds || [];

  // 3. Logic to find specific outcomes (1, X, 2 or Yes, No or Over, Under)
  const findOdd = (label) => {
    return outcomes.find(o => {
      const display = String(o.display || "").toUpperCase();
      const key = String(o.odd_key || "").toLowerCase();
      
      // Match Winner Logic
      if (label === '1') return display === '1' || (homeTeam && key.includes(homeTeam.toLowerCase()));
      if (label === 'X') return display === 'X' || key.includes('draw');
      if (label === '2') return display === '2' || (awayTeam && key.includes(awayTeam.toLowerCase()));
      
      // BTTS / Over-Under Logic
      if (label.toLowerCase() === 'yes') return display === 'YES' || key.includes('gg');
      if (label.toLowerCase() === 'no') return display === 'NO' || key.includes('ng');
      if (label.toLowerCase() === 'over') return display.includes('OVER');
      if (label.toLowerCase() === 'under') return display.includes('UNDER');
      
      return false;
    });
  };

  // Determine which buttons to show based on marketType
  let displayConfig = [];
  if (marketType === "1X2") {
    displayConfig = [{ label: '1', data: findOdd('1') }, { label: 'X', data: findOdd('X') }, { label: '2', data: findOdd('2') }];
  } else if (marketType.includes("Both")) {
    displayConfig = [{ label: 'YES', data: findOdd('yes') }, { label: 'NO', data: findOdd('no') }];
  } else if (marketType.includes("Over")) {
    displayConfig = [{ label: 'OVER', data: findOdd('over') }, { label: 'UNDER', data: findOdd('under') }];
  }

  return (
    <div className={`grid gap-1.5 w-full ${displayConfig.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {displayConfig.map((item, idx) => {
        const odd = item.data;
        const isSelected = odd && selectedId === odd.odd_key;
        const price = odd?.value ? parseFloat(odd.value).toFixed(2) : "—";

        return (
          <button 
            key={idx} 
            disabled={!odd}
            onClick={() => odd && onSelect(odd)}
            className={`h-11 flex flex-col items-center justify-center rounded-md transition-all border font-black text-xs italic ${
              !odd ? 'opacity-20 bg-transparent border-white/5' :
              isSelected 
                ? 'bg-[#10b981] border-[#10b981] text-white shadow-lg' 
                : 'bg-[#1c2636] border-white/5 text-slate-200 hover:bg-[#253247]'
            }`}
          >
            {/* Added a small label for Deep Markets so users know which is Yes/No */}
            {marketType !== "1X2" && <span className="text-[8px] uppercase opacity-60 not-italic mb-0.5">{item.label}</span>}
            <span className="tabular-nums">{price}</span>
          </button>
        );
      })}
    </div>
  );
}
