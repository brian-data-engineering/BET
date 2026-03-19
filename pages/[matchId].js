import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import { ChevronLeft, Clock, Trophy, Activity } from 'lucide-react';
import Link from 'next/link';

export default function MatchDetail({ match, odds = [] }) {
  const router = useRouter();

  // If the page is still loading or match data is missing
  if (router.isFallback || !match) {
    return <div className="min-h-screen bg-lucra-dark text-white flex items-center justify-center">Loading Lucra Match...</div>;
  }

  // Group odds by market_name so we can display them in sections
  const groupedOdds = odds.reduce((acc, odd) => {
    const name = odd.market_name || "Other Markets";
    if (!acc[name]) acc[name] = [];
    acc[name].push(odd);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-lucra-dark text-white font-sans">
      <Navbar />

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        
        {/* MAIN CONTENT */}
        <main className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* Back Button & Header */}
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-800 rounded-full transition">
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-lucra-green">
                {match.competition_name || match.competition || "Match Details"}
              </h1>
            </div>
          </div>

          {/* Scoreboard / Team Header */}
          <div className="bg-lucra-card border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy size={120} />
            </div>
            
            <div className="flex justify-between items-center text-center relative z-10">
              <div className="flex-1">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-gray-700">
                  <span className="text-2xl font-bold">{match.home_team?.[0]}</span>
                </div>
                <h2 className="text-2xl font-black">{match.home_team}</h2>
                <span className="text-gray-500 text-sm font-bold uppercase">Home</span>
              </div>

              <div className="px-8">
                <div className="bg-lucra-green/10 text-lucra-green px-4 py-2 rounded-full font-black text-sm mb-2 border border-lucra-green/20">
                  VS
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs font-bold" suppressHydrationWarning>
                   <Clock size={12} />
                   {new Date(match.start_time).toLocaleDateString()} {new Date(match.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>

              <div className="flex-1">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-gray-700">
                  <span className="text-2xl font-bold">{match.away_team?.[0]}</span>
                </div>
                <h2 className="text-2xl font-black">{match.away_team}</h2>
                <span className="text-gray-500 text-sm font-bold uppercase">Away</span>
              </div>
            </div>
          </div>

          {/* ODDS SECTIONS */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity size={20} className="text-lucra-green" />
              Available Markets
            </h3>

            {Object.keys(groupedOdds).length > 0 ? (
              Object.entries(groupedOdds).map(([marketName, marketOdds]) => (
                <div key={marketName} className="bg-lucra-card/50 border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 px-2">
                    {marketName}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {marketOdds.map((odd, idx) => (
                      <button 
                        key={idx}
                        className="flex justify-between items-center bg-slate-900 border border-gray-800 p-4 rounded-xl hover:border-lucra-green transition-all group"
                      >
                        <span className="text-sm font-bold text-gray-400 group-hover:text-white uppercase">
                          {odd.display}
                        </span>
                        <span className="text-lucra-green font-black text-lg">
                          {parseFloat(odd.value).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-lucra-card/20 rounded-2xl border border-dashed border-gray-800">
                <p className="text-gray-600 font-bold uppercase text-xs">No active markets for this match</p>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden lg:col-span-3 lg:block">
          <Betslip />
        </aside>

      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bet-backend-q7vi.onrender.com';
  
  try {
    // 1. Fetch Match Details
    const matchRes = await fetch(`${API_URL}/matches`);
    const allMatches = await matchRes.json();
    const match = allMatches.find(m => m.match_id === params.matchId) || null;

    // 2. Fetch Specific Odds for this Match
    const oddsRes = await fetch(`${API_URL}/matches/${params.matchId}/odds`);
    const odds = await oddsRes.json();

    return { 
      props: { 
        match, 
        odds: Array.isArray(odds) ? odds : [] 
      } 
    };
  } catch (err) {
    console.error("Match Detail Fetch Error:", err);
    return { props: { match: null, odds: [] } };
  }
}
