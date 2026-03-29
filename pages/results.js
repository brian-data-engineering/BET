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
        console.error('error fetching results:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    getResults();
  }, [activeSport]);

  const groupedResults = results.reduce((acc, match) => {
    const league = match.league_name || 'other leagues';
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

        <main className="flex-1 min-h-[600px] rounded-2xl overflow-hidden bg-[#111926] border border-white/5 shadow-2xl flex flex-col">
          
          {/* Sticky Header */}
          <div className="sticky top-0 z-30">
            <ResultsHeader count={results.length} activeSport={activeSport} />
          </div>

          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-3">
                <Loader2 className="animate-spin text-[#10b981]" size={40} />
                <span className="text-[11px] font-bold italic tracking-widest capitalize mt-2">
                  syncing {activeSport.replace('-', ' ')}...
                </span>
              </div>
            ) : Object.keys(groupedResults).length > 0 ? (
              Object.keys(groupedResults).map((league) => (
                <div key={league} className="flex flex-col">
                  
                  {/* League Sub-header */}
                  <div className="bg-[#1a231f] px-4 py-2.5 flex items-center gap-3 border-y border-black/40 sticky top-[48px] z-20 shadow-lg backdrop-blur-md">
                    <ChevronRight size={14} className="text-[#10b981] opacity-70" />
                    <span className="text-[10px] font-black text-slate-100 capitalize tracking-widest">
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
                <AlertCircle size={48} className="opacity-10 text-[#ffcc00]" />
                <span className="text-sm font-black italic capitalize tracking-widest text-slate-400">
                  no {activeSport} results found
                </span>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Consistent with Home/Detail footer props */}
      <MobileFooter 
        itemCount={slipItems.length} 
        onGoHome={() => window.location.href = '/'}
        onOpenSlip={() => {}} // You can add logic here if you want to open the slip on the results page
      />
    </div>
  );
}
