import { Trophy, Dribbble, CircleDot, Activity, ChevronRight } from 'lucide-react';

export default function ResultsSidebar({ activeSport, setActiveSport }) {
  const sports = [
    { id: 'soccer', name: 'Football', icon: <Trophy size={16} /> },
    { id: 'basketball', name: 'Basketball', icon: <Dribbble size={16} /> },
    { id: 'ice-hockey', name: 'Ice Hockey', icon: <Activity size={16} /> },
    { id: 'table-tennis', name: 'Table Tennis', icon: <CircleDot size={16} /> },
  ];

  return (
    <aside className="
      flex flex-col w-full lg:w-64 
      bg-[#0b0f1a] lg:bg-transparent 
      p-2 lg:p-0 gap-1 
      sticky top-[0px] lg:top-[105px] 
      z-40 lg:z-auto
    ">
      {/* 1. Header: Hidden on mobile to save vertical space */}
      <div className="hidden lg:flex px-3 mb-4 items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" />
           <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
             Live Results
           </h3>
        </div>
      </div>

      {/* 2. Sports List: Horizontal scroll on mobile, Vertical list on desktop */}
      <div className="
        flex flex-row lg:flex-col 
        gap-2 lg:gap-1.5 
        overflow-x-auto lg:overflow-x-visible 
        pb-2 lg:pb-0 
        scrollbar-hide
      ">
        {sports.map((sport) => {
          const isActive = activeSport === sport.id;
          
          return (
            <button
              key={sport.id}
              onClick={() => setActiveSport(sport.id)}
              className={`
                flex items-center justify-between 
                px-4 py-2.5 lg:py-3 
                rounded-xl transition-all duration-200 
                shrink-0 lg:shrink 
                group border
                ${isActive 
                  ? 'bg-[#1a231f] border-[#10b981]/30 text-[#10b981] shadow-lg shadow-black/40' 
                  : 'bg-white/5 lg:bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }
              `}
            >
              <div className="flex items-center gap-3 text-[12px] lg:text-[13px] font-black tracking-tight">
                <span className={`transition-colors ${isActive ? 'text-[#10b981]' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {sport.icon}
                </span>
                <span className="whitespace-nowrap">{sport.name}</span>
              </div>
              
              {/* Chevron hidden on mobile to keep buttons compact */}
              {isActive && (
                <ChevronRight size={14} className="hidden lg:block opacity-50 animate-in slide-in-from-left-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Sidebar Footer: Hidden on mobile */}
      <div className="hidden lg:block mt-6 px-4 py-4 rounded-2xl bg-gradient-to-br from-[#111926] to-[#0b0f1a] border border-white/5">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
            Showing settled results for the last 24 hours.
          </p>
          <div className="h-[1px] w-full bg-white/5" />
          <p className="text-[9px] text-[#10b981]/60 font-medium">
            Data updates automatically
          </p>
        </div>
      </div>
    </aside>
  );
}
