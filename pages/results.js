import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import MobileFooter from '../components/MobileFooter'; 
import ResultsHeader from '../components/results/ResultsHeader';
import ResultsRow from '../components/results/ResultsRow';
import { useBets } from '../context/BetContext';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { slipItems } = useBets();

  useEffect(() => {
    async function getResults() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('results')
          .select('*')
          // Only display games that have ended
          .eq('status', 'settled') 
          .order('match_date', { ascending: false })
          .limit(100);

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error('Error fetching settled results:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    getResults();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white pb-24 lg:pb-0">
      <Navbar />
      
      {/* Main Content Area */}
      <main className="max-w-[800px] mx-auto min-h-screen border-x border-white/5 bg-[#111926] shadow-xl">
        
        {/* Header with match count */}
        <ResultsHeader count={results.length} />

        <div className="flex flex-col divide-y divide-black/20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-[#10b981]" size={32} />
              <span className="text-[11px] font-bold italic tracking-widest">Fetching Settled Matches...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((match) => (
              <ResultsRow key={match.id} match={match} />
            ))
          ) : (
            <div className="py-32 text-center text-slate-600 flex flex-col items-center gap-4">
              <AlertCircle size={40} className="opacity-10" />
              <div className="flex flex-col">
                <span className="text-sm font-bold italic">No Settled Results Found</span>
                <span className="text-[10px] opacity-50 font-medium">Check back later once matches are finalized.</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Persistent Mobile Navigation */}
      <MobileFooter 
        slipCount={slipItems.length} 
        onOpenSlip={() => {
            // Logic to handle slip toggle if needed on results page
            window.location.href = '/'; 
        }}
      />
    </div>
  );
}
