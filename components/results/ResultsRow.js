export default function ResultsRow({ match }) {
  const isBasketball = match.sport_type === 'basketball';

  return (
    <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-[#1a231f] hover:bg-[#222d27] transition-colors">
      {/* Left side: Teams and League info */}
      <div className="flex flex-col">
        <div className="text-[13px] font-bold text-slate-100">
          {match.home_name} - {match.away_name}
        </div>
        <div className="text-[10px] text-slate-400 font-medium">
          {match.league_name}
        </div>
      </div>

      {/* Right side: Scores and Timestamp */}
      <div className="text-right">
        <div className="text-sm font-black text-[#ffcc00] flex gap-1.5 justify-end items-center">
          <span>{match.home_score}:{match.away_score}</span>
          
          {/* Soccer Halftime or Basketball Sub-scores */}
          {!isBasketball && match.half_time_home !== null && (
            <span className="text-[#ffcc00]/60 text-[10px]">
              ({match.half_time_home}:{match.half_time_away})
            </span>
          )}
        </div>
        
        <div className="text-[9px] text-slate-500 font-bold mt-0.5">
          {new Date(match.match_date).toLocaleString('en-GB', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          }).replace(',', '')}
        </div>
      </div>
    </div>
  );
}
