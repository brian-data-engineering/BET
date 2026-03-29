import React from 'react';
import { Lock } from 'lucide-react'; 

export default function OddsTable({ 
  odds = [], 
  onSelect, 
  selectedId, 
  marketType = "1X2",
  homeTeam, 
  awayTeam,
  locked = false 
}) {
  
  const selectedMarket = odds.find(m => 
    m.market_name.toLowerCase().includes(marketType.toLowerCase()) || 
    String(m.sub_type_id) === marketType
  );

  const outcomes = selectedMarket?.odds || [];

  const findOdd = (label) => {
    return outcomes.find(o => {
      const display = String(o.display || "").toUpperCase();
      const key = String(o.odd_key || "").toLowerCase();
      
      if (label === '1') return display === '1' || (homeTeam && key.includes(homeTeam.toLowerCase()));
      if (label === 'X') return display === 'X' || key.includes('draw');
      if (label === '2') return display === '2' || (awayTeam && key.includes(awayTeam.toLowerCase()));
      
      if (label.toLowerCase() === 'yes') return display === 'YES' || key.includes('gg');
      if (label.toLowerCase() === 'no') return display === 'NO' || key.includes('ng');
      if (label.toLowerCase() === 'over') return display.includes('OVER');
      if (label.toLowerCase() === 'under') return display.includes('UNDER');
      
      return false;
    });
  };

  let displayConfig = [];
  if (marketType === "1X2") {
    displayConfig = [{ label: '1', data: findOdd('1') }, { label: 'X', data: findOdd('X') }, { label: '2', data: findOdd('2') }];
  } else if (marketType.includes("Both")) {
    displayConfig = [{ label: 'YES', data: findOdd('yes') }, { label: 'NO', data: findOdd('no') }];
  } else if (marketType.includes("Over")) {
    displayConfig = [{ label: 'OVER', data: findOdd('over') }, { label: 'UNDER', data: findOdd('under') }];
  }

  return (
    <div className={`grid gap-2 w-full items-center ${displayConfig.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {displayConfig.map((item, idx) => {
        const odd = item.data;
        const isSelected = odd && selectedId === odd.odd_key;
        const price = odd?.value ? parseFloat(odd.value).toFixed(2) : "—";

        return (
          <button 
            key={idx} 
            disabled={!odd || locked} 
            onClick={() => odd && !locked && onSelect(odd)}
            className={`
              /* Pill Shape: h-10 on mobile, h-11 on desktop */
              h-10 sm:h-11 rounded-full flex flex-col items-center justify-center 
              transition-all duration-200 border-none font-bold text-xs relative overflow-hidden px-1
              ${
                !odd ? 'opacity-20 bg-transparent' :
                locked 
                  ? 'bg-[#0b0f1a]/50 text-slate-600 grayscale cursor-not-allowed' 
                  : isSelected 
                    ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20' 
                    : 'bg-[#1e293b] text-slate-200 hover:bg-[#2d3a4f]'
              }
            `}
          >
            {/* Show Lock Icon if match started */}
            {locked && odd && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                <Lock size={12} className="text-slate-500" />
              </div>
            )}

            {marketType !== "1X2" && !locked && (
               <span className="text-[7px] sm:text-[8px] uppercase opacity-60 mb-0.5 font-black">{item.label}</span>
            )}
            
            <span className={`tabular-nums tracking-tight ${locked ? 'blur-[1px] opacity-40' : ''}`}>
              {price}
            </span>
          </button>
        );
      })}
    </div>
  );
}
