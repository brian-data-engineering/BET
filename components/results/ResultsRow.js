export default function ResultsRow({ match }) {
  const isBasketball = match.sport_type === 'basketball';
  
  // Helper to extract period scores from the JSONB 'periods' column
  const renderPeriods = () => {
    if (!match.periods) return null;
    
    if (isBasketball) {
      const p = match.periods;
      // Filter for standard quarters that have data
      const quarters = ['p1', 'p2', 'p3', 'p4']
        .filter(q => p[q] && p[q].home !== null)
        .map(q => `${p[q].home}:${p[q].away}`);
      
      return quarters.length > 0 ? (
        <span className="text-[#ffcc00]/40 text-[9px] font-medium ml-1">
          ({quarters.join(', ')})
        </span>
      ) : null;
    }

    // Soccer Halftime
    if (match.half_time_home !== null) {
      return (
        <span className="text-[#ffcc00]/60 text-[10px] font-bold">
          ({match.half_time_home}:{match.half_time_away})
        </span>
      );
    }
    return null;
  };

  // Check if Basketball went to Overtime
  const isOT = isBasketball && match.periods?.overtime && match.periods.overtime.home !== null;

  return (
    <div className="flex justify-between items-center px-4 py-2.5 border-b border-black/20 bg-[#16211b] hover:bg-[#1d2b23] transition-colors group">
      
      {/* Left side: Teams and League info */}
      <div className="flex flex-col gap-0.5">
        <div className="text-[13px] font-bold text-slate-100 group-hover:text-white transition-colors">
          {match.home_name} - {match.away_name}
        </div>
        <div className="text-[10px] text-slate-500 font-semibold italic flex items-center gap-1">
          <span className="w-1 h-1 bg-[#10b981] rounded-full opacity-50"></span>
          {match.league_name}
        </div>
      </div>

      {/* Right side: Scores and Status */}
      <div className="text-right flex flex-col items-end">
        <div className="text-[15px] font-black text-[#ffcc00] flex gap-2 items-center tracking-tighter">
          {isOT && (
            <span className="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded-sm font-black uppercase leading-none">OT</span>
          )}
          <span>{match.home_score}:{match.away_score}</span>
          {renderPeriods()}
        </div>
        
        <div className="text-[9px] text-slate-500 font-black mt-0.5 uppercase flex gap-2 items-center">
          <span className="text-[#10b981]/80 italic font-bold capitalize">Settled</span>
          <span className="opacity-30">|</span>
          <span>
            {new Date(match.match_date).toLocaleDateString('en-GB', {
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            }).replace(',', ' -')}
          </span>
        </div>
      </div>
    </div>
  );
}
