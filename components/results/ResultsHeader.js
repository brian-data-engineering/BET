export default function ResultsHeader({ count = 0 }) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-[#1a231f] border-b border-white/5 flex items-center justify-between p-2 text-[11px] font-bold sticky top-[64px] z-30">
      <div className="flex items-center">
        <span className="text-slate-400 px-2">Date</span>
        <div className="bg-[#444] px-2 py-0.5 rounded text-white mx-1 cursor-default">
          {today}
        </div>
        <span className="text-slate-400 px-2 ml-2">Sport</span>
        <div className="bg-[#444] px-4 py-0.5 rounded text-white mx-1 cursor-default">
          All
        </div>
      </div>
      
      {count > 0 && (
        <div className="text-slate-500 text-[9px] pr-2">
          {count} Matches
        </div>
      )}
    </div>
  );
}
