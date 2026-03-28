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
  const [activeSport, setActiveSport] = useState('soccer');
  const { slipItems } = useBets();

  useEffect(() => {
    async function getResults() {
      setIsLoading(true);
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
        console.error('Error:', err.message);
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
        
        {/* Sidebar */}
        <div className="w-full lg:w-64">
           <ResultsSidebar activeSport={activeSport} setActiveSport={setActiveSport} />
        </div>

        {/* Main Feed Container */}
        <main className="flex-1 min-h-screen rounded-lg overflow-hidden bg-[#111926] border border-white/5 shadow-2xl flex flex-col">
          
          {/* We pass the activeSport here to show in the header */}
          <ResultsHeader count={results.length} activeSport={activeSport} />

          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
                <Loader2 className="animate-spin text-[#10b981]" size={32} />
                <span className="text-[11px] font-bold italic tracking-widest uppercase">Syncing {activeSport}...</span>
              </div>
            ) : Object.keys(groupedResults).length > 0 ? (
              Object.keys(groupedResults).map((league) => (
                <div key={league} className="flex flex-col">
                  {/* League Heading - Refined to match image better */}
                  <div className="bg-[#1a231f] px-4 py-2 flex items-center gap-3 border-b border-black/40 sticky top-[45px] lg:top-[105px] z-20 shadow-sm">
                    <ChevronRight size={14} className="text-[#10b981]" />
                    <span className="text-[10px] font-black text-slate-200 uppercase tracking-wider">
                      {league}
                    </span>
                  </div>
                  
                  {/* Match Rows */}
                  <div className="flex flex-col divide-y divide-black/5">
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
