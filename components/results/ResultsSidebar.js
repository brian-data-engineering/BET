import { Trophy, Dribbble, CircleDot, Activity, ChevronRight, Zap } from 'lucide-react';

export default function ResultsSidebar({ activeSport, setActiveSport }) {
  const sports = [
    { id: 'soccer', name: 'Football', icon: <Trophy size={16} /> },
    { id: 'basketball', name: 'Basketball', icon: <Dribbble size={16} /> },
    { id: 'ice-hockey', name: 'Ice Hockey', icon: <Activity size={16} /> },
    { id: 'table-tennis', name: 'Table Tennis', icon: <CircleDot size={16} /> },
  ];

  return (
    <aside className="flex flex-col w-full lg:w-72 gap-4 lg:gap-6">
      
      {/* 1. Header Card - Visual anchor */}
      <div className="hidden lg:flex flex-col p-5 rounded-2xl bg-[#111926] border border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <Zap size={40} className="text-[#10b981]" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
             <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
               Lucra Engine
             </h3>
          </div>
          <p className="text-white text-[13px] font-black italic tracking-tight">SETTLED RESULTS</p>
        </div>
      </div>

      {/* 2. Sports List */}
      <div className="
        flex flex-row lg:flex-col 
        gap-2 lg:gap-2
        overflow-x-auto lg:overflow-x-visible 
        pb-2 lg:pb-0 
        scrollbar-hide
        px-1 lg:px-0
      ">
        {sports.map((sport) => {
          const isActive = activeSport === sport.id;
          
          return (
            <button
              key={sport.id}
              onClick={() => setActiveSport(sport.id)}
              className={`
                flex items-center justify-between 
                px-4 py-3 lg:py-4
                rounded-2xl transition-all duration-300 
                shrink-0 lg:shrink 
                group border relative overflow-hidden
                ${isActive 
                  ? 'bg-gradient-to-r from-[#1a231f] to-[#111926] border-[#10b981]/40 text-white shadow-xl translate-x-1' 
                  : 'bg-[#111926]/50 border-white/[0.03] text-slate-400 hover:border-white/10 hover:bg-[#1c2636]'
                }
              `}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10b981] shadow-[0_0_15px_#10b981]" />
              )}

              <div className="flex items-center gap-4 text-[12px] lg:text-[13px] font-black tracking-tight relative z-10">
                <span className={`
                  p-2 rounded-lg transition-all duration-300
                  ${isActive ? 'bg-[#10b981] text-[#0b0f1a] scale-110' : 'bg-white/5 text-slate-500 group-hover:text-slate-200'}
                `}>
                  {sport.icon}
                </span>
                <span className={`capitalize ${isActive ? 'text-white' : 'group-hover:text-white'}`}>
                  {sport.name}
                </span>
              </div>
              
              {isActive && (
                <div className="hidden lg:flex items-center gap-2 pr-1 animate-in fade-in slide-in-from-right-2">
                   <div className="w-1 h-1 bg-[#10b981] rounded-full" />
                   <ChevronRight size={14} className="text-[#10b981] opacity-50" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Status Info Card */}
      <div className="hidden lg:block">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#111926] to-transparent border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-black uppercase">Refresh</span>
            <span className="text-[10px] text-[#10b981] font-black uppercase">Auto-Live</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-slate-700 rounded-full" />
              <p className="text-[10px] text-slate-400 font-bold leading-none uppercase tracking-tighter">
                Last 150 records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-slate-700 rounded-full" />
              <p className="text-[10px] text-slate-400 font-bold leading-none uppercase tracking-tighter">
                24h Rolling Window
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
             <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-black text-slate-300 transition-colors uppercase tracking-widest">
                Support Center
             </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
