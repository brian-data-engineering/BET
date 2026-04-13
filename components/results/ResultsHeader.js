export default function ResultsHeader({ count = 0, activeSport = 'Football' }) {
  // Format current time for a "Real-time" feel
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = time.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.');

  return (
    <div className="sticky top-0 bg-[#1a231f]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between p-3 text-[11px] font-bold z-30 shadow-xl">
      <div className="flex items-center gap-2">
        
        {/* Date Section - Visualizes the "Freshness" of Lucra data */}
        <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5">
          <span className="text-slate-500 px-1.5 font-black uppercase text-[8px] tracking-tighter">DATA FETCH</span>
          <div className="bg-[#2a352f] px-2 py-0.5 rounded text-slate-100 text-[10px] font-black tabular-nums">
            {todayStr}
          </div>
        </div>

        {/* Sport Section - Capitalized to match DB 'sport_type' */}
        <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5">
          <span className="text-slate-500 px-1.5 font-black uppercase text-[8px] tracking-tighter">ENGINE</span>
          <div className="bg-[#10b981] px-3 py-0.5 rounded text-[#0b0f1a] shadow-[0_0_10px_rgba(16,185,129,0.3)] capitalize font-black text-[10px] tracking-tight">
            {activeSport}
          </div>
        </div>
      </div>
      
      {/* Dynamic Record Count with Lucra branding */}
      <div className="flex items-center gap-3 pr-2">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-slate-400 text-[9px] font-black tracking-widest uppercase">
              {count} <span className="opacity-40 ml-0.5">Results</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
