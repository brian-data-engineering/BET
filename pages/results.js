import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { List, LayoutGrid, Trophy, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ResultsPage() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetchResults();
  }, []);

  async function fetchResults() {
    const { data } = await supabase
      .from('results')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(50);
    setResults(data || []);
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white pb-20">
      <Navbar />
      
      {/* Top Filter Bar (Matches Image 2) */}
      <div className="bg-[#1a231f] border-b border-white/5 flex items-center p-2 text-[11px] font-bold">
        <span className="text-slate-400 px-2">Date</span>
        <div className="bg-[#555] px-2 py-0.5 rounded text-white mx-2">2026-03-28</div>
        <span className="text-slate-400 px-2">Sport</span>
        <div className="bg-[#555] px-4 py-0.5 rounded text-white mx-2">All</div>
      </div>

      {/* The List Layout */}
      <div className="flex flex-col">
        {results.map((match) => (
          <div 
            key={match.id} 
            className="flex justify-between items-center px-3 py-2 border-b border-black/20 bg-[#16211b] hover:bg-[#1d2b23] transition-colors"
          >
            {/* Left Side: Teams and League */}
            <div className="flex flex-col">
              <div className="text-sm font-bold text-slate-100">
                {match.home_name} - {match.away_name}
              </div>
              <div className="text-[10px] text-slate-400">
                {match.league_name}
              </div>
            </div>

            {/* Right Side: Score and Time */}
            <div className="text-right flex flex-col items-end">
              <div className="text-sm font-black text-[#ffcc00] flex gap-1">
                <span>{match.home_score}:{match.away_score}</span>
                {match.half_time_home !== null && (
                  <span className="text-[#ffcc00]/70">({match.half_time_home}:{match.half_time_away})</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                {match.match_date ? match.match_date.replace('T', ' ').substring(0, 16) : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inline Mobile Footer (No separate file needed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0b0f1a] border-t border-white/10 h-16 flex items-center justify-around px-2 z-50">
        <button className="flex flex-col items-center gap-1 text-slate-400"><List size={20} /><span className="text-[8px] uppercase font-black">A-Z</span></button>
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-400"><LayoutGrid size={20} /><span className="text-[8px] uppercase font-black">Home</span></Link>
        <button className="bg-[#10b981] w-12 h-12 rounded-full -mt-8 border-4 border-[#0b0f1a] flex items-center justify-center text-white"><Trophy size={20} /></button>
        <button className="flex flex-col items-center gap-1 text-[#10b981]"><Clock size={20} /><span className="text-[8px] uppercase font-black">Results</span></button>
        <button className="flex flex-col items-center gap-1 text-slate-400"><div className="w-5 h-5 rounded-full bg-slate-700 text-[8px] flex items-center justify-center">ME</div><span className="text-[8px] uppercase font-black">Account</span></button>
      </div>
    </div>
  );
}
