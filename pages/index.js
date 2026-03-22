import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Search, Loader2, Clock, Zap, Activity } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Redis } from '@upstash/redis';

export default function Home({ initialMatches = [], initialLiveMatches = [] }) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [matches, setMatches] = useState(initialMatches);
  const [liveMatches, setLiveMatches] = useState(initialLiveMatches);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 

  const now = new Date();
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  // --- 🔄 LIVE POLLING EFFECT ---
  // Updates live scores every 10 seconds so users don't have to refresh
  useEffect(() => {
    let interval;
    if (activeTab === 'live') {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/live-scores'); // Create this simple API route
          const data = await res.json();
          if (data) setLiveMatches(data);
        } catch (err) {
          console.error("Live fetch error:", err);
        }
      }, 10000); 
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  // Fetch upcoming matches by league (Supabase)
  useEffect(() => {
    if (selectedLeague) {
      fetchMatchesByLeague(selectedLeague);
    }
  }, [selectedLeague]);

  const fetchMatchesByLeague = async (leagueId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*, odds(*)')
      .eq('competition_id', leagueId)
      .order('start_time', { ascending: true });

    if (!error && data) setMatches(data);
    setLoading(false);
  };

  const toggleBet = (odd, match, isLive = false) => {
    // Standardize ID so betslip recognizes the match across tabs
    const matchId = isLive ? match.id : match.match_id;
    const betId = `${matchId}-${odd.odd_key || odd.display}`;
    
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }
      const otherMatches = prev.filter(item => item.matchId !== matchId);
      return [...otherMatches, {
        id: betId,
        oddKey: odd.odd_key || odd.display,
        matchId: matchId,
        matchName: isLive ? `${match.home} vs ${match.away}` : `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: odd.display,
        odds: odd.odd_value || odd.value
      }];
    });
  };

  // --- 🎯 FILTERING & TAB LOGIC ---
  const displayMatches = useMemo(() => {
    if (activeTab === 'live') {
        if (!searchQuery) return liveMatches;
        const query = searchQuery.toLowerCase();
        return liveMatches.filter(m => 
            m.home?.toLowerCase().includes(query) || m.away?.toLowerCase().includes(query)
        );
    }

    let filtered = matches.filter(m => {
      if (!m.start_time) return true; 
      return new Date(m.start_time) > now;
    });

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(query) || 
        m.away_team?.toLowerCase().includes(query) ||
        m.competition_name?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [matches, liveMatches, activeTab, searchQuery, now]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      <Navbar onSearch={setSearchQuery} />
      
      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        <aside className="hidden lg:col-span-3 lg:block">
          <Sidebar onSelectLeague={setSelectedLeague} onClearFilter={() => {setSelectedLeague(null); setMatches(initialMatches);}} />
        </aside>

        <main className="col-span-12 lg:col-span-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-8 border-b border-slate-800">
            <button 
              onClick={() => setActiveTab('live')}
              className={`pb-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 relative ${activeTab === 'live' ? 'text-emerald-500' : 'text-slate-500'}`}
            >
              <Activity size={14} className={activeTab === 'live' ? 'animate-pulse' : ''} />
              Live Now <span className="ml-1 opacity-40">({liveMatches.length})</span>
              {activeTab === 'live' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`pb-4 text-xs font-black uppercase tracking-widest relative ${activeTab === 'upcoming' ? 'text-emerald-500' : 'text-slate-500'}`}
            >
              Upcoming <span className="ml-1 opacity-40">({matches.length})</span>
              {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
            </button>
          </div>

          <div className="grid gap-3">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                const isLive = activeTab === 'live';
                const mId = isLive ? match.id : match.match_id;
                const currentSelection = slipItems.find(item => item.matchId === mId);
                
                return (
                  <div key={mId} className={`bg-[#1e293b] border rounded-2xl p-5 transition-all ${isLive ? 'border-emerald-500/20' : 'border-white/5 hover:border-emerald-500/30'}`}>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          {isLive ? (
                            <span className="text-[9px] text-white font-black uppercase bg-red-600 px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                               LIVE {match.time}
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-500 font-black uppercase bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10 flex items-center gap-1">
                              <Clock size={10} /> {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500 font-bold uppercase">{isLive ? match.status : match.competition_name}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                             <h3 className="text-lg font-black text-slate-100">{isLive ? match.home : cleanName(match.home_team)}</h3>
                             {isLive && <span className="text-xl font-black text-emerald-500">{match.score.split(':')[0]}</span>}
                          </div>
                          <div className="flex justify-between items-center">
                             <h3 className="text-lg font-black text-slate-100">{isLive ? match.away : cleanName(match.away_team)}</h3>
                             {isLive && <span className="text-xl font-black text-emerald-500">{match.score.split(':')[1]}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="md:w-80">
                        {/* If match is Live, we map the odds slightly differently based on your Redis structure */}
                        <OddsTable 
                            odds={isLive ? (match.odds || []) : (match.odds || [])} 
                            onSelect={(odd) => toggleBet(odd, match, isLive)} 
                            selectedId={currentSelection?.id}
                            disabled={isLive && match.active === 0} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-32 text-center bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800">
                <Search size={40} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 font-black uppercase text-xs tracking-widest">No matches found</p>
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
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    // 1. Fetch from Supabase
    const { data: supabaseMatches } = await supabase
      .from('matches')
      .select('*, odds(*)') 
      .order('start_time', { ascending: true })
      .limit(50); 

    // 2. Fetch from Upstash Redis
    const liveBlob = await redis.get("lucra:live_matches");
    
    return { 
      props: { 
        initialMatches: JSON.parse(JSON.stringify(supabaseMatches || [])),
        initialLiveMatches: liveBlob || []
      } 
    };
  } catch (err) {
    return { props: { initialMatches: [], initialLiveMatches: [] } };
  }
}
