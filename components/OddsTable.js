export default function OddsTable({ odds }) {
  // Filter for common 1X2 market outcomes
  const mainMarket = odds.filter(o => o.market_name === "1X2" || o.market_name === "Match Winner");

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {mainMarket.map((odd, idx) => (
        <button 
          key={idx} 
          className="bg-slate-900/50 border border-gray-800 p-3 rounded-lg flex flex-col items-center hover:border-lucra-green hover:bg-slate-800 transition-all group"
        >
          <span className="text-[10px] text-gray-500 uppercase font-bold group-hover:text-gray-400">
            {odd.display}
          </span>
          <span className="text-lucra-green font-black text-lg">
            {parseFloat(odd.value).toFixed(2)}
          </span>
        </button>
      ))}
      
      {mainMarket.length === 0 && (
        <p className="col-span-3 text-center text-gray-600 text-xs py-4 italic">
          Market currently suspended
        </p>
      )}
    </div>
  );
}
