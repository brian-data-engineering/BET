import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import { useBets } from '../context/BetContext'; 
import { Trophy, Clock, Search, Activity } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ matches = [] }) {
  const [activeTab, setActiveTab] = useState('live');
  const [selectedSport, setSelectedSport] = useState('Soccer');
  const { slipItems, setSlipItems } = useBets(); 

  const now = new Date();

  // Clean scrapped data: remove quotes and handle nulls
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  const toggleBet = (odd, match) => {
    // Unique ID for the selection
    const betId = `${match.match_id}-${odd.odd_key}`;
    
    setSlipItems(prev => {
      // If already in slip, remove it
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }

      // Lucra Rule: Only one selection allowed per match
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

  // 1. SPORT FILTERING
  const sportFilteredMatches = matches.filter((match) => {
    const comp = (match.competition_name || "").toLowerCase();
    const sport = selectedSport.toLowerCase();
    
    if (sport === 'soccer') {
      const otherSports = ['basketball', 'tennis', 'cricket', 'rugby', 'hockey'];
      const isOtherSport = otherSports.some(s => comp.includes(s));
      return comp.includes('soccer') || comp.includes('football') || comp.includes('league') || !isOtherSport;
    }
    return comp.includes(sport);
  });

  // 2. LIVE VS UPCOMING LOGIC
  const liveMatches = sportFilteredMatches.filter((match) => {
    if (!match.start_time) return true;
    const startTime = new Date(match.start_time);
    return startTime <= now || match.status === 'live'; 
  });

  const upcomingMatches = sportFilteredMatches.filter((match) => {
    if (!match.start_time) return false;
    const startTime = new Date(match.start_time);
    return startTime > now && match.status !== 'live';
  });

  const displayMatches = activeTab === 'live' ? liveMatches : upcomingMatches;

  return (
    <div className="min-h-screen bg-lucra-dark text-white font-sans selection:bg-lucra-green selection:text-black">
      <Navbar />
      
      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        
        {/* LEFT SIDEBAR: Sports Navigation */}
        <aside className="hidden lg:col-span-2 lg:block space-y-1">
          <p className="text-[10px] font-black uppercase text-gray-500 px-3 mb-4 tracking-widest">Sports Menu</p>
          {['Soccer', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Hockey'].map((sport) => (
            <button 
              key={sport} 
              onClick={() => setSelectedSport(sport)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-sm border ${
                selectedSport === sport 
                ? 'text-lucra-green bg-lucra-green/5 border-lucra-green/10 font-black' 
                : 'text-gray-500 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {sport === 'Soccer' ? <Trophy size={16} /> : <Activity size={16} className="opacity-40" />}
              {sport}
            </button>
          ))}
        </aside>

        {/* CENTER: Main Match Feed */}
        <main className="col-span-12 lg:col-span-7 space-y-6">
          
          {/* Tabs Navigation */}
          <div className="flex gap-8 border-b border-gray-800/50">
            {[
              { id: 'live', label: 'Live Now', count: liveMatches.length },
              { id: 'upcoming', label: 'Upcoming', count: upcomingMatches.length }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                  activeTab === tab.id ? 'text-lucra-green' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label} <span className="ml-1 opacity-40">({tab.count})</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-lucra-green shadow-[0_0_10px_rgba(0,255,135,0.5)]" />
                )}
              </button>
            ))}
          </div>

          {/* Match Cards Container */}
          <div className="grid gap-3">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.match_id);

                return (
                  <div key={match.match_id} className="bg-lucra-card border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[9px] text-lucra-green font-black uppercase tracking-[0.15em] bg-lucra-green/10 px-2 py-1 rounded border border-lucra-green/10">
                            {match.competition_name || "International"}
                          </span>
                          {match.status === 'live' && (
                            <span className="flex items-center gap-1 text-[9px] text-red-500 font-black uppercase animate-pulse">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Live
                            </span>
                          )}
                        </div>

                        <Link href={`/${match.match_id}`} className="block group/link">
                          <div className="space-y-1">
                            <h3 className="text-lg font-black text-gray-100 group-hover/link:text-lucra-green transition-colors tracking-tight">
                              {cleanName(match.home_team)}
                            </h3>
                            <h3 className="text-lg font-black text-gray-100 group-hover/link:text-lucra-green transition-colors tracking-tight">
                              {cleanName(match.away_team)}
                            </h3>
                          </div>
                        </Link>
                      </div>

                      {/* Odds Selection Table */}
                      <div className="md:w-80">
                        <OddsTable 
                          odds={match.odds || []} 
                          onSelect={(odd) => toggleBet(odd, match)}
                          selectedId={currentSelection?.id} // Check against specific selection ID
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-32 text-center bg-white/[0.02] rounded-[2.5rem] border-2 border-dashed border-white/5">
                <Search size={40} className="mx-auto text-gray-800 mb-4" />
                <p className="text-gray-500 font-black uppercase text-xs tracking-widest">No {activeTab} matches available</p>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR: The Betslip */}
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

    if (error) throw error;

    // Deep stringify to handle potential date object issues with Next.js serialization
    return { 
      props: { 
        matches: JSON.parse(JSON.stringify(matches || [])) 
      } 
    };
  } catch (err) {
    console.error("SSR Fetch Error:", err);
    return { props: { matches: [] } };
  }
}
