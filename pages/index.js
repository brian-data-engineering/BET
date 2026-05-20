import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import MobileFooter from '../components/MobileFooter';
import HomeBanner from '../components/HomeBanner';
import { useBets } from '../context/BetContext';
import { Clock, AlertCircle, Terminal, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Sports with no draw — show only 2 buttons
const NO_DRAW_SPORTS = new Set(['tennis', 'table-tennis', 'basketball']);

const sportTabs = [
  { id: 'soccer',       name: 'Soccer',       icon: '⚽', sportKey: 'soccer'       },
  { id: 'basketball',   name: 'Basketball',   icon: '🏀', sportKey: 'basketball'   },
  { id: 'tennis',       name: 'Tennis',       icon: '🎾', sportKey: 'tennis'       },
  { id: 'ice-hockey',   name: 'Ice Hockey',   icon: '🏒', sportKey: 'ice-hockey'   },
  { id: 'table-tennis', name: 'Table Tennis', icon: '🏓', sportKey: 'table-tennis' },
];

// Format time — shows date if not today
function formatMatchTime(dateString) {
  if (!dateString) return 'TBD';
  const matchDate = new Date(dateString);
  const now = new Date();

  const isToday =
    matchDate.getDate() === now.getDate() &&
    matchDate.getMonth() === now.getMonth() &&
    matchDate.getFullYear() === now.getFullYear();

  const isTomorrow =
    matchDate.getDate() === now.getDate() + 1 &&
    matchDate.getMonth() === now.getMonth() &&
    matchDate.getFullYear() === now.getFullYear();

  const timeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isToday) return timeStr;
  if (isTomorrow) return `Tomorrow ${timeStr}`;

  // Different month/year — show full date
  const dateStr = matchDate.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return `${dateStr} ${timeStr}`;
}

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { slipItems, setSlipItems } = useBets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDebug, setShowDebug] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const scrollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedLeague, searchQuery]);

  const getMatchStatus = (startTime) => {
    if (!startTime) return { isLocked: false, isStartingSoon: false };
    const matchDate = new Date(startTime);
    const timeDiff = matchDate.getTime() - currentTime.getTime();
    return {
      isLocked: timeDiff <= 0,
      isStartingSoon: timeDiff > 0 && timeDiff <= 600000
    };
  };

  // Sidebar league click — sets both the sport tab AND league filter
  const handleLeagueSelect = (leagueName, sportKey) => {
    // Find the matching tab id from sportKey
    const matchingTab = sportTabs.find(t => t.sportKey === sportKey);
    if (matchingTab) setActiveTab(matchingTab.id);
    setSelectedLeague(leagueName);
    setSearchQuery('');
    setIsMobileSidebarOpen(false);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBet = (label, odds, match) => {
    const { isLocked } = getMatchStatus(match.start_time);
    if (isLocked || !odds) return;

    const betId = `${match.match_id}-${label}`;
    const selectionLabel = label === '1' ? 'Home' : label === 'X' ? 'Draw' : 'Away';

    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) return prev.filter(item => item.id !== betId);
      if (prev.length >= 20) return prev;
      return [...prev.filter(item => item.matchId !== match.match_id), {
        id: betId,
        matchId: match.match_id,
        league_id: match.league_id, // <--- ADD THIS LINE
        matchName: `${match.home_team} vs ${match.away_team}`,
        selection: selectionLabel,
        marketName: 'Match Winner',
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

    // Filter by active sport tab
    const currentSport = sportTabs.find(t => t.id === activeTab);
    filtered = filtered.filter(m => m.sport_key === currentSport?.sportKey);

    // Filter by selected league
    if (selectedLeague) {
      filtered = filtered.filter(m => m.league_name === selectedLeague);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.home_team?.toLowerCase().includes(q) || m.away_team?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab]);

  const paginatedMatches = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayMatches.slice(startIndex, startIndex + itemsPerPage);
  }, [displayMatches, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(displayMatches.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white flex flex-col overflow-hidden font-sans">
      <Navbar onSearch={setSearchQuery} />

      {/* DEBUG HUD */}
      <button onClick={() => setShowDebug(!showDebug)} className="fixed bottom-24 right-6 z-[100] bg-black/80 p-3 rounded-full border border-white/10 text-[#10b981]">
        <Terminal size={20} />
      </button>
      {showDebug && (
        <div className="fixed top-20 right-6 z-[100] bg-[#111926] p-4 rounded-xl border border-[#10b981]/30 shadow-2xl w-64 text-[10px] font-mono space-y-1">
          <p>Total loaded: <span className="text-white">{initialMatches.length}</span></p>
          <p>Filtered: <span className="text-white">{displayMatches.length}</span></p>
          <p>Tab: <span className="text-white">{activeTab}</span></p>
          <p>League: <span className="text-white">{selectedLeague || 'None'}</span></p>
          <p>First sport_key: <span className="text-white">{displayMatches[0]?.sport_key || 'N/A'}</span></p>
          <p>First home_odds: <span className="text-white">{displayMatches[0]?.home_odds || 'N/A'}</span></p>
        </div>
      )}

      <div className="flex w-full flex-1 h-[calc(100vh-64px)] overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col shrink-0">
          <Sidebar
            onSelectLeague={handleLeagueSelect}
            onClearFilter={() => { setSelectedLeague(null); }}
          />
        </aside>

        {/* MAIN FEED */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto bg-[#0b0f1a] no-scrollbar flex flex-col relative">

          {/* SPORT TABS */}
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

              {/* HEADER */}
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-black text-[#10b981] italic">
                  {selectedLeague ? selectedLeague : `Upcoming ${sportTabs.find(t => t.id === activeTab)?.name} Matches`}
                </h2>
                {selectedLeague && (
                  <button
                    onClick={() => setSelectedLeague(null)}
                    className="flex items-center gap-1 text-[9px] font-bold text-red-400 uppercase tracking-tighter bg-red-400/10 px-2 py-1 rounded"
                  >
                    <X size={10} /> Clear
                  </button>
                )}
              </div>

              {paginatedMatches.length > 0 ? paginatedMatches.map((match) => {
                const { isStartingSoon, isLocked } = getMatchStatus(match.start_time);
                const noDraw = NO_DRAW_SPORTS.has(match.sport_key);
                const timeLabel = formatMatchTime(match.start_time);

                const oddsData = noDraw
                  ? [
                      { label: '1', val: match.home_odds },
                      { label: '2', val: match.away_odds }
                    ]
                  : [
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
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[120px]">
                          {match.league_name}
                        </span>
                        <div className={`h-1 w-1 rounded-full flex-shrink-0 ${isStartingSoon ? 'bg-[#10b981] animate-ping' : 'bg-white/10'}`} />
                        <span className={`text-[10px] font-bold flex items-center gap-1 whitespace-nowrap ${isStartingSoon ? 'text-[#10b981]' : 'text-slate-400'}`}>
                          <Clock size={10} /> {timeLabel}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[16px] font-black italic leading-tight group-hover:text-[#10b981] transition-colors truncate">{match.home_team}</p>
                        <p className="text-[16px] font-black italic leading-tight text-white/70 truncate">{match.away_team}</p>
                      </div>
                    </Link>

                    {/* Odds buttons */}
                    <div className={`col-span-5 grid gap-2 ${noDraw ? 'grid-cols-2' : 'grid-cols-3'}`}>
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

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="mt-8 mb-12 flex flex-col items-center gap-6 border-t border-white/5 pt-10">
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-4 py-2 rounded-xl bg-[#1c2636]/60 border border-white/5 text-[10px] font-black uppercase italic tracking-widest text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                    >
                      Prev
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (
                          pageNum === 1 || 
                          pageNum === totalPages || 
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all ${
                                currentPage === pageNum 
                                  ? 'bg-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/20' 
                                  : 'text-slate-500 hover:bg-white/5'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return <span key={pageNum} className="text-slate-700 px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-4 py-2 rounded-xl bg-[#1c2636]/60 border border-white/5 text-[10px] font-black uppercase italic tracking-widest text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                    >
                      Next
                    </button>
                  </div>
                  
                  <div className="text-[9px] font-black text-slate-600 uppercase italic tracking-[0.2em]">
                    Showing <span className="text-white">{Math.min((currentPage - 1) * itemsPerPage + 1, displayMatches.length)}</span> to <span className="text-white">{Math.min(currentPage * itemsPerPage, displayMatches.length)}</span> of <span className="text-white">{displayMatches.length}</span> Events
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* RIGHT BETSLIP */}
        <aside className="hidden xl:flex w-[380px] border-l border-white/5 bg-[#111926] shrink-0 p-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      <MobileFooter
        itemCount={slipItems.length}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenSlip={() => setIsMobileSlipOpen(true)}
        onGoHome={() => { setSelectedLeague(null); setActiveTab('soccer'); }}
      />
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { data, error } = await supabase
      .from('xmatch_flat')
      .select('match_id, home_team, away_team, start_time, sport_id, sport_key, league_id, league_name, tier_priority, home_odds, draw_odds, away_odds')
      .order('tier_priority', { ascending: false })
      .order('start_time', { ascending: true })
      .limit(2000);

    if (error) throw error;
    return { props: { initialMatches: data || [] } };
  } catch (err) {
    return { props: { initialMatches: [] } };
  }
}
