import { Trophy, Dribbble } from 'lucide-react';

export default function ResultsSidebar({ activeSport, setActiveSport }) {
  const sports = [
    { id: 'soccer', name: 'Football', icon: <Trophy size={16} /> },
    { id: 'basketball', name: 'Basketball', icon: <Dribbble size={16} /> },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#0b0f1a] p-4 gap-2 sticky top-20 h-fit">
      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest px-2 mb-2">Sports</h3>
      {sports.map((sport) => (
        <button
          key={sport.id}
          onClick={() => setActiveSport(sport.id)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-bold ${
            activeSport === sport.id 
            ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          {sport.icon}
          {sport.name}
        </button>
      ))}
    </aside>
  );
}
