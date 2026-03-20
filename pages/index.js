import { useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import { useBets } from '../context/BetContext'; // Import the global hook
import { Trophy, Clock } from 'lucide-react';

export default function Home({ matches = [] }) {
  const [activeTab, setActiveTab] = useState('live');
  const [selectedSport, setSelectedSport] = useState('Soccer');
  
  // Use global state instead of local useState
  const { slipItems, setSlipItems } = useBets(); 

  const now = new Date();
  
  // Logic to add/remove bets from the global slip
  const toggleBet = (odd, match) => {
    const betId = `${match.match_id}-${odd.odd_key}`;
    
    setSlipItems(prev => {
      // Toggle off if already selected
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }
      
      // Filter out other selections for the SAME match (1X2 standard)
      const otherMatches = prev.filter(item => item.matchId !== match.match_id);
      
      const newSelection = {
        id: betId,
        oddKey: odd.odd_key,
        matchId: match.match_id,
        matchName: `${match.home_team} vs ${match.away_team}`,
        selection: odd.display,
        odds: odd.value
      };
      
      return [...otherMatches, newSelection];
    });
  };

  // 1. Filter by Sport
  const sportFilteredMatches = matches.filter((match) => {
    const comp = (match.competition_id || match.competition || "").toLowerCase();
    const sport = selectedSport.toLowerCase();
    return comp.includes(sport) || (sport === 'soccer' && comp.includes('league'));
  });

  // 2. Split Live vs Upcoming
  const liveMatches = sportFilteredMatches.filter((match) => {
    const startTime = new Date(match.start_time || match.start);
    return startTime <= now; 
  });

  const upcomingMatches = sportFilteredMatches.filter((match) => {
    const startTime = new Date(match.start_time || match.start);
    return startTime > now;
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
              {sport === 'Soccer' ? (
                <Trophy size={18} className={selectedSport === 'Soccer' ? "text-lucra-green" : "text-gray-500"} />
              ) : (
                <div className={`w-1.5 h-1.5 rounded-full ${selectedSport === sport ? 'bg-lucra-green' : 'bg-gray-700'}`} />
              )}
              {sport}
            </button>
          ))}
        </aside>

        {/* MAIN FEED */}
        <main className="col-span-12 lg:col-span-7 space-y-4">
          
          <div className="bg-lucra-green text-black p-4 rounded-xl flex justify-between items-center font-black italic tracking-tighter shadow-lg">
            <span className="text-sm md:text-base uppercase">Daily Reward: 10% Cashback on All Losses</span>
            <button className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase not-italic hover:scale-105 transition-transform">Claim</button>
          </div>

          <div className="flex gap-6 mb-6 border-b border-gray-800 pb-2 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('live')}
              className={`${activeTab === 'live' ? 'text-lucra-green border-b-2 border-lucra-green' : 'text-gray-500'} pb-2 font-bold px-2 whitespace-nowrap transition-all`}
            >
              Live {selectedSport} ({liveMatches.length})
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`${activeTab === 'upcoming' ? 'text-lucra-green border-b-2 border-lucra-green' : 'text-gray-500'} pb-2 font-bold px-2 whitespace-nowrap transition-all`}
            >
              Upcoming ({upcomingMatches.length})
            </button>
          </div>

          <div className="grid gap-3">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                const home = match.home_team || match.home;
                const away = match.away_team || match.away;
                const odds = match.odds || [];
                const currentSelection = slipItems.find(item => item.matchId === match.match_id);

                return (
                  <div key={match.match_id} className="bg-lucra-card border border-gray-800/50 rounded-xl p-4 hover:border-gray-500/50 transition-all group">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] text-lucra-green font-black uppercase tracking-widest bg-lucra-green/10 px-2 py-0.5 rounded border border-lucra-green/20">
                            {match.competition_name || match.competition_id}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold" suppressHydrationWarning>
                            <Clock size={10} />
                            {match.start_time ? new Date(match.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                          </div>
                        </div>
                        
                        <Link href={`/${match.match_id}`} className="block">
                          <div className="space-y-1">
                            <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green transition-colors">{home}</h3>
                            <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green transition-colors">{away}</h3>
                          </div>
                        </Link>
                      </div>

                      <div className="md:w-72">
                        <OddsTable 
                          odds={odds} 
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
                No {selectedSport} {activeTab} matches found
              </div>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden lg:col-span-3 lg:block">
          {/* We still pass items/setItems to the component for internal logic */}
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>

      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bet-backend-q7vi.onrender.com';
  try {
    const res = await fetch(`${API_URL}/matches`);
    const matches = await res.json();
    return { props: { matches: Array.isArray(matches) ? matches : [] } };
  } catch (err) {
    return { props: { matches: [] } };
  }
}
