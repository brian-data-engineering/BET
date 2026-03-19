import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import { Trophy, Clock, ChevronRight } from 'lucide-react';

export default function Home({ matches = [] }) {
  return (
    <div className="min-h-screen bg-lucra-dark text-white font-sans">
      <Navbar />

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        
        {/* 1. LEFT SIDEBAR - SPORTS LIST */}
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
          
          {/* Promo Banner */}
          <div className="bg-lucra-green text-black p-4 rounded-xl flex justify-between items-center font-black italic tracking-tighter shadow-lg shadow-lucra-green/10">
            <span className="text-sm md:text-base uppercase">Daily Reward: 10% Cashback on All Losses</span>
            <button className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase not-italic">Claim</button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 mb-6 border-b border-gray-800 pb-2 overflow-x-auto">
            <button className="text-lucra-green border-b-2 border-lucra-green pb-2 font-bold px-2 whitespace-nowrap">Live Now</button>
            <button className="text-gray-500 hover:text-white pb-2 px-2 transition whitespace-nowrap">Upcoming</button>
            <button className="text-gray-500 hover:text-white pb-2 px-2 transition whitespace-nowrap">Leagues</button>
          </div>

          {/* Match Cards Container */}
          <div className="grid gap-3">
            {matches.length > 0 ? (
              matches.map((match) => (
                <div key={match.match_id} className="bg-lucra-card border border-gray-800/50 rounded-xl p-4 hover:border-gray-500/50 transition-all group">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    
                    {/* Team Info & Time */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
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
                          <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform">
                            <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green">
                              {match.home}
                            </h3>
                          </div>
                          <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform">
                            <h3 className="text-md font-bold text-gray-100 group-hover:text-lucra-green">
                              {match.away}
                            </h3>
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Odds Section */}
                    <div className="md:w-72">
                      {/* Passing empty odds if they aren't in the list_matches response yet */}
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
              /* EMPTY STATE */
              <div className="flex flex-col items-center justify-center py-24 bg-lucra-card/30 rounded-3xl border border-dashed border-gray-800">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4 text-gray-600">
                  <Trophy size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-400">Searching for Live Matches...</h3>
                <p className="text-sm text-gray-600">Our scraper is fetching the latest odds from the market.</p>
              </div>
            )}
          </div>
        </main>

        {/* 3. RIGHT SIDEBAR - BETSLIP */}
        <aside className="hidden lg:col-span-3 lg:block">
          <Betslip />
        </aside>

      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lucra-data.onrender.com';
  
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
