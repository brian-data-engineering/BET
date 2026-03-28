export default function ResultsRow({ match }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-black/20 bg-[#16211b] hover:bg-[#1d2b23] transition-colors group">
      <div className="flex flex-col gap-0.5">
        {/* Team Names - No Uppercase */}
        <div className="text-[13px] font-bold text-slate-100 leading-tight">
          {match.home_name} - {match.away_name}
        </div>
        {/* League Name - Small and Slate */}
        <div className="text-[10px] text-slate-500 font-medium">
          {match.league_name}
        </div>
      </div>

      <div className="text-right flex flex-col items-end">
        {/* Scores in Gold */}
        <div className="text-sm font-black text-[#ffcc00] flex gap-1 tracking-wider">
          <span>{match.home_score}:{match.away_score}</span>
          {match.half_time_home !== null && (
            <span className="text-[#ffcc00]/60 text-[11px]">
              ({match.half_time_home}:{match.half_time_away})
            </span>
          )}
        </div>
        <div className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-tighter">
          Final
        </div>
      </div>
    </div>
  );
}
