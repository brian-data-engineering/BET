export default function ResultsRow({ match }) {
  const sport = match.sport_type;
  const isBasketball = sport === 'basketball';
  const isTableTennis = sport === 'table-tennis';
  const isIceHockey = sport === 'ice-hockey';
  
  const p = match.periods || {};

  // Helper to extract period/set scores
  const renderPeriods = () => {
    if (!match.periods) return null;
    
    // --- Table Tennis (Sets) & Ice Hockey (Periods) ---
    // Both use a horizontal badge layout for multiple scores
    if (isTableTennis || isIceHockey) {
      const keys = isTableTennis 
        ? ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] 
        : ['p1', 'p2', 'p3'];

      const scores = keys
        .filter(k => p[k] && p[k].home !== null)
        .map(k => `${p[k].home}:${p[k].away}`);
      
      return scores.length > 0 ? (
        <div className="flex gap-1 mt-1 justify-end">
          {scores.map((score, i) => (
            <span key={i} className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-slate-400 font-bold">
              {score}
            </span>
          ))}
        </div>
      ) : null;
    }

    // --- Basketball (Quarters) ---
    if (isBasketball) {
      const quarters = ['p1', 'p2', 'p3', 'p4']
        .filter(q => p[q] && p[q].home !== null)
        .map(q => `${p[q].home}:${p[q].away}`);
      
      return quarters.length > 0 ? (
        <span className="text-[#ffcc00]/40 text-[9px] font-medium ml-1">
          ({quarters.join(', ')})
        </span>
      ) : null;
    }

    // --- Soccer (Halftime) ---
    if (match.half_time_home !== null) {
      return (
        <span className="text-[#ffcc00]/60 text-[10px] font-bold">
          ({match.half_time_home}:{match.half_time_away})
        </span>
      );
    }
    return null;
  };

  // Status Checkers
  const hasOT = p.overtime && p.overtime.home !== null;
  const hasPenalties = p.penalties && p.penalties.home !== null;

  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-black/20 bg-[#16211b] hover:bg-[#1d2b23] transition-colors group">
      
      {/* Left side: Teams and League info */}
      <div className="flex flex-col gap-0.5 max-w-[60%]">
        <div className="text-[13px] font-bold text-slate-100 group-hover:text-white transition-colors truncate">
          {match.home_name} - {match.away_name}
        </div>
        <div className="text-[10px] text-slate-500 font-semibold italic flex items-center gap-1">
          <span className="w-1 h-1 bg-[#10b981] rounded-full opacity-50"></span>
          <span className="truncate uppercase tracking-wider text-[9px]">{match.league_name}</span>
        </div>
      </div>

      {/* Right side: Scores and Status */}
      <div className="text-right flex flex-col items-end shrink-0">
        <div className={`flex items-center gap-2 ${(isTableTennis || isIceHockey) ? 'flex-col items-end' : 'flex-row'}`}>
          <div className="text-[16px] font-black text-[#ffcc00] flex gap-1.5 items-center tracking-tighter">
            {/* OT Badge for Hockey/Basketball */}
            {hasOT && !hasPenalties && (
              <span className="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded-sm font-black uppercase leading-none">OT</span>
            )}
            {/* Shootout Badge for Hockey */}
            {hasPenalties && (
              <span className="text-[8px] bg-purple-600 text-white px-1 py-0.5 rounded-sm font-black uppercase leading-none">SO</span>
            )}
            
            <span>{match.home_score}:{match.away_score}</span>
            {(!isTableTennis && !isIceHockey) && renderPeriods()}
          </div>
          
          {/* Sub-scores for Hockey and Table Tennis */}
          {(isTableTennis || isIceHockey) && renderPeriods()}
        </div>
        
        <div className="text-[9px] text-slate-500 font-black mt-1 uppercase flex gap-2 items-center">
          <span className="text-[#10b981]/80 italic font-bold capitalize">Settled</span>
          <span className="opacity-30">|</span>
          <span>
            {new Date(match.match_date).toLocaleTimeString('en-GB', {
              hour: '2-digit', minute: '2-digit'
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
