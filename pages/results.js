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
  // Default to 'Football' to match the new DB values
  const [activeSport, setActiveSport] = useState('Football');
  const { slipItems } = useBets();

  // Fix for Next.js overflow issues during scrolling
  useEffect(() => {
    const nextDataFolder = document.getElementById('__next');
    if (nextDataFolder) {
      nextDataFolder.style.overflow = 'visible';
      nextDataFolder.style.height = 'auto';
    }
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
          .from('spresults') // UPDATED: Using the new optimized table name
          .select('*')
          .eq('sport_type', activeSport) // UPDATED: Matches the new column name
          .order('event_date', { ascending: false }) // UPDATED: Using the new TIMESTAMPTZ column
          .limit(150);

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error('Lucra Sync Error:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    getResults();
  }, [activeSport]);

  // Grouping results by league for the sticky headers
  const groupedResults = results.reduce((acc, match) => {
    const league = match.league_name || 'Other Leagues';
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white selection:bg-[#10b981]/30 overflow-visible">
      {/* Lucra Brand Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#10b981]/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Navbar />
      
      <div className="relative z-10 max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 px-4 pt-4 lg:pt-8 pb-32">
        {/* Sidebar Logic */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-24 lg:h-fit">
             <ResultsSidebar activeSport={activeSport} setActiveSport={setActiveSport} />
             
             {/* Match Summary Stats Card */}
             <div className="hidden lg:block mt-6 p-5 rounded-2xl bg-[#111926] border border-white/5 bg-gradient-to-br from-transparent to-white/[0.02]">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                  <Trophy size={12} className="text-[#10b981]" /> match summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total Found</span>
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

        {/* Main Results Feed */}
        <main className="flex-1 rounded-3xl bg-[#111926]/80 backdrop-blur-md border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-visible">
          <div className="sticky top-0 lg:top-[64px] z-30 bg-[#111926] rounded-t-3xl">
            <ResultsHeader count={results.length} activeSport={activeSport} />
          </div>

          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40 text-slate-500 gap-4">
                <Loader2 className="animate-spin text-[#10b981]" size={48} />
                <span className="text-[12px] font-black italic tracking-[0.15em] capitalize text-slate-400">accessing lucra engine...</span>
              </div>
            ) : Object.keys(groupedResults).length > 0 ? (
              Object.keys(groupedResults).map((league) => (
                <div key={league} className="flex flex-col">
                  {/* League Section Header */}
                  <div className="bg-[#1a231f]/90 px-6 py-3 flex items-center gap-4 border-y border-white/5 sticky top-[44px] lg:top-[112px] z-20 backdrop-blur-md">
                    <ChevronRight size={14} className="text-[#10b981]" />
                    <span className="text-[11px] font-black text-slate-100 capitalize">{league}</span>
                    <span className="ml-auto text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-[#10b981] font-black">
                        {groupedResults[league].length}
                    </span>
                  </div>
                  
                  {/* Match Rows */}
                  <div className="flex flex-col divide-y divide-white/[0.03]">
                    {groupedResults[league].map((match) => (
                      <ResultsRow key={match.game_id} match={match} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-48 text-center text-slate-500 uppercase text-[10px] font-black tracking-widest">
                No results found for {activeSport} today
              </div>
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
