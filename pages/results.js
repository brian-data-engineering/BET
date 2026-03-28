import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import MobileFooter from '../components/MobileFooter'; 
import ResultsHeader from '../components/results/ResultsHeader';
import ResultsRow from '../components/results/ResultsRow';
import ResultsSidebar from '../components/results/ResultsSidebar';
import { useBets } from '../context/BetContext';
import { AlertCircle, Loader2, ChevronRight } from 'lucide-react';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSport, setActiveSport] = useState('soccer'); // Default sport
  const { slipItems } = useBets();

  useEffect(() => {
    async function getResults() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('results')
          .select('*')
          .eq('status', 'settled') 
          .eq('sport_type', activeSport) // Filter by sidebar selection
          .order('match_date', { ascending: false })
          .limit(150);

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error('Error:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    getResults();
  }, [activeSport]); // Re-run when user clicks a different sport

  // GROUPING LOGIC: Groups matches by League Name
  const groupedResults = results.reduce((acc, match) => {
    const league = match.league_name || 'Other Leagues';
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <Navbar />
      
      <div className="max-w-[1200px] mx-auto flex gap-6 px-4 pt-6 pb-24 lg:pb-10">
        
        {/* Sidebar for Desktop */}
        <ResultsSidebar activeSport={activeSport} setActiveSport={setActiveSport} />

        {/* Main Feed */}
        <main className="flex-1 min-h-screen rounded-xl overflow-hidden bg-[#111926] border border-white/5 shadow-2xl">
          <ResultsHeader count={results.length} />

          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
                <Loader2 className="animate-spin text-[#10b981]" size={32} />
                <span className="text-[11px] font-bold italic tracking-widest">Loading {activeSport}...</span>
              </div>
            ) : Object.keys(groupedResults).length > 0 ? (
              Object.keys(groupedResults).map((league) => (
                <div key={league} className="flex flex-col mb-1">
                  {/* League Heading - Dark Green bar like screenshot */}
                  <div className="bg-[#1a231f] px-4 py-1.5 flex items-center gap-2 border-y border-black/40">
                    <ChevronRight size={14} className="text-[#10b981]" />
                    <span className="text-[11px] font-black text-slate-200 tracking-wide">
                      {league}
                    </span>
                  </div>
                  
                  {/* Match Rows */}
                  <div className="divide-y divide-black/10">
                    {groupedResults[league].map((match) => (
                      <ResultsRow key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-32 text-center text-slate-600 flex flex-col items-center gap-4">
                <AlertCircle size={40} className="opacity-10" />
                <span className="text-sm font-bold italic">No {activeSport} results found</span>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileFooter slipCount={slipItems.length} />
    </div>
  );
}
