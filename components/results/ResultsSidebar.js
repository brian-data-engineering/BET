import { Trophy, Dribbble, CircleDot, ChevronRight } from 'lucide-react';

export default function ResultsSidebar({ activeSport, setActiveSport }) {
  const sports = [
    { 
      id: 'soccer', 
      name: 'Football', 
      icon: <Trophy size={16} /> 
    },
    { 
      id: 'basketball', 
      name: 'Basketball', 
      icon: <Dribbble size={16} /> 
    },
    { 
      id: 'table-tennis', 
      name: 'Table Tennis', 
      icon: <CircleDot size={16} /> 
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#0b0f1a] p-2 gap-1 sticky top-[105px] h-fit">
      <div className="px-3 mb-4 flex items-center justify-between">
        <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
          All Sports
        </h3>
        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
      </div>

      <div className="flex flex-col gap-1.5">
        {sports.map((sport) => {
          const isActive = activeSport === sport.id;
          
          return (
            <button
              key={sport.id}
              onClick={() => setActiveSport(sport.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                ? 'bg-[#1a231f] border border-[#10b981]/30 text-[#10b981] shadow-xl shadow-black/40' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 text-[13px] font-black tracking-tight">
                <span className={`${isActive ? 'text-[#10b981]' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {sport.icon}
                </span>
                {sport.name}
              </div>
              
              {isActive && (
                <ChevronRight size={14} className="opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info inside Sidebar */}
      <div className="mt-6 px-4 py-4 rounded-2xl bg-gradient-to-br from-[#111926] to-[#0b0f1a] border border-white/5">
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
          Showing settled results for the last 24 hours.
        </p>
      </div>
    </aside>
  );
}
