export default function ResultsHeader({ count = 0, activeSport = 'soccer' }) {
  // Format today's date for display in the header
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.');

  return (
    <div className="bg-[#1a231f]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between p-3 text-[11px] font-bold z-30 shadow-xl">
      <div className="flex items-center gap-2">
        
        {/* Date Section - Shows current sync context */}
        <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5">
          <span className="text-slate-500 px-1.5 font-black uppercase text-[8px] tracking-tighter">LATEST SYNC</span>
          <div className="bg-[#2a352f] px-2 py-0.5 rounded text-slate-100 text-[10px] font-black">
            {today}
          </div>
        </div>

        {/* Sport Section - Matches your activeSport state */}
        <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5">
          <span className="text-slate-500 px-1.5 font-black uppercase text-[8px] tracking-tighter">SPORT</span>
          <div className="bg-[#10b981] px-3 py-0.5 rounded text-[#0b0f1a] shadow-[0_0_10px_rgba(16,185,129,0.2)] capitalize font-black text-[10px]">
            {activeSport}
          </div>
        </div>
      </div>
      
      {/* Dynamic Record Count */}
      {count > 0 && (
        <div className="flex items-center gap-2 pr-2">
          <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse" />
          <div className="text-slate-400 text-[9px] font-black tracking-widest uppercase">
            {count} <span className="opacity-40 ml-0.5">Games Found</span>
          </div>
        </div>
      )}
    </div>
  );
}
