export default function ResultsHeader({ count = 0, activeSport = 'soccer' }) {
  // Get formatted date (e.g., 28.03.2026)
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.');

  return (
    <div className="bg-[#1a231f] border-b border-white/5 flex items-center justify-between p-2.5 text-[11px] font-bold sticky top-0 lg:top-[64px] z-30 shadow-md">
      <div className="flex items-center gap-1">
        {/* Date Label & Value */}
        <span className="text-slate-500 px-1 font-black uppercase text-[9px]">Date</span>
        <div className="bg-[#333] px-2 py-0.5 rounded text-slate-100 hover:bg-[#444] transition-colors cursor-pointer">
          {today}
        </div>

        {/* Dynamic Sport Label */}
        <span className="text-slate-500 px-1 ml-3 font-black uppercase text-[9px]">Sport</span>
        <div className="bg-[#10b981] px-3 py-0.5 rounded text-[#0b0f1a] shadow-sm capitalize">
          {activeSport}
        </div>
      </div>
      
      {/* Match Count Badge */}
      {count > 0 && (
        <div className="bg-black/20 px-2 py-0.5 rounded-full text-slate-400 text-[9px] font-black border border-white/5">
          {count} <span className="opacity-60 ml-0.5">MATCHES</span>
        </div>
      )}
    </div>
  );
}
