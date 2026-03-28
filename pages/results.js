import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import MobileFooter from '../components/MobileFooter'; 
import ResultsRow from '../components/results/ResultsRow';
import ResultsSidebar from '../components/results/ResultsSidebar';
import { useBets } from '../context/BetContext';
import { AlertCircle, Loader2, ChevronRight } from 'lucide-react';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSport, setActiveSport] = useState('soccer');
  const { slipItems } = useBets();

  useEffect(() => {
    async function getResults() {
      setIsLoading(true);
      setResults([]); 
      
      try {
        const { data, error } = await supabase
          .from('results')
          .select('*')
          .eq('status', 'settled') 
          .eq('sport_type', activeSport)
          .order('match_date', { ascending: false })
          .limit(150);

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error('Error fetching results:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    getResults();
  }, [activeSport]);

  const groupedResults = results.reduce((acc, match) => {
    const league = match.league_name || 'Other Leagues';
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Navbar />
      
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 pt-4 lg:pt-6 pb-24 lg:pb-10">
        
        <div className="w-full lg:w-64 shrink-0">
           <ResultsSidebar activeSport={activeSport} setActiveSport={setActiveSport} />
        </div>

        <main className="flex-1 min-h-[600px] rounded-lg overflow-hidden bg-[#111926] border border-white/5 shadow-2xl flex flex-col">
          
          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-3">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#10b981]" size={40} />
                  <div className="absolute inset-0 blur-lg bg-[#10b981]/20 animate-pulse" />
                </div>
                <span className="text-[11px] font-bold italic tracking-[0.2em] uppercase mt-2">
                  Syncing {activeSport.replace('-', ' ')} Feed
                </span>
              </div>
            ) : Object.keys(groupedResults).length > 0 ? (
              Object.keys(groupedResults).map((league) => (
                <div key={league} className="flex flex-col">
                  {/* Updated top offsets to prevent overlap with Navbar now that Header is gone */}
                  <div className="bg-[#1a231f] px-4 py-2.5 flex items-center gap-3 border-y border-black/40 sticky top-[0px] lg:top-[64px] z-20 shadow-lg shadow-black/20 backdrop-blur-md">
                    <ChevronRight size={14} className="text-[#10b981] opacity-70" />
                    <span className="text-[10px] font-black text-slate-100 uppercase tracking-widest">
                      {league}
                    </span>
                    <span className="ml-auto text-[8px] bg-white/5 px-1.5 rounded-full text-slate-500 font-bold">
                      {groupedResults[league].length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col divide-y divide-black/20">
                    {groupedResults[league].map((match) => (
                      <ResultsRow key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-40 text-center text-slate-600 flex flex-col items-center gap-5">
                <div className="p-6 rounded-full bg-white/[0.02] border border-white/5">
                  <AlertCircle size={48} className="opacity-10 text-[#ffcc00]" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-black italic uppercase tracking-widest text-slate-400">
                    No results found
                  </span>
                  <p className="text-[10px] text-slate-500 font-bold max-w-[200px] leading-relaxed">
                    Check back later for updated {activeSport.replace('-', ' ')} results.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileFooter slipCount={slipItems.length} />
    </div>
  );
}
