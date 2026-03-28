import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import MobileFooter from '../components/MobileFooter'; 
import ResultsHeader from '../components/results/ResultsHeader';
import ResultsRow from '../components/results/ResultsRow';
import { useBets } from '../context/BetContext';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const { slipItems } = useBets();

  useEffect(() => {
    async function getResults() {
      const { data } = await supabase
        .from('results')
        .select('*')
        .order('match_date', { ascending: false })
        .limit(100);
      setResults(data || []);
    }
    getResults();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white pb-20">
      <Navbar />
      
      <main className="max-w-[800px] mx-auto min-h-screen border-x border-white/5 bg-[#111926]">
        <ResultsHeader count={results.length} />

        <div className="flex flex-col divide-y divide-black/10">
          {results.map((m) => (
            <ResultsRow key={m.id} match={m} />
          ))}
        </div>
      </main>

      <MobileFooter slipCount={slipItems.length} />
    </div>
  );
}
