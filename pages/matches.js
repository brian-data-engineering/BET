import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Clock } from 'lucide-react';
import OddsTable from '../components/OddsTable';
// 1. Import Supabase
import { supabase } from '../lib/supabaseClient';

export default function MatchesBySport({ matches = [] }) {
  const [selectedSport, setSelectedSport] = useState('Soccer');

  // Helper to clean up team names (removes quotes)
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : '';

  // Filter matches based on the selected sport button
  const filteredMatches = matches.filter(match => 
    (match.competition_name || "").toLowerCase().includes(selectedSport.toLowerCase()) ||
    (selectedSport === 'Soccer' && (match.competition_name || "").toLowerCase().includes('league'))
  );

  return (
    <div className="min-h-screen bg-lucra-dark text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-black mb-2 text-lucra-green italic tracking-tighter uppercase">
            Explore Markets
          </h2>
          <p className="text-gray-400 text-sm">Select a category to view available matches and live odds.</p>
        </header>

        {/* Sport Categories Navigation */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
          {['Soccer', 'Basketball', 'Tennis', 'Ice Hockey', 'Cricket'].map((sport) => (
            <button 
              key={sport} 
              onClick={() => setSelectedSport(sport)}
              className={`px-6 py-2 rounded-full border transition-all font-bold whitespace-nowrap ${
                selectedSport === sport 
                ? 'bg-lucra-green text-black border-lucra-green shadow-lg shadow-lucra-green/20' 
                : 'bg-lucra-card text-gray-400 border-gray-800 hover:border-gray-600'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>
        
        {/* Dynamic Match List */}
        <div className="space-y-4">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <div key={match.match_id} className="bg-lucra-card border border-gray-800 rounded-2xl p-5 hover:bg-slate-800/40 transition-colors group">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                  
                  {/* Event Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-lucra-dark text-[10px] font-black px-2 py-1 rounded text-lucra-green border border-lucra-green/10">
                        {match.competition_name}
                      </span>
                      
                      <span 
                        className="text-[10px] text-gray-500 flex items-center gap-1 font-bold"
                        suppressHydrationWarning
                      >
                        <Clock size={12} />
                        {new Date(match.start_time).toLocaleString([], { 
                          weekday: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    <Link href={`/${match.match_id}`} className="block space-y-1">
                      <h3 className="text-lg font-bold text-gray-100 group-hover:text-lucra-green transition-colors">
                        {cleanName(match.home_team)}
                      </h3>
                      <h3 className="text-lg font-bold text-gray-100 group-hover:text-lucra-green transition-colors">
                        {cleanName(match.away_team)}
                      </h3>
                    </Link>
                  </div>

                  {/* Quick Betting Options */}
                  <div className="lg:w-80">
                    <OddsTable odds={match.odds || []} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-lucra-card/20 rounded-3xl border border-dashed border-gray-800">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
                <Trophy className="text-gray-600" size={30} />
              </div>
              <h3 className="text-xl font-bold text-gray-500">No {selectedSport} matches found</h3>
              <p className="text-gray-600 mt-2">Try checking the Soccer or Basketball tabs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 2. Updated to pull from Supabase
export async function getServerSideProps() {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, odds(*)')
      .order('start_time', { ascending: true });

    if (error) throw error;

    return { 
      props: { 
        matches: matches || [] 
      } 
    };
  } catch (err) {
    console.error("Explore Page Fetch Error:", err);
    return { props: { matches: [] } };
  }
}
