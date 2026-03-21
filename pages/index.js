import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('live');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [matches, setMatches] = useState(initialMatches);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Global search state
  const { slipItems, setSlipItems } = useBets(); 

  const now = new Date();

  // Clean data: remove quotes to prevent syntax errors in the UI
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  // 1. EFFECT: Fetch matches specifically for the selected league
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

    if (!error && data) {
      setMatches(data);
    }
    setLoading(false);
  };

  // 2. RESET: Restore initial view
  const handleReset = () => {
    setSelectedLeague(null);
    setMatches(initialMatches);
    setSearchQuery('');
  };

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
        odds: odd.odd_value
      }];
    });
  };

  // 3. FILTERING LOGIC: Tab Filter + Search Filter
  const displayMatches = useMemo(() => {
    // First, filter by Live vs Upcoming
    const tabFiltered = matches.filter((m) => {
      const startTime = new Date(m.start_time);
      const isLive = startTime <= now || m.status === 'live';
      return activeTab === 'live' ? isLive : !isLive;
    });

    // Then, filter by Search Query (Teams or League names)
    if (!searchQuery) return tabFiltered;
    
    const query = searchQuery.toLowerCase();
    return tabFiltered.filter(m => 
      m.home_team?.toLowerCase().includes(query) || 
      m.away_team?.toLowerCase().includes(query) ||
      m.competition_name?.toLowerCase().includes(query)
    );
  }, [matches, activeTab, searchQuery, now]);

  // Separate counts for the tabs (always based on current match set)
  const liveCount = matches.filter(m => new Date(m.start_time) <= now || m.status === 'live').length;
  const upcomingCount = matches.length - liveCount;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-emerald-500 selection:text-black">
      {/* Navbar now controls the searchQuery state */}
      <Navbar onSearch={(val) => setSearchQuery(val)} />
      
      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        
        <aside className="hidden lg:col-span-3 lg:block">
          <Sidebar 
            onSelectLeague={(id) => setSelectedLeague(id)} 
            onClearFilter={handleReset}
          />
        </aside>

        <main className="col-span-12 lg:col-span-6 space-y-6">
          
          <div className="flex gap-8 border-b border-slate-800">
            {[
              { id: 'live', label: 'Live Now', count: liveCount },
              { id: 'upcoming', label: 'Upcoming', count: upcomingCount }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                  activeTab === tab.id ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label} <span className="ml-1 opacity-40">({tab.count})</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                )}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p className="text-xs font-black uppercase tracking-widest">Finding Matches...</p>
              </div>
            ) : displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.match_id);

                return (
                  <div key={match.match_id} className="bg-[#1e293b] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10">
                            {match.start_time ? new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Live"}
                          </span>
                        </div>

                        <Link href={`/${match.match_id}`} className="block">
                          <div className="space-y-1">
                            <h3 className="text-lg font-black text-slate-100 group-hover:text-emerald-500 transition-colors tracking-tight">
                              {cleanName(match.home_team)}
                            </h3>
                            <h3 className="text-lg font-black text-slate-100 group-hover:text-emerald-500 transition-colors tracking-tight">
                              {cleanName(match.away_team)}
                            </h3>
                          </div>
                        </Link>
                      </div>

                      <div className="md:w-80">
                        <OddsTable 
                          odds={match.odds || []} 
                          onSelect={(odd) => toggleBet(odd, match)}
                          selectedId={currentSelection?.id}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-32 text-center bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800">
                <Search size={40} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 font-black uppercase text-xs tracking-widest">
                  {searchQuery ? `No matches found for "${searchQuery}"` : "Select a league to see matches"}
                </p>
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
      .order('start_time', { ascending: true })
      .limit(50); 

    if (error) throw error;

    return { 
      props: { 
        initialMatches: JSON.parse(JSON.stringify(matches || [])) 
      } 
    };
  } catch (err) {
    return { props: { initialMatches: [] } };
  }
}
