import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import MobileFooter from '../components/MobileFooter';
import HomeBanner from '../components/HomeBanner';
import { useBets } from '../context/BetContext';
import { Clock, AlertCircle, Terminal } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { slipItems, setSlipItems } = useBets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDebug, setShowDebug] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = (startTime) => {
    if (!startTime) return { isLocked: false, isStartingSoon: false };
    const matchDate = new Date(startTime);
    const timeDiff = matchDate.getTime() - currentTime.getTime();
    return {
      isLocked: timeDiff <= 0,
      isStartingSoon: timeDiff > 0 && timeDiff <= 600000
    };
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const sportTabs = [
    { id: 'soccer',       name: 'Soccer',       icon: '⚽', sportKey: 'soccer'       },
    { id: 'basketball',   name: 'Basketball',   icon: '🏀', sportKey: 'basketball'   },
    { id: 'tennis',       name: 'Tennis',       icon: '🎾', sportKey: 'tennis'       },
    { id: 'ice-hockey',   name: 'Ice Hockey',   icon: '🏒', sportKey: 'ice-hockey'   },
    { id: 'table-tennis', name: 'Table Tennis', icon: '🏓', sportKey: 'table-tennis' },
  ];

  const toggleBet = (label, odds, match) => {
    const { isLocked } = getMatchStatus(match.start_time);
    if (isLocked || !odds) return;

    const betId = `${match.match_id}-${label}`;

    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) return prev.filter(item => item.id !== betId);
      if (prev.length >= 20) return prev;
      return [...prev.filter(item => item.matchId !== match.match_id), {
        id: betId,
        matchId: match.match_id,
        matchName: `${match.home_team} vs ${match.away_team}`,
        selection: label === '1' ? 'Home' : label === 'X' ? 'Draw' : 'Away',
        marketName: 'Full Time',
        odds: odds,
        startTime: match.start_time,
        sport_key: match.sport_key,
        display_league: match.league_name,
        country: match.league_name?.split('.')?.[0]?.trim() || 'International'
      }];
    });
  };

  const displayMatches = useMemo(() => {
    let filtered = initialMatches;

    const currentSport = sportTabs.find(t => t.id === activeTab);
    filtered = filtered.filter(m => m.sport_key === currentSport?.sportKey);

    if (selectedLeague) {
      filtered = filtered.filter(m => m.league_name === selectedLeague);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.home_team?.toLowerCase().includes(q) || m.away_team?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab]);

  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white flex flex-col overflow-hidden font-sans">
      <Navbar onSearch={setSearchQuery} />

      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-24 right-6 z-[100] bg-black/80 p-3 rounded-full border border-white/10 text-[#10b981] hover:scale-110 transition-all"
      >
        <Terminal size={20} />
      </button>

      {showDebug && (
        <div className="fixed top-20 right-6 z-[100] bg-[#111926] p-4 rounded-xl border border-[#10b981]/30 shadow-2xl w-64 text-[10px] font-mono">
          <h3 className="text-[#10b981] mb-2 font-bold uppercase tracking-widest text-[9px]">Lucra Debug HUD</h3>
          <div className="space-y-1 text-slate-300">
            <p>Total loaded: <span className="text-white">{initialMatches.length}</span></p>
            <p>Filtered: <span className="text-white">{displayMatches.length}</span></p>
            <p>Active tab: <span className="text-white">{activeTab}</span></p>
            <p>Sport key: <span className="text-white">{sportTabs.find(t => t.id === activeTab)?.sportKey}</span></p>
            <hr className="border-white/5 my-2" />
            <p className="truncate text-slate-500">First ID: {initialMatches[0]?.match_id || 'N/A'}</p>
            <p className="truncate text-slate-500">First sport_key: {initialMatches[0]?.sport_key || 'N/A'}</p>
            <p className="truncate text-slate-500">First league: {initialMatches[0]?.league_name || 'N/A'}</p>
          </div>
        </div>
      )}

      <div className="flex w-full flex-1 h-[calc(100vh-64px)] overflow-hidden">
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col shrink-0">
          <Sidebar
            onSelectLeague={(l, s) => { if (s) setActiveTab(s); setSelectedLeague(l); }}
            onClearFilter={() => setSelectedLeague(null)}
          />
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#0b0f1a] no-scrollbar flex flex-col relative">
          <div className="sticky top-0 z-20 bg-[#0b0f1a]/95 backdrop-blur-xl border-b border-white/5 flex items-center px-4 py-3 gap-2 shrink-0 overflow-x-auto no-scrollbar">
            {sportTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }}
                className={`py-2 px-5 rounded-full text-[11px] font-bold capitalize italic tracking-wide transition-all border whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/20'
                    : 'bg-[#1c2636]/40 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>{tab.name}
              </button>
            ))}
          </div>

          <div className="pb-32 lg:pb-10 flex-1 w-full">
            <HomeBanner />

            <div className="px-4 mt-6">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black text-[#10b981] mb-4 italic px-1">
                Upcoming {sportTabs.find(t => t.id === activeTab)?.name} Matches
              </h2>

              {displayMatches.length > 0 ? displayMatches.map((match) => {
                const { isStartingSoon, isLocked } = getMatchStatus(match.start_time);

                const oddsData = [
                  { label: '1', val: match.home_odds },
                  { label: 'X', val: match.draw_odds },
                  { label: '2', val: match.away_odds }
                ];

                return (
                  <div
                    key={match.match_id}
                    className={`grid grid-cols-12 gap-2 py-5 border-b border-white/5 items-center transition-colors px-2 ${isStartingSoon ? 'bg-[#10b981]/5' : 'hover:bg-white/[0.02]'}`}
                  >
                    <Link href={`/${match.match_id}`} className="col-span-7 flex flex-col justify-center overflow-hidden group">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px]">
                          {match.league_name}
                        </span>
                        <div className={`h-1 w-1 rounded-full flex-shrink-0 ${isStartingSoon ? 'bg-[#10b981] animate-ping' : 'bg-white/10'}`} />
                        <span className={`text-[10px] font-bold flex items-center gap-1 whitespace-nowrap ${isStartingSoon ? 'text-[#10b981]' : 'text-slate-400'}`}>
                          <Clock size={10} /> {formatTime(match.start_time)}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[16px] font-black italic leading-tight tracking-tight group-hover:text-[#10b981] transition-colors truncate">{match.home_team}</p>
                        <p className="text-[16px] font-black italic leading-tight tracking-tight text-white/70 truncate">{match.away_team}</p>
                      </div>
                    </Link>

                    <div className="col-span-5 grid grid-cols-3 gap-2">
                      {oddsData.map((o) => {
                        const isSelected = slipItems.some(item => item.id === `${match.match_id}-${o.label}`);
                        return (
                          <button
                            key={o.label}
                            disabled={isLocked || !o.val}
                            onClick={() => toggleBet(o.label, o.val, match)}
                            className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all border ${
                              isSelected
                                ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] font-bold shadow-lg shadow-[#10b981]/40 scale-105'
                                : 'bg-[#1c2636]/60 border-white/5 text-white hover:border-white/20 active:scale-95'
                            } ${isLocked || !o.val ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                          >
                            <span className="text-[9px] font-black opacity-50 mb-0.5">{o.label}</span>
                            <span className="text-[13px] font-black tracking-tighter">
                              {o.val ? Number(o.val).toFixed(2) : '—'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }) : (
                <div className="py-32 text-center opacity-20 flex flex-col items-center">
                  <AlertCircle size={48} className="mb-4 text-[#10b981]" />
                  <p className="text-sm font-bold italic tracking-widest uppercase">No Markets Available</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden xl:flex w-[380px] border-l border-white/5 bg-[#111926] shrink-0 p-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      <MobileFooter
        itemCount={slipItems.length}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenSlip={() => setIsMobileSlipOpen(true)}
        onGoHome={() => setSelectedLeague(null)}
      />
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { data, error } = await supabase
      .from('xmatch_flat')
      .select('match_id, home_team, away_team, start_time, sport_id, sport_key, league_id, league_name, home_odds, draw_odds, away_odds')
      .order('start_time', { ascending: true })
      .limit(500);

    if (error) throw error;

    return { props: { initialMatches: data || [] } };
  } catch (err) {
    console.error("Fetch Error:", err);
    return { props: { initialMatches: [] } };
  }
}
