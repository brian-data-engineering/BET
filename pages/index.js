import { useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import { Trophy, Clock } from 'lucide-react';

export default function Home({ matches = [] }) {
  const [activeTab, setActiveTab] = useState('live');
  const [selectedSport, setSelectedSport] = useState('Soccer');

  const now = new Date();
  
  // 1. Filter by Sport using the DB column 'competition_id'
  const sportFilteredMatches = matches.filter((match) => {
    const comp = (match.competition_id || match.competition || "").toLowerCase();
    const sport = selectedSport.toLowerCase();
    // Logic: Matches if competition contains sport name OR is 'Soccer' and contains 'league'
    return comp.includes(sport) || (sport === 'soccer' && comp.includes('league'));
  });

  // 2. Split into Live vs Upcoming using DB column 'start_time'
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
        
        {/* 1. LEFT SIDEBAR */}
        <aside className="hidden lg:col-span-2 lg:block space-y-2">
          {['Soccer', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Hockey'].map((sport) => (
            <button 
              key={sport} 
              onClick={() => setSelectedSport(sport)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left border ${
                selectedSport === sport 
                ? 'text-lucra-green bg-lucra-card/50 border-lucra-green/20 font-bold shadow-[0_0_15px_rgba(0,255,135,0.05)]' 
                : 'text-lucra-text-dim border-transparent hover:text-white hover:bg-slate-800'
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

        {/* 2. MAIN FEED */}
        <main className="col-span-12 lg:col-span-7 space-y-4">
          
          <div className="bg-lucra-green text-black p-4 rounded-xl flex justify-between items-center font-black italic tracking-tighter shadow-lg shadow-lucra-green/10">
            <span className="text-sm md:text-base uppercase">Daily Reward: 10% Cashback on All Losses</span>
            <button className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase not-italic hover:scale-105 transition-transform">Claim</button>
          </div>

          {/* Navigation Tabs */}
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

          {/* Match Cards Container */}
          <div className="grid gap-3">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                // DATA MAPPING FROM DB COLUMNS
                const home = match.home_team || match.home;
                const away = match.away_team || match.away;
                const start = match.start_time || match.start;
                const competition = match.competition_id || match.competition;
                const odds = match.odds || match.market_odds || [];

                return (
                  <div key={match.match_id} className="bg-lucra-card border border-gray-800/50 rounded-xl p-4 hover:border-gray-500/50 transition-all group">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          {activeTab === 'live' && (
                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                          <span className="text-[10px] text-lucra-green font-black uppercase tracking-widest bg-lucra-green/10 px-2 py-0.5 rounded border border-lucra-green/20">
                            {competition}
                          </span>
                          
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold" suppressHydrationWarning>
                            <Clock size={10} />
                            {start ? new Date(start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                          </div>
                        </div>
                        
                        <Link href={`/match/${match.match_id}`} className="block">
                          <div className="space-y-1">
                            <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green transition-colors">
                              {home}
                            </h3>
                            <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green transition-colors">
                              {away}
                            </h3>
                          </div>
                        </Link>
                      </div>

                      <div className="md:w-72">
                        {/* If odds exist, show table, otherwise show placeholder */}
                        {odds.length > 0 ? (
                          <OddsTable odds={odds} />
                        ) : (
                          <div className="h-12 flex items-center justify-center bg-slate-900/30 rounded-lg border border-dashed border-gray-800 text-[10px] text-gray-600 uppercase font-bold">
                            Odds Suspended
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-lucra-card/30 rounded-3xl border border-dashed border-gray-800">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4 text-gray-600">
                  <Trophy size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-400">
                  No {selectedSport} {activeTab} matches found
                </h3>
                <p className="text-sm text-gray-600">Try switching sports or check the other tab.</p>
              </div>
            )}
          </div>
        </main>

        {/* 3. RIGHT SIDEBAR */}
        <aside className="hidden lg:col-span-3 lg:block">
          <Betslip />
        </aside>

      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bet-backend-q7vi.onrender.com';
  
  try {
    const res = await fetch(`${API_URL}/matches`);
    if (!res.ok) throw new Error("API not responding");
    const matches = await res.json();
    
    // Ensure we are passing an array
    return { props: { matches: Array.isArray(matches) ? matches : [] } };
  } catch (err) {
    print("Lucra Data Fetch Error:", err);
    return { props: { matches: [] } };
  }
}
