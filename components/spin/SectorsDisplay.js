import React from 'react';

const SectorsDisplay = ({ history }) => {
  const sectors = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  const getSectorStats = (label) => {
    const count = history.filter(h => h.sector === label).length;
    return (count / history.length * 100).toFixed(1);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-800 text-white rounded">
      <h3 className="text-sm font-bold border-b border-gray-600 pb-1">SECTOR FREQUENCY (%)</h3>
      <div className="grid grid-cols-6 gap-2 text-center">
        {sectors.map(s => (
          <div key={s}>
            <div className="text-xs">{s}</div>
            <div className="bg-blue-600 h-16 relative">
              <div 
                className="absolute bottom-0 w-full bg-blue-400" 
                style={{ height: `${getSectorStats(s)}%` }}
              ></div>
            </div>
            <div className="text-[10px]">{getSectorStats(s)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectorsDisplay;
