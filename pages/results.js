import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar'; // Adjust this path based on your folder structure

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
      .eq('status', 'settled')
      .order('match_date', { ascending: false })
      .limit(1000);

    if (searchTerm) {
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
    <div className="min-h-screen bg-[#060b18] text-white font-sans">
      {/* 1. IMPORTED NAVBAR */}
      <Navbar />

      <div className="max-w-4xl mx-auto p-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black italic text-[#10b981] uppercase tracking-tighter">
              LUCRA <span className="text-white">RESULTS</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              Last 1,000 Settled Matches
            </p>
          </div>
          
          <div className="relative w-full md:w-64">
            <input 
              type="text"
              placeholder="Search Team or ID..."
              className="bg-slate-900 border border-white/10 px-4 py-2 pl-10 rounded-lg text-sm focus:outline-none focus:border-[#10b981] w-full"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Simple Search Icon SVG */}
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
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
            <div className="text-center py-20 text-slate-600 border border-dashed border-white/5 rounded-2xl">
              No settled results found for "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded border bg-green-500/10 text-green-500 border-green-500/20">
      {status}
    </span>
  );
}
