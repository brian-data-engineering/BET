export default function ResultsRow({ match }) {
  const sport = match.sport_type;
  const isBasketball = sport === 'basketball';
  const isTableTennis = sport === 'table-tennis';
  const isIceHockey = sport === 'ice-hockey';
  const p = match.periods || {};

  // Extraction for sub-scores
  const renderPeriods = () => {
    if (!match.periods) return null;
    
    if (isTableTennis || isIceHockey) {
      const keys = isTableTennis 
        ? ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] 
        : ['p1', 'p2', 'p3'];

      const scores = keys
        .filter(k => p[k] && p[k].home !== null)
        .map(k => ({ home: p[k].home, away: p[k].away }));
      
      return scores.length > 0 ? (
        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
          {scores.map((s, i) => (
            <div key={i} className="flex flex-col items-center bg-black/30 px-2 py-0.5 rounded border border-white/5 min-w-[32px]">
              <span className="text-[7px] text-slate-500 font-black mb-0.5">{i + 1}</span>
              <span className="text-[9px] text-slate-300 font-bold">{s.home}:{s.away}</span>
            </div>
          ))}
        </div>
      ) : null;
    }

    if (isBasketball) {
      const quarters = ['p1', 'p2', 'p3', 'p4']
        .filter(q => p[q] && p[q].home !== null)
        .map(q => `${p[q].home}:${p[q].away}`);
      
      return quarters.length > 0 ? (
        <span className="text-slate-500 text-[9px] font-bold ml-2 tracking-tighter">
          Q: {quarters.join(' | ')}
        </span>
      ) : null;
    }

    if (match.half_time_home !== null) {
      return (
        <div className="bg-[#10b981]/10 px-1.5 rounded ml-2 border border-[#10b981]/20">
          <span className="text-[#10b981] text-[9px] font-black italic">
            HT {match.half_time_home}:{match.half_time_away}
          </span>
        </div>
      );
    }
    return null;
  };

  const hasOT = p.overtime && p.overtime.home !== null;
  const hasPenalties = p.penalties && p.penalties.home !== null;

  return (
    <div className="relative flex items-center px-4 py-4 border-b border-white/[0.03] bg-[#111926]/40 hover:bg-[#1c2636]/60 transition-all duration-300 group overflow-hidden">
      
      {/* Background Hover Decoration */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#10b981] scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        {/* League & Time Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[8px] font-black text-[#10b981] uppercase tracking-[0.2em] opacity-80">
            {match.league_name}
          </span>
          <span className="w-1 h-1 bg-slate-700 rounded-full" />
          <span className="text-[9px] text-slate-500 font-bold">
             {new Date(match.match_date).toLocaleTimeString('en-GB', {
               hour: '2-digit', minute: '2-digit'
             })}
          </span>
        </div>

        {/* Teams Area */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-[#10b981] transition-colors" />
             <span className="text-[13px] font-bold text-slate-200 group-hover:text-white truncate">
                {match.home_name}
             </span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-[#10b981] transition-colors" />
             <span className="text-[13px] font-bold text-slate-200 group-hover:text-white truncate">
                {match.away_name}
             </span>
          </div>
        </div>

        {/* Sub-scores (Halftime/Quarters) - Soccer/Basketball */}
        {!isTableTennis && !isIceHockey && (
          <div className="mt-2 flex items-center">
            {renderPeriods()}
          </div>
        )}
      </div>

      {/* Score Section */}
      <div className="flex flex-col items-end pl-4 ml-auto border-l border-white/[0.05]">
        <div className="flex items-center gap-3">
          {/* Status Badges */}
          <div className="flex flex-col gap-1 items-end">
            {hasPenalties && (
              <span className="text-[7px] bg-indigo-600 text-white px-1 py-0.5 rounded font-black tracking-tighter leading-none">PEN</span>
            )}
            {hasOT && (
              <span className="text-[7px] bg-amber-600 text-white px-1 py-0.5 rounded font-black tracking-tighter leading-none">AET</span>
            )}
          </div>

          {/* Main Score Display */}
          <div className="flex items-center gap-1">
             <span className="text-xl font-black italic tracking-tighter text-white">
               {match.home_score}
             </span>
             <span className="text-lg font-black text-slate-700">:</span>
             <span className="text-xl font-black italic tracking-tighter text-white">
               {match.away_score}
             </span>
          </div>
        </div>

        {/* Sub-scores (Sets/Periods) - Tennis/Hockey */}
        {(isTableTennis || isIceHockey) && renderPeriods()}
        
        <div className="mt-2 px-2 py-0.5 rounded bg-black/20 border border-white/5">
           <span className="text-[8px] font-black text-[#10b981] uppercase italic tracking-widest">
             Settled
           </span>
        </div>
      </div>
    </div>
  );
}
