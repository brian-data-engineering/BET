import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Clock, Zap, Play, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. HIGH-FREQUENCY CLOCK
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  // 2. UPDATED PARSING LOGIC: Treat raw DB time as Nairobi Local Time
  const getMatchDate = (dateString) => {
    if (!dateString) return null;
    try {
      // Step 1: Remove any timezone markers (+00, Z, etc.) 
      // This forces the browser to interpret the numbers as "Current Local Time"
      const localString = dateString.replace('Z', '').replace(/\+\d{2}(:?\d{2})?/, '').replace(' ', 'T');
      
      const d = new Date(localString);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  const isMatchStarted = (commenceTime) => {
    const matchDate = getMatchDate(commenceTime);
    return matchDate ? currentTime >= matchDate : false;
  };

  // Displays the time exactly as it appears in the string (Nairobi Raw)
  const formatFixedTime = (dateString) => {
    if (!dateString) return 'TBD';
    // Matches the HH:mm pattern directly from the raw string
    const timeMatch = dateString.match(/(\d{2}:\d{2})/);
    return timeMatch ? timeMatch[0] : 'TBD';
  };

  const cleanName = (name) => name ? name.replace(/['"]+/g, '').trim() : 'TBD';

  const sportTabs = [
    { id: 'soccer', name: 'Soccer', icon: '⚽' },
    { id: 'basketball', name: 'Basketball', icon: '🏀' },
    { id: 'tennis', name: 'Tennis', icon: '🎾' },
    { id: 'ice-hockey', name: 'Ice Hockey', icon: '🏒' },
    { id: 'table-tennis', name: 'Table Tennis', icon: '🏓' },
  ];

  const toggleBet = (selection, value, match) => {
    if (isMatchStarted(match.commence_time)) return;

    const matchId = match.id; 
    const betId = `${matchId}-${selection}`;
    
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }
      const otherMatches = prev.filter(item => item.matchId !== matchId);
      return [...otherMatches, {
        id: betId,
        matchId: matchId,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: selection,
        marketName: '1X2',
        odds: value,
        startTime: match.commence_time 
      }];
    });
  };

  // 3. MASTER FILTER
  const displayMatches = useMemo(() => {
    let filtered = initialMatches.filter(m => {
      if (isMatchStarted(m.commence_time)) return false;

      const league = (m.league_name || '').toLowerCase();
      const sport = (m.sport_key || '').toLowerCase();
      const isVirtual = league.includes('ebasketball') || league.includes('esoccer') || 
                        league.includes('srl') || league.includes('electronic') || 
                        league.includes('cyber') || sport.startsWith('esport');
      return !isVirtual;
    });

    filtered = filtered.filter(m => m.sport_key === activeTab);
    if (selectedLeague) filtered = filtered.filter(m => m.league_name === selectedLeague);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(q) || 
        m.away_team?.toLowerCase().includes(q) ||
        m.display_league?.toLowerCase().includes(q) ||
        m.league_name?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab, currentTime]);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans">
      <Navbar onSearch={setSearchQuery} />
      
      <div className="w-full bg-[#004d3d] overflow-hidden hidden md:block border-b border-white/5">
        <div className="max-w-[1440px] mx-auto h-[160px] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#004d3d] via-[#004d3d]/80 to-transparent flex items-center px-12 z-10">
                <div className="max-w-md">
                    <h2 className="text-4xl font-black italic uppercase leading-none text-white tracking-tighter">
                        Get <span className="text-[#f59e0b]">5% Cashback</span>
                    </h2>
                    <p className="text-sm font-bold text-white/80 mt-2 italic uppercase tracking-wider">On all weekly losses</p>
                </div>
            </div>
            <img src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1000" alt="Promo" className="w-full h-full object-cover opacity-30" />
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-12">
        <aside className="hidden lg:col-span-2 lg:block border-r border-white/5">
          <Sidebar onSelectLeague={setSelectedLeague} onClearFilter={() => setSelectedLeague(null)} />
        </aside>

        <main className="col-span-12 lg:col-span-7 bg-[#111926] min-h-screen border-r border-white/5">
          <div className="bg-[#111926] border-b border-white/5 flex items-center px-2 overflow-x-auto no-scrollbar sticky top-0 z-20">
            {sportTabs.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }}
                className={`py-4 px-5 text-[11px] font-black uppercase tracking-tight transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-white'}`}
              >
                <span className={activeTab === tab.id ? 'grayscale-0' : 'grayscale'}>{tab.icon}</span>
                {tab.name}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]" />}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-12 px-4 py-3 text-[10px] font-black text-slate-500 uppercase italic bg-[#0b0f1a]/30">
            <div className="col-span-7">Event Details {selectedLeague && <span className="text-[#10b981] ml-2">• {selectedLeague}</span>}</div>
            <div className="col-span-5 grid grid-cols-3 text-center"><span>1</span><span>X</span><span>2</span></div>
          </div>

          <div className="divide-y divide-white/5">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);

                return (
                  <div key={match.id} className="grid grid-cols-12 p-3 items-center hover:bg-[#161f2e] transition-colors">
                    <div className="col-span-7 pr-4 group">
                      <Link href={`/${match.id}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-[#10b981] font-black uppercase italic tracking-tighter truncate max-w-[150px]">
                            {match.display_league || match.league_name}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1 italic">
                            <Clock size={10} /> {formatFixedTime(match.commence_time)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-200 uppercase truncate group-hover:text-[#10b981]">{cleanName(match.home_team)}</span>
                          <span className="text-sm font-black text-slate-200 uppercase truncate group-hover:text-[#10b981]">{cleanName(match.away_team)}</span>
                        </div>
                      </Link>
                    </div>

                    <div className="col-span-5 grid grid-cols-3 gap-1.5 h-11">
                      {[
                        { label: '1', val: match.home_odds },
                        { label: 'X', val: match.draw_odds },
                        { label: '2', val: match.away_odds }
                      ].map((odd) => (
                        <button
                          key={odd.label}
                          onClick={() => toggleBet(odd.label, odd.val, match)}
                          className={`rounded-md flex items-center justify-center font-black text-[10px] italic border transition-all ${
                            currentSelection?.selection === odd.label 
                              ? 'bg-[#10b981] border-[#10b981] text-white' 
                              : 'bg-[#1c2636] border-white/5 text-slate-300 hover:text-[#10b981]'
                          }`}
                        >
                          {odd.val ? parseFloat(odd.val).toFixed(2) : '—'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center opacity-20">
                <Clock className="mx-auto mb-2 text-slate-500" size={32} />
                <p className="text-[10px] font-black uppercase italic tracking-widest">No Upcoming Matches</p>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block p-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    // Note: Since raw time is Nairobi, we fetch games occurring after "Nairobi Now"
    const now = new Date(Date.now() - 60000).toISOString();

    const { data } = await supabase
      .from('api_events')
      .select('*')
      .in('sport_key', ['soccer', 'basketball', 'ice-hockey', 'tennis', 'table-tennis'])
      .gt('commence_time', now)
      .order('commence_time', { ascending: true })
      .limit(100); 

    return { props: { initialMatches: data || [] } };
  } catch (err) {
    return { props: { initialMatches: [] } };
  }
}
