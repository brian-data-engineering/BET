import { useState } from 'react'; // Added useState
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import { Trophy, Clock } from 'lucide-react';

export default function Home({ matches = [] }) {
  const [activeTab, setActiveTab] = useState('live');

  // Logic to separate matches based on time (Current time: 2026-03-19)
  // We use a small buffer (e.g., 2 hours) to keep matches in "Live" while they are being played
  const now = new Date();
  
  const liveMatches = matches.filter((match) => {
    const startTime = new Date(match.start);
    return startTime <= now; 
  });

  const upcomingMatches = matches.filter((match) => {
    const startTime = new Date(match.start);
    return startTime > now;
  });

  // Decide which list to render
  const displayMatches = activeTab === 'live' ? liveMatches : upcomingMatches;

  return (
    <div className="min-h-screen bg-lucra-dark text-white font-sans">
      <Navbar />

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        
        {/* 1. LEFT SIDEBAR */}
        <aside className="hidden lg:col-span-2 lg:block space-y-2">
          <div className="text-lucra-green bg-lucra-card/50 border border-lucra-green/20 p-3 rounded-xl flex items-center gap-3 font-bold">
            <Trophy size={18} />
            Soccer
          </div>
          {['Basketball', 'Tennis', 'Cricket', 'Rugby', 'Hockey'].map((sport) => (
            <div key={sport} className="text-lucra-text-dim hover:text-white hover:bg-slate-800 p-3 rounded-xl flex items-center gap-3 transition cursor-pointer group">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-lucra-green" />
              {sport}
            </div>
          ))}
        </aside>

        {/* 2. MAIN FEED */}
        <main className="col-span-12 lg:col-span-7 space-y-4">
          
          <div className="bg-lucra-green text-black p-4 rounded-xl flex justify-between items-center font-black italic tracking-tighter shadow-lg shadow-lucra-green/10">
            <span className="text-sm md:text-base uppercase">Daily Reward: 10% Cashback on All Losses</span>
            <button className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase not-italic">Claim</button>
          </div>

          {/* Navigation Tabs - Now Functional */}
          <div className="flex gap-6 mb-6 border-b border-gray-800 pb-2 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('live')}
              className={`${activeTab === 'live' ? 'text-lucra-green border-b-2 border-lucra-green' : 'text-gray-500'} pb-2 font-bold px-2 whitespace-nowrap transition-all`}
            >
              Live Now ({liveMatches.length})
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`${activeTab === 'upcoming' ? 'text-lucra-green border-b-2 border-lucra-green' : 'text-gray-500'} pb-2 font-bold px-2 whitespace-nowrap transition-all`}
            >
              Upcoming ({upcomingMatches.length})
            </button>
            <button className="text-gray-500 hover:text-white pb-2 px-2 transition whitespace-nowrap">Leagues</button>
          </div>

          {/* Match Cards Container */}
          <div className="grid gap-3">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => (
                <div key={match.match_id} className="bg-lucra-card border border-gray-800/50 rounded-xl p-4 hover:border-gray-500/50 transition-all group">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        {activeTab === 'live' && (
                          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <span className="text-[10px] text-lucra-green font-black uppercase tracking-widest bg-lucra-green/10 px-2 py-0.5 rounded border border-lucra-green/20">
                          {match.competition}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                          <Clock size={10} />
                          {new Date(match.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      
                      <Link href={`/match/${match.match_id}`} className="block">
                        <div className="space-y-1">
                          <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green transition-colors">
                            {match.home}
                          </h3>
                          <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green transition-colors">
                            {match.away}
                          </h3>
                        </div>
                      </Link>
                    </div>

                    <div className="md:w-72">
                      <OddsTable odds={match.odds || [
                        { display: '1', value: '2.10' },
                        { display: 'X', value: '3.40' },
                        { display: '2', value: '3.25' }
                      ]} />
                    </div>

                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-lucra-card/30 rounded-3xl border border-dashed border-gray-800">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4 text-gray-600">
                  <Trophy size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-400">
                  No {activeTab} matches found
                </h3>
                <p className="text-sm text-gray-600">Check the other tab for more games.</p>
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
    return { props: { matches: Array.isArray(matches) ? matches : [] } };
  } catch (err) {
    console.error("Lucra Data Fetch Error:", err);
    return { props: { matches: [] } };
  }
}
