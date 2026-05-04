import { Zap } from 'lucide-react';

export default function MatchCard({ match, onSelect }) {
  return (
    <div className="bg-slate-900 p-5 rounded-[2rem] border border-gray-800 hover:border-lucra-green/50 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="flex items-center gap-1 text-[10px] text-lucra-green font-black uppercase tracking-widest mb-1">
            <Zap size={10} /> {match.league}
          </span>
          <h3 className="text-lg font-bold tracking-tight">{match.home_team} <span className="text-gray-600 mx-1">v</span> {match.away_team}</h3>
        </div>
        <span className="text-[10px] bg-black px-3 py-1 rounded-full text-gray-500 font-bold uppercase">{match.start_time}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '1', val: match.odd_1 },
          { label: 'X', val: match.odd_x },
          { label: '2', val: match.odd_2 }
        ].map((odd) => (
          <button 
            key={odd.label}
            onClick={() => onSelect(match, odd.label, odd.val)}
            className="bg-black border border-gray-800 py-3 rounded-2xl hover:bg-lucra-green hover:text-black transition-all flex flex-col items-center group/btn"
          >
            <span className="text-[9px] font-black uppercase text-gray-600 group-hover/btn:text-black/50">{odd.label}</span>
            <span className="font-mono font-bold text-sm">{odd.val}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
