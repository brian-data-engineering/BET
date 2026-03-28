import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import MobileFooter from '../components/MobileFooter'; 
import ResultsHeader from '../components/results/ResultsHeader';
import ResultsRow from '../components/results/ResultsRow';
import { AlertCircle } from 'lucide-react';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      const { data } = await supabase
        .from('results')
        .select('*')
        .order('match_date', { ascending: false })
        .limit(60);
      setResults(data || []);
      setLoading(false);
    }
    fetchResults();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white pb-20">
      <Navbar />
      
      <main className="max-w-[800px] mx-auto min-h-screen border-x border-white/5 bg-[#111926]">
        <ResultsHeader />

        <div className="flex flex-col">
          {loading ? (
             <div className="p-10 text-center animate-pulse text-slate-500 font-bold italic">Loading Results...</div>
          ) : results.length > 0 ? (
            results.map((match) => <ResultsRow key={match.id} match={match} />)
          ) : (
            <div className="py-20 text-center text-slate-600 text-[10px] font-black uppercase flex flex-col items-center gap-2">
              <AlertCircle size={20} className="opacity-20" />
              No Results Found
            </div>
          )}
        </div>
      </main>

      <MobileFooter activePage="results" />
    </div>
  );
}
