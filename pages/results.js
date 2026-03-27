// pages/results.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchResults();
  }, [searchTerm]);

  async function fetchResults() {
    // Strictly filter for 'settled' matches and increase limit to 1000
    let query = supabase
      .from('results')
      .select('*')
      .eq('status', 'settled')
      .order('match_date', { ascending: false })
      .limit(1000);

    if (searchTerm) {
      // Logic: Search home/away names while maintaining the 'settled' filter
      query = query.or(`home_name.ilike.%${searchTerm}%,away_name.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("Fetch error:", error.message);
      return;
    }
    setResults(data || []);
  }

  return (
    <div className="min-h-screen bg-[#060b18] text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-2xl font-black italic text-[#10b981] uppercase tracking-tighter">
            LUCRA <span className="text-white">RESULTS</span>
          </h1>
          <input 
            type="text"
            placeholder="Search Team or ID..."
            className="bg-slate-900 border border-white/10 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#10b981] w-full md:w-64"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </header>

        <div className="grid gap-4">
          {results.length > 0 ? (
            results.map((match) => (
              <div key={match.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 hover:bg-slate-900 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    ID: {match.id} • {match.league_name}
                  </span>
                  <StatusBadge status={match.status} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="w-1/3 text-right font-bold text-sm md:text-base">{match.home_name}</div>
                  
                  <div className="flex flex-col items-center px-4 md:px-6">
                    <div className="text-xl md:text-2xl font-black text-yellow-400 bg-black px-4 py-1 rounded-xl border border-white/5 tracking-widest">
                      {match.home_score} - {match.away_score}
                    </div>
                    {match.half_time_home !== null && (
                      <span className="text-[10px] text-slate-600 mt-2 font-mono">
                        HT ({match.half_time_home}:{match.half_time_away})
                      </span>
                    )}
                  </div>

                  <div className="w-1/3 text-left font-bold text-sm md:text-base">{match.away_name}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-slate-600">
              No settled results found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    settled: "bg-green-500/10 text-green-500 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    live: "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse"
  };
  return (
    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded border ${colors[status] || colors.live}`}>
      {status}
    </span>
  );
}
