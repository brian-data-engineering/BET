import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Search, Loader2, Clock, Zap } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('upcoming'); // Default to upcoming
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [matches, setMatches] = useState(initialMatches);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 

  const now = new Date();

  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  // Fetch matches for specific league
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

  // 1. FILTERING LOGIC
  const displayMatches = useMemo(() => {
    if (activeTab === 'live') return []; // Live is currently a placeholder

    let filtered = matches.filter(m => {
      if (!m.start_time) return true; 
      return new Date(m.start_time) > now; // Show only future games in Upcoming
    });

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(query) || 
        m.away_team?.toLowerCase().includes(query) ||
        m.competition_name?.toLowerCase().includes(query) ||
        m.category?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [matches, activeTab, searchQuery, now]);

  const upcomingCount = matches.filter(m => !m.start_time || new Date(m.start_time) > now).length;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      <Navbar onSearch={setSearchQuery} />
      
      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        <aside className="hidden lg:col-span-3 lg:block">
          <Sidebar onSelectLeague={setSelectedLeague} onClearFilter={handleReset} />
        </aside>

        <main className="col-span-12 lg:col-span-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-8 border-b border-slate-800">
            <button 
              onClick={() => setActiveTab('live')}
              className={`pb-4 text-xs font-black uppercase tracking-widest relative ${activeTab === 'live' ? 'text-emerald-500' : 'text-slate-500'}`}
            >
              Live Now <span className="ml-1 opacity-40">(0)</span>
              {activeTab === 'live' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`pb-4 text-xs font-black uppercase tracking-widest relative ${activeTab === 'upcoming' ? 'text-emerald-500' : 'text-slate-500'}`}
            >
              Upcoming <span className="ml-1 opacity-40">({upcomingCount})</span>
              {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
            </button>
          </div>

          <div className="grid gap-3">
            {activeTab === 'live' ? (
              /* 📍 LIVE PLACEHOLDER */
              <div className="py-32 text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                <Zap size={40} className="mx-auto text-emerald-500 mb-4 animate-pulse" />
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Live Betting Coming Soon</h3>
                <p className="text-slate-500 text-xs mt-2">We are currently integrating real-time match data.</p>
              </div>
            ) : loading ? (
              <div className="py-32 flex flex-col items-center justify-center text-slate-500"><Loader2 className="animate-spin mb-4" /></div>
            ) : displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.match_id);
                return (
                  <div key={match.match_id} className="bg-[#1e293b] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[9px] text-emerald-500 font-black uppercase bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10 flex items-center gap-1">
                            <Clock size={10} />
                            {match.start_time ? new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Scheduled"}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase">{match.competition_name}</span>
                        </div>
                        <Link href={`/${match.match_id}`}>
                          <div className="space-y-1">
                            <h3 className="text-lg font-black text-slate-100 hover:text-emerald-500 transition-colors">{cleanName(match.home_team)}</h3>
                            <h3 className="text-lg font-black text-slate-100 hover:text-emerald-500 transition-colors">{cleanName(match.away_team)}</h3>
                          </div>
                        </Link>
                      </div>
                      <div className="md:w-80">
                        <OddsTable odds={match.odds || []} onSelect={(odd) => toggleBet(odd, match)} selectedId={currentSelection?.id} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-32 text-center bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800">
                <Search size={40} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 font-black uppercase text-xs tracking-widest">No upcoming matches found</p>
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
      .limit(100); 

    if (error) throw error;
    return { props: { initialMatches: JSON.parse(JSON.stringify(matches || [])) } };
  } catch (err) {
    return { props: { initialMatches: [] } };
  }
}
