export default function ResultsRow({ match }) {
  const sport = match.sport_type; // Match our DB column name
  const isBasketball = sport === 'Basketball';
  const isTennis = sport === 'Tennis';
  const isIceHockey = sport === 'Ice Hockey';
  const isFootball = sport === 'Football';
  
  // sub_scores comes as a string like "(27:15,25:32,16:25,34:17)"
  const renderSubScores = () => {
    if (!match.sub_scores) return null;

    // Remove brackets and split by comma
    const cleanScores = match.sub_scores.replace(/[()]/g, '');
    const segments = cleanScores.split(',');

    // For Basketball Quarters
    if (isBasketball) {
      return (
        <span className="text-slate-500 text-[9px] font-bold ml-2 tracking-tighter">
          Q: {segments.join(' | ')}
        </span>
      );
    }

    // For Soccer (Half Time)
    if (isFootball && segments[0]) {
      return (
        <div className="bg-[#10b981]/10 px-1.5 rounded ml-2 border border-[#10b981]/20">
          <span className="text-[#10b981] text-[9px] font-black italic">
            HT {segments[0]}
          </span>
        </div>
      );
    }

    // For high-segment sports (Tennis, Hockey)
    if (isTennis || isIceHockey) {
      return (
        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
          {segments.map((score, i) => (
            <div key={i} className="flex flex-col items-center bg-black/30 px-2 py-0.5 rounded border border-white/5 min-w-[32px]">
              <span className="text-[7px] text-slate-500 font-black mb-0.5">{i + 1}</span>
              <span className="text-[9px] text-slate-300 font-bold">{score}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative flex items-center px-4 py-4 border-b border-white/[0.03] bg-[#111926]/40 hover:bg-[#1c2636]/60 transition-all duration-300 group overflow-hidden">
      
      {/* Background Hover Decoration */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#10b981] scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[8px] font-black text-[#10b981] uppercase tracking-[0.2em] opacity-80">
            {match.league_name}
          </span>
          <span className="w-1 h-1 bg-slate-700 rounded-full" />
          <span className="text-[9px] text-slate-500 font-bold">
             {new Date(match.event_date).toLocaleTimeString('en-GB', {
               hour: '2-digit', minute: '2-digit'
             })}
          </span>
        </div>

        <div className="flex flex-col gap-1">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-[#10b981] transition-colors" />
              <span className="text-[13px] font-bold text-slate-200 group-hover:text-white truncate">
                 {match.match_name.split(' vs ')[0]}
              </span>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-[#10b981] transition-colors" />
              <span className="text-[13px] font-bold text-slate-200 group-hover:text-white truncate">
                 {match.match_name.split(' vs ')[1]}
              </span>
           </div>
        </div>

        {/* Render half-time/quarters for low-segment sports here */}
        {(isFootball || isBasketball) && (
          <div className="mt-2 flex items-center">
            {renderSubScores()}
          </div>
        )}
      </div>

      {/* Score Section */}
      <div className="flex flex-col items-end pl-4 ml-auto border-l border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
             <span className="text-xl font-black italic tracking-tighter text-white">
               {match.main_score.split(':')[0]}
             </span>
             <span className="text-lg font-black text-slate-700">:</span>
             <span className="text-xl font-black italic tracking-tighter text-white">
               {match.main_score.split(':')[1]}
             </span>
          </div>
        </div>

        {/* Render period detail boxes for Tennis/Hockey here */}
        {(isTennis || isIceHockey) && renderSubScores()}
        
        <div className="mt-2 px-2 py-0.5 rounded bg-black/20 border border-white/5">
           <span className="text-[8px] font-black text-[#10b981] uppercase italic tracking-widest">
             {match.status || 'Settled'}
           </span>
        </div>
      </div>
    </div>
  );
}
