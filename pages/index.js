import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import { useBets } from '../context/BetContext'; 
import { Trophy, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ matches = [] }) {
  const [activeTab, setActiveTab] = useState('live');
  const [selectedSport, setSelectedSport] = useState('Soccer');
  const { slipItems, setSlipItems } = useBets(); 

  // Debugging: This will tell us if matches are even arriving in the browser
  useEffect(() => {
    console.log("Matches received from Supabase:", matches.length);
  }, [matches]);

  const now = new Date();
  
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  const toggleBet = (odd, match) => {
    const betId = `${match.match_id}-${odd.odd_key}`;
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }
      const otherMatches = prev.filter(item => item.matchId !== match.match_id);
      return [...otherMatches, {
        id: betId,
        oddKey: odd.odd_key,
        matchId: match.match_id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: odd.display,
        odds: odd.value
      }];
    });
  };

  // 1. IMPROVED FILTER: More flexible sport matching
  const sportFilteredMatches = matches.filter((match) => {
    const comp = (match.competition_name || "").toLowerCase();
    const sport = selectedSport.toLowerCase();
    
    if (sport === 'soccer') {
      return comp.includes('soccer') || comp.includes('football') || comp.includes('league') || comp.includes('cup');
    }
    return comp.includes(sport);
  });

  // 2. IMPROVED TIME LOGIC: Fallback for different date formats
  const liveMatches = sportFilteredMatches.filter((match) => {
    const startTime = new Date(match.start_time);
    return startTime <= now || match.status === 'live'; 
  });

  const upcomingMatches = sportFilteredMatches.filter((match) => {
    const startTime = new Date(match.start_time);
    return startTime > now && match.status !== 'live';
  });

  const displayMatches = activeTab === 'live' ? liveMatches : upcomingMatches;

  return (
    <div className="min-h-screen bg-lucra-dark text-white font-sans">
      <Navbar />
      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        
        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:col-span-2 lg:block space-y-2">
          {['Soccer', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Hockey'].map((sport) => (
            <button 
              key={sport} 
              onClick={() => setSelectedSport(sport)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left border ${
                selectedSport === sport 
                ? 'text-lucra-green bg-lucra-card/50 border-lucra-green/20 font-bold' 
                : 'text-gray-500 border-transparent hover:text-white hover:bg-slate-800'
              }`}
            >
              {sport === 'Soccer' ? <Trophy size={18} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />}
              {sport}
            </button>
          ))}
        </aside>

        {/* MAIN FEED */}
        <main className="col-span-12 lg:col-span-7 space-y-4">
          <div className="flex gap-6 mb-6 border-b border-gray-800 pb-2">
            <button 
              onClick={() => setActiveTab('live')}
              className={`${activeTab === 'live' ? 'text-lucra-green border-b-2 border-lucra-green' : 'text-gray-500'} pb-2 font-bold px-2`}
            >
              Live ({liveMatches.length})
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`${activeTab === 'upcoming' ? 'text-lucra-green border-b-2 border-lucra-green' : 'text-gray-500'} pb-2 font-bold px-2`}
            >
              Upcoming ({upcomingMatches.length})
            </button>
          </div>

          <div className="grid gap-3">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.match_id);

                return (
                  <div key={match.match_id} className="bg-lucra-card border border-gray-800/50 rounded-xl p-4 group">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] text-lucra-green font-black uppercase tracking-widest bg-lucra-green/10 px-2 py-0.5 rounded border border-lucra-green/20">
                            {match.competition_name}
                          </span>
                        </div>
                        <Link href={`/${match.match_id}`} className="block">
                          <div className="space-y-1">
                            <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green">{cleanName(match.home_team)}</h3>
                            <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green">{cleanName(match.away_team)}</h3>
                          </div>
                        </Link>
                      </div>
                      <div className="md:w-72">
                        <OddsTable 
                          odds={match.odds || []} 
                          onSelect={(odd) => toggleBet(odd, match)}
                          selectedId={currentSelection?.oddKey}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-24 text-center bg-lucra-card/30 rounded-3xl border border-dashed border-gray-800 text-gray-500 font-bold">
                No matches found. (Database count: {matches.length})
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, odds(*)') 
      .order('start_time', { ascending: true });

    if (error) {
      console.error("Supabase Error:", error.message);
      return { props: { matches: [] } };
    }

    return { props: { matches: matches || [] } };
  } catch (err) {
    return { props: { matches: [] } };
  }
}
