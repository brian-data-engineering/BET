import React from 'react';

const StatsGrid = ({ history }) => {
  // Count frequency of each number in the last 200 rounds
  const counts = history.reduce((acc, curr) => {
    acc[curr.num] = (acc[curr.num] || 0) + 1;
    return acc;
  }, {});

  const renderCell = (num) => {
    const frequency = counts[num] || 0;
    // Simple logic: if frequency > average, make it "hot" (yellow)
    const isHot = frequency > (history.length / 37) + 1;

    return (
      <div key={num} className={`border p-2 text-center text-xs flex flex-col ${isHot ? 'bg-yellow-600' : 'bg-gray-900 text-white'}`}>
        <span className="font-bold">{num}</span>
        <span className="text-[10px] opacity-70">{frequency}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-12 gap-1 bg-black p-2 rounded">
      {/* Zero is special */}
      <div className="col-span-12 bg-green-700 text-center py-1 text-white border border-white">0</div>
      {Array.from({ length: 36 }, (_, i) => renderCell(i + 1))}
    </div>
  );
};

export default StatsGrid;
