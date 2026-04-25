const StatsGrid = ({ history }) => {
  const counts = history.reduce((acc, curr) => {
    acc[curr.num] = (acc[curr.num] || 0) + 1;
    return acc;
  }, {});

  const getNumColor = (n) => {
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    if (n === 0) return 'bg-green-600 border-green-400';
    return reds.includes(n) ? 'bg-red-600 border-red-400' : 'bg-zinc-900 border-zinc-700';
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Special 0 Row */}
      <div className={`col-span-3 p-2 rounded-lg border-2 text-center flex flex-col ${getNumColor(0)}`}>
        <span className="font-bold text-lg">0</span>
        <span className="text-[10px] font-mono opacity-80">{counts[0] || 0} hits</span>
      </div>
      {/* 1-36 Numbers */}
      {Array.from({ length: 36 }, (_, i) => i + 1).map(num => (
        <div key={num} className={`p-2 rounded-lg border-2 text-center flex flex-col ${getNumColor(num)}`}>
           <span className="font-bold">{num}</span>
           <span className="text-[9px] font-mono opacity-80">{counts[num] || 0}</span>
        </div>
      ))}
    </div>
  );
};
export default StatsGrid;
