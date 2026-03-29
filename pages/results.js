import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import MobileFooter from '../components/MobileFooter'; 
import ResultsHeader from '../components/results/ResultsHeader';
import ResultsRow from '../components/results/ResultsRow';
import ResultsSidebar from '../components/results/ResultsSidebar';
import { useBets } from '../context/BetContext';
import { AlertCircle, Loader2, ChevronRight, Trophy } from 'lucide-react';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSport, setActiveSport] = useState('soccer');
  const { slipItems } = useBets();

  // --- CRITICAL SCROLL FIX ---
  useEffect(() => {
    const nextDataFolder = document.getElementById('__next');
    if (nextDataFolder) {
      // Force the parent container to allow scrolling
      nextDataFolder.style.overflow = 'visible';
      nextDataFolder.style.height = 'auto';
    }

    // Cleanup: Reset it back when leaving the page if necessary
    return () => {
      if (nextDataFolder) {
        nextDataFolder.style.overflow = ''; 
        nextDataFolder.style.height = '';
      }
    };
  }, []);

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
    // Changed overflow-hidden to overflow-visible here too
    <div className="min-h-screen bg-[#0b0f1a] text-white selection:bg-[#10b981]/30 overflow-visible">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#10b981]/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Navbar />
      
      <div className="relative z-10 max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 px-4 pt-4 lg:pt-8 pb-32">
        
        <aside className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-24 lg:h-fit">
             <ResultsSidebar activeSport={activeSport} setActiveSport={setActiveSport} />
             <div className="hidden lg:block mt-6 p-5 rounded-2xl bg-[#111926] border border-white/5 bg-gradient-to-br from-transparent to-white/[0.02]">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                  <Trophy size={12} className="text-[#10b981]" /> match summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total Settled</span>
                    <span className="text-xs font-bold text-white">{results.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Active Sport</span>
                    <span className="text-xs font-bold text-[#10b981] capitalize">{activeSport}</span>
                  </div>
                </div>
             </div>
          </div>
        </aside>

        {/* Main Content Area - Ensure overflow is visible */}
        <main className="flex-1 rounded-3xl bg-[#111926]/80 backdrop-blur-md border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-visible">
          
          {/* Header */}
          <div className="sticky top-0 lg:top-[64px] z-30 bg-[#111926] rounded-t-3xl">
            <ResultsHeader count={results.length} activeSport={activeSport} />
          </div>

          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40 text-slate-500 gap-4">
                <Loader2 className="animate-spin text-[#10b981]" size={48} />
                <span className="text-[12px] font-black italic tracking-[0.15em] capitalize text-slate-400">syncing...</span>
              </div>
            ) : Object.keys(groupedResults).length > 0 ? (
              Object.keys(groupedResults).map((league) => (
                <div key={league} className="flex flex-col">
                  {/* Sticky League Header */}
                  <div className="bg-[#1a231f]/90 px-6 py-3 flex items-center gap-4 border-y border-white/5 sticky top-[44px] lg:top-[112px] z-20 backdrop-blur-md">
                    <ChevronRight size={14} className="text-[#10b981]" />
                    <span className="text-[11px] font-black text-slate-100 capitalize">{league}</span>
                    <span className="ml-auto text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-[#10b981] font-black">
                        {groupedResults[league].length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col divide-y divide-white/[0.03]">
                    {groupedResults[league].map((match) => (
                      <ResultsRow key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-48 text-center text-slate-500 uppercase text-[10px] font-black">No results found</div>
            )}
          </div>
        </main>
      </div>

      <MobileFooter 
        itemCount={slipItems.length} 
        onGoHome={() => window.location.href = '/'}
      />
    </div>
  );
}
