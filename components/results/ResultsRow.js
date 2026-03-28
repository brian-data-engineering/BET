export default function ResultsRow({ match }) {
  const isBasketball = match.sport_type === 'basketball';
  const isTableTennis = match.sport_type === 'table-tennis';
  
  // Helper to extract period/set scores
  const renderPeriods = () => {
    if (!match.periods) return null;
    const p = match.periods;
    
    // Logic for Table Tennis (Sets)
    if (isTableTennis) {
      const sets = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']
        .filter(s => p[s] && p[s].home !== null)
        .map(s => `${p[s].home}:${p[s].away}`);
      
      return sets.length > 0 ? (
        <div className="flex gap-1 mt-1 justify-end">
          {sets.map((score, i) => (
            <span key={i} className="text-[8px] bg-white/5 px-1 rounded text-slate-500 font-medium">
              {score}
            </span>
          ))}
        </div>
      ) : null;
    }

    // Logic for Basketball (Quarters)
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

    // Logic for Soccer (Halftime)
    if (match.half_time_home !== null) {
      return (
        <span className="text-[#ffcc00]/60 text-[10px] font-bold">
          ({match.half_time_home}:{match.half_time_away})
        </span>
      );
    }
    return null;
  };

  const isOT = isBasketball && match.periods?.overtime?.home !== null;

  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-black/20 bg-[#16211b] hover:bg-[#1d2b23] transition-colors group">
      
      {/* Left side: Teams and League info */}
      <div className="flex flex-col gap-0.5 max-w-[60%]">
        <div className="text-[13px] font-bold text-slate-100 group-hover:text-white transition-colors truncate">
          {match.home_name} - {match.away_name}
        </div>
        <div className="text-[10px] text-slate-500 font-semibold italic flex items-center gap-1">
          <span className="w-1 h-1 bg-[#10b981] rounded-full opacity-50"></span>
          <span className="truncate">{match.league_name}</span>
        </div>
      </div>

      {/* Right side: Scores and Status */}
      <div className="text-right flex flex-col items-end shrink-0">
        <div className={`flex items-center gap-2 ${isTableTennis ? 'flex-col items-end' : 'flex-row'}`}>
          <div className="text-[16px] font-black text-[#ffcc00] flex gap-1.5 items-center tracking-tighter">
            {isOT && (
              <span className="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded-sm font-black uppercase leading-none">OT</span>
            )}
            <span>{match.home_score}:{match.away_score}</span>
            {!isTableTennis && renderPeriods()}
          </div>
          {/* Render Table Tennis sets below the main set score for better spacing */}
          {isTableTennis && renderPeriods()}
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
