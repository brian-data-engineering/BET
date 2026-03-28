import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { Search, Trophy } from 'lucide-react';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchResults();
  }, [searchTerm]);

  async function fetchResults() {
    let query = supabase
      .from('results')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(100);

    if (searchTerm) {
      query = query.or(`home_name.ilike.%${searchTerm}%,away_name.ilike.%${searchTerm}%`);
    }

    const { data } = await query;
    setResults(data || []);
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Navbar />

      <div className="max-w-3xl mx-auto p-4">
        {/* Simple Header & Search */}
        <div className="flex flex-col gap-4 mb-6">
          <h1 className="text-xl font-black italic text-[#10b981]">RESULTS</h1>
          <div className="relative">
            <input 
              type="text"
              placeholder="Search team..."
              className="w-full bg-[#111926] border border-white/10 p-3 pl-10 rounded-xl text-sm outline-none focus:border-[#10b981]"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-3.5 text-slate-500" size={16} />
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {results.map((match) => (
            <div key={match.id} className="bg-[#111926] border border-white/5 rounded-xl p-4">
              {/* League Header */}
              <div className="text-[10px] font-black uppercase text-slate-500 mb-3 flex items-center gap-2">
                <Trophy size={10} className="text-[#f59e0b]" />
                {match.league_name}
              </div>

              {/* Score Row */}
              <div className="flex items-center justify-between">
                <div className="flex-1 text-right font-bold text-sm">{match.home_name}</div>
                
                <div className="px-6 flex flex-col items-center">
                  <div className="text-xl font-black text-[#f59e0b] bg-black/40 px-3 py-1 rounded-lg">
                    {match.home_score} - {match.away_score}
                  </div>
                  {match.half_time_home !== null && (
                    <span className="text-[9px] text-slate-600 mt-1">
                      HT ({match.half_time_home}:{match.half_time_away})
                    </span>
                  )}
                </div>

                <div className="flex-1 text-left font-bold text-sm">{match.away_name}</div>
              </div>

              {/* Footer info */}
              <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-[9px] text-slate-600 font-bold uppercase italic">
                <span>ID: {match.id}</span>
                <span>{new Date(match.match_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
