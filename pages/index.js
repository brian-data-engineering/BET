import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Clock, Trophy, List, X, LayoutGrid, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = (commenceTime) => {
    if (!commenceTime) return { isLocked: true, secondsLeft: 0 };
    const cleanTime = commenceTime.split('+')[0].replace(' ', 'T');
    const matchDate = new Date(cleanTime);
    const lockTime = matchDate.getTime() - 60000;
    const isLocked = currentTime.getTime() >= lockTime;
    return {
      isLocked: isLocked,
      secondsLeft: Math.floor((matchDate.getTime() - currentTime.getTime()) / 1000)
    };
  };

  const formatFixedTime = (dateString) => {
    if (!dateString) return 'TBD';
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
    const { isLocked } = getMatchStatus(match.commence_time);
    if (isLocked) return;
    const betId = `${match.id}-${selection}`;
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) return prev.filter(item => item.id !== betId);
      const otherMatches = prev.filter(item => item.matchId !== match.id);
      return [...otherMatches, {
        id: betId,
        matchId: match.id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: selection,
        marketName: '1X2',
        odds: value,
        startTime: match.commence_time 
      }];
    });
  };

  const displayMatches = useMemo(() => {
    let filtered = initialMatches.filter(m => {
      const { isLocked } = getMatchStatus(m.commence_time);
      if (isLocked) return false;
      const league = (m.league_name || '').toLowerCase();
      return !/(ebasketball|esoccer|srl|electronic|cyber)/i.test(league);
    });
    if (selectedLeague) {
      filtered = filtered.filter(m => m.league_name === selectedLeague || m.display_league === selectedLeague);
    } else {
      filtered = filtered.filter(m => m.sport_key === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(q) || m.away_team?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab, currentTime]);

  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white font-sans flex flex-col overflow-hidden">
      <Navbar onSearch={setSearchQuery} />

      {/* Mobile Overlays */}
      <div className={`fixed inset-0 z-[100] flex transition-transform duration-300 lg:hidden ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="w-[280px] h-full bg-[#111926] shadow-2xl relative overflow-y-auto">
          <Sidebar onSelectLeague={(l, s) => { if (s) setActiveTab(s); setSelectedLeague(l); setIsMobileSidebarOpen(false); }} onClearFilter={() => { setSelectedLeague(null); setIsMobileSidebarOpen(false); }} />
        </div>
        <div className="flex-1 bg-black/60" onClick={() => setIsMobileSidebarOpen(false)} />
      </div>

      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[110] bg-[#0b0f1a] lg:hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#111926]">
            <h3 className="font-bold text-[#10b981] flex items-center gap-2"><Trophy size={18}/> Betslip</h3>
            <button onClick={() => setIsMobileSlipOpen(false)} className="bg-white/5 p-2 rounded-full"><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4"><Betslip items={slipItems} setItems={setSlipItems} /></div>
        </div>
      )}

      <div className="flex w-full flex-1 h-[calc(100vh-64px)]">
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col overflow-y-auto shrink-0">
          <Sidebar onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} onClearFilter={() => setSelectedLeague(null)} />
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#0b0f1a] relative custom-scrollbar">
          <div className="sticky top-0 z-20 bg-[#111926] border-b border-white/5 flex items-center px-4 overflow-x-auto no-scrollbar">
            {sportTabs.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }} 
                className={`py-4 px-5 text-xs font-semibold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-[#10b981]' : 'text-slate-400 hover:text-white'}`}>
                <span>{tab.icon}</span> {tab.name}
                {activeTab === tab.id && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#10b981]" />}
              </button>
            ))}
          </div>

          <div className="p-2 sm:p-4 w-full max-w-5xl mx-auto pb-24 lg:pb-6">
            <div className="space-y-1">
              {displayMatches.length > 0 ? displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);

                return (
                  <div key={match.id} className="bg-[#111926]/40 border-b border-white/5 p-3 hover:bg-[#1c2636]/50 transition-all">
                    {/* Top League Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                          {match.display_league || match.league_name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                         Starts {formatFixedTime(match.commence_time)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      {/* Left Side: Teams */}
                      <Link href={`/${match.id}`} className="flex-1 min-w-0 group">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-[#10b981] truncate leading-tight">
                            {cleanName(match.home_team)}
                          </span>
                          <span className="text-sm font-bold text-white group-hover:text-[#10b981] truncate leading-tight">
                            {cleanName(match.away_team)}
                          </span>
                        </div>
                      </Link>

                      {/* Right Side: Odds Pills */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {[
                          { l: '1', v: match.home_odds },
                          { l: 'X', v: match.draw_odds },
                          { l: '2', v: match.away_odds }
                        ].map((odd) => (
                          <button
                            key={odd.l}
                            onClick={() => toggleBet(odd.l, odd.v, match)}
                            className={`w-[68px] h-[38px] rounded-md flex items-center justify-center transition-all ${
                              currentSelection?.selection === odd.l
                                ? 'bg-[#10b981] text-[#0b0f1a] font-black'
                                : 'bg-[#1c2636] text-white hover:bg-[#253041] font-bold'
                            }`}
                          >
                            <span className="text-sm tabular-nums">
                              {odd.v ? parseFloat(odd.v).toFixed(2) : '—'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-20 text-center text-slate-600 text-sm font-medium flex flex-col items-center gap-2">
                  <AlertCircle size={32} className="opacity-10" />
                  No events available
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden xl:block w-80 bg-[#111926] p-4 border-l border-white/5 shrink-0">
          <div className="sticky top-6"><Betslip items={slipItems} setItems={setSlipItems} /></div>
        </aside>
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#111926] border-t border-white/10 h-16 flex lg:hidden z-[90] items-center justify-around px-2 pb-safe">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-400">
          <List size={20} /> <span className="text-[10px] font-medium">A-Z Sports</span>
        </button>
        <button onClick={() => {setSelectedLeague(null); window.scrollTo({top: 0, behavior: 'smooth'});}} className="flex flex-col items-center gap-1 text-[#10b981]">
          <LayoutGrid size={20} /> <span className="text-[10px] font-medium">Home</span>
        </button>
        <div className="relative">
          <button onClick={() => setIsMobileSlipOpen(true)} className="bg-[#10b981] w-14 h-14 rounded-full -mt-8 border-4 border-[#0b0f1a] flex items-center justify-center text-[#0b0f1a] shadow-xl">
            <Trophy size={24} />
          </button>
          {slipItems.length > 0 && <div className="absolute -top-9 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-[#0b0f1a]">{slipItems.length}</div>}
        </div>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <Clock size={20} /> <span className="text-[10px] font-medium">In-Play</span>
        </button>
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">ME</div>
          <span className="text-[10px] font-medium">Account</span>
        </div>
      </nav>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const nowLocalAsUTC = new Date(Date.now() + 60000).toISOString().replace('Z', '');
    const { data } = await supabase
      .from('api_events')
      .select('*')
      .in('sport_key', ['soccer', 'basketball', 'ice-hockey', 'tennis', 'table-tennis'])
      .gt('commence_time', nowLocalAsUTC)
      .order('commence_time', { ascending: true })
      .limit(1000); 
    return { props: { initialMatches: data || [] } };
  } catch (err) { return { props: { initialMatches: [] } }; }
}
