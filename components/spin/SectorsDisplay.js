const SectorsDisplay = ({ history }) => {
  const sectors = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  const getSectorStats = (label) => {
    if (!history || history.length === 0) return 0;
    const count = history.filter(h => h.sector === label).length;
    return ((count / history.length) * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sector Frequency (%)</h3>
      <div className="grid grid-cols-6 gap-2">
        {sectors.map(s => {
          const percent = getSectorStats(s);
          return (
            <div key={s} className="flex flex-col items-center">
              <span className="text-[10px] font-bold mb-1">{s}</span>
              <div className="w-full bg-zinc-900 h-24 rounded-sm overflow-hidden relative border border-white/5">
                <div 
                  className="absolute bottom-0 w-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-1000" 
                  style={{ height: `${percent}%` }}
                ></div>
              </div>
              <span className="text-[9px] mt-1 font-mono text-blue-400">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default SectorsDisplay;
