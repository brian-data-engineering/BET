import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import MobileFooter from '../components/MobileFooter'; 
import ResultsHeader from '../components/results/ResultsHeader';
import ResultsRow from '../components/results/ResultsRow';
import ResultsSidebar from '../components/results/ResultsSidebar';
import { useBets } from '../context/BetContext';
import { AlertCircle, Loader2, ChevronRight, Trophy, Calendar } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0b0f1a] text-white selection:bg-[#10b981]/30">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#10b981]/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Navbar />
      
      <div className="relative z-10 max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 px-4 pt-4 lg:pt-8 pb-32">
        
        {/* Sidebar with Sticky logic */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-24">
             <ResultsSidebar activeSport={activeSport} setActiveSport={setActiveSport} />
             
             {/* Quick Stats Card - New Visual Element */}
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

        <main className="flex-1 rounded-3xl bg-[#111926]/80 backdrop-blur-md border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
          
          {/* Sticky Header with Glass Effect */}
          <div className="sticky top-0 z-30 bg-[#111926]/90 backdrop-blur-md border-b border-white/5">
            <ResultsHeader count={results.length} activeSport={activeSport} />
          </div>

          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40 text-slate-500 gap-4">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#10b981]" size={48} />
                  <div className="absolute inset-0 blur-lg bg-[#10b981]/20 animate-pulse" />
                </div>
                <span className="text-[12px] font-black italic tracking-[0.15em] capitalize text-slate-400">
                  syncing {activeSport.replace('-', ' ')}...
                </span>
              </div>
            ) : Object.keys(groupedResults).length > 0 ? (
              Object.keys(groupedResults).map((league) => (
                <div key={league} className="flex flex-col">
                  
                  {/* Enhanced League Sub-header */}
                  <div className="bg-[#1a231f]/60 px-6 py-3 flex items-center gap-4 border-y border-white/5 sticky top-[52px] z-20 backdrop-blur-md">
                    <div className="p-1.5 bg-[#10b981]/10 rounded-lg">
                      <ChevronRight size={14} className="text-[#10b981]" />
                    </div>
                    <span className="text-[11px] font-black text-slate-100 capitalize tracking-[0.1em]">
                      {league}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                       <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Matches</span>
                       <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-[#10b981] font-black">
                        {groupedResults[league].length}
                       </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col divide-y divide-white/[0.03]">
                    {groupedResults[league].map((match) => (
                      <ResultsRow key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-48 text-center flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                  <AlertCircle size={32} className="text-orange-500/50" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-black italic capitalize tracking-widest text-slate-300">
                    no {activeSport} results found
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Try selecting a different category or date</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileFooter 
        itemCount={slipItems.length} 
        onGoHome={() => window.location.href = '/'}
        onOpenSlip={() => {}} 
      />
    </div>
  );
}
