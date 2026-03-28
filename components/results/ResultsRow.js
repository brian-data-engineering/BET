export default function ResultsRow({ match }) {
  // Helper to format the time/date nicely
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-black/20 bg-[#16211b] hover:bg-[#1d2b23] transition-colors">
      <div className="flex flex-col gap-0.5">
        {/* Teams - No Uppercase */}
        <div className="text-[13px] font-bold text-slate-100 leading-tight">
          {match.home_name} - {match.away_name}
        </div>
        {/* League - Small and muted */}
        <div className="text-[10px] text-slate-500 font-medium italic">
          {match.league_name}
        </div>
      </div>

      <div className="text-right flex flex-col items-end">
        {/* Score in Gold */}
        <div className="text-sm font-black text-[#ffcc00] flex gap-1.5 items-center">
          <span>{match.home_score}:{match.away_score}</span>
          
          {/* Halftime in brackets if exists */}
          {match.half_time_home !== null && (
            <span className="text-[#ffcc00]/60 text-[10px] font-bold">
              ({match.half_time_home}:{match.half_time_away})
            </span>
          )}
        </div>
        
        {/* Match Time or Status */}
        <div className="text-[9px] font-bold text-slate-500 mt-0.5 tracking-tighter">
          {match.status === 'FT' ? 'Finished' : formatTime(match.match_date)}
        </div>
      </div>
    </div>
  );
}
