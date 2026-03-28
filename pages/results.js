import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import MobileFooter from '../components/MobileFooter'; // Ensure you have this component
import { Search, Trophy, Calendar, ChevronRight, Activity, Filter, Hash } from 'lucide-react';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');

  // Hardcoded sports list for the sidebar
  const sports = ['All', 'Soccer', 'Basketball', 'Tennis', 'Ice Hockey', 'Volleyball', 'Table Tennis'];

  useEffect(() => {
    fetchResults();
  }, [searchTerm, selectedSport]);

  async function fetchResults() {
    setLoading(true);
    let query = supabase
      .from('results')
      .select('*')
      .eq('status', 'settled') // Based on your code
      .order('match_date', { ascending: false })
      .limit(200);

    if (searchTerm) {
      // Logic to check if search is a numeric ID or a team name
      if (!isNaN(searchTerm)) {
        query = query.eq('id', searchTerm);
      } else {
        query = query.or(`home_name.ilike.%${searchTerm}%,away_name.ilike.%${searchTerm}%,league_name.ilike.%${searchTerm}%`);
      }
    }

    const { data, error } = await query;
    if (!error) setResults(data || []);
    setLoading(false);
  }

  // Group results by League Name
  const groupedResults = useMemo(() => {
    return results.reduce((acc, match) => {
      const league = match.league_name || 'Other';
      if (!acc[league]) acc[league] = [];
      acc[league].push(match);
      return acc;
    }, {});
  }, [results]);

  return (
    <div className="min-h-screen bg-[#060b18] text-white font-sans pb-24 md:pb-0">
      <Navbar />

      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row gap-6 p-4 md:p-6">
        
        {/* --- SIDEBAR (Hidden on Mobile, shown on MD+) --- */}
        <aside className="hidden md:block w-64 shrink-0 space-y-6">
          <div className="bg-[#111926] border border-white/5 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Filter size={12} /> Filter by Sport
            </h3>
            <div className="space-y-1">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    selectedSport === sport 
                    ? 'bg-[#10b981] text-[#060b18] italic' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity size={14} opacity={0.5} />
                    {sport}
                  </div>
                  <ChevronRight size={12} opacity={0.3} />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter">
                LUCRA <span className="text-[#10b981]">RESULTS</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">
                Verified Final Scores & Statistics
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <input 
                type="text"
                placeholder="Search Team, League, or ID..."
                className="bg-[#111926] border border-white/5 px-4 py-3 pl-11 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#10b981]/50 w-full transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-3.5 text-slate-500" size={16} />
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-8">
            {loading ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981]"></div></div>
            ) : Object.keys(groupedResults).length > 0 ? (
              Object.entries(groupedResults).map(([league, matches]) => (
                <div key={league} className="space-y-3">
                  {/* League Header */}
                  <div className="flex items-center gap-2 px-1">
                    <Trophy size={14} className="text-[#f59e0b]" />
                    <h2 className="text-[11px] font-black uppercase italic tracking-wider text-slate-300">
                      {league}
                    </h2>
                  </div>

                  {/* Matches under this league */}
                  <div className="grid gap-2">
                    {matches.map((match) => (
                      <div key={match.id} className="bg-[#111926] border border-white/5 rounded-xl p-4 md:p-5 hover:bg-[#161f2e] transition-all group">
                        <div className="flex items-center justify-between gap-4">
                          
                          {/* Home Team */}
                          <div className="flex-1 text-right">
                            <span className="text-xs md:text-sm font-black text-white italic uppercase tracking-tighter">
                              {match.home_name}
                            </span>
                          </div>

                          {/* Score Center */}
                          <div className="flex flex-col items-center min-w-[100px] md:min-w-[140px]">
                            <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 group-hover:border-[#10b981]/30 transition-colors">
                              <span className="text-xl md:text-2xl font-black text-[#f59e0b] italic">{match.home_score}</span>
                              <span className="text-slate-700 font-black">-</span>
                              <span className="text-xl md:text-2xl font-black text-[#f59e0b] italic">{match.away_score}</span>
                            </div>
                            
                            {/* Half Time Stats */}
                            <div className="mt-2 flex items-center gap-2">
                               <span className="text-[9px] font-black text-slate-600 uppercase italic bg-white/5 px-2 py-0.5 rounded">
                                 FT
                               </span>
                               {match.half_time_home !== null && (
                                <span className="text-[10px] text-slate-500 font-bold">
                                  HT ({match.half_time_home}:{match.half_time_away})
                                </span>
                               )}
                            </div>
                          </div>

                          {/* Away Team */}
                          <div className="flex-1 text-left">
                            <span className="text-xs md:text-sm font-black text-white italic uppercase tracking-tighter">
                              {match.away_name}
                            </span>
                          </div>

                        </div>

                        {/* Footer info for match */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[9px] font-black uppercase italic tracking-widest text-slate-600">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1"><Hash size={10}/> {match.id}</span>
                            <span className="flex items-center gap-1">
                              <Calendar size={10}/> {new Date(match.match_date).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/20">
                            {match.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-[#111926] rounded-3xl border border-dashed border-white/10">
                <Search size={40} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 font-black uppercase italic tracking-widest">No results found</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <MobileFooter />
    </div>
  );
}
