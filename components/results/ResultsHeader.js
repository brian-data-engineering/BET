export default function ResultsHeader({ activeDate, activeSport }) {
  return (
    <div className="bg-[#1a231f] border-b border-white/5 flex items-center p-2 text-[11px] font-bold sticky top-[64px] z-30">
      <span className="text-slate-400 px-2">Date</span>
      <div className="bg-[#444] px-2 py-0.5 rounded text-white mx-1 cursor-pointer hover:bg-[#555]">
        {activeDate || 'Today'}
      </div>
      <span className="text-slate-400 px-2 ml-2">Sport</span>
      <div className="bg-[#444] px-4 py-0.5 rounded text-white mx-1 cursor-pointer hover:bg-[#555]">
        {activeSport || 'All'}
      </div>
    </div>
  );
}
