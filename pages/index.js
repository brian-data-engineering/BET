import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import MobileFooter from '../components/MobileFooter';
import HomeBanner from '../components/HomeBanner'; 
import { useBets } from '../context/BetContext'; 
import { Clock, AlertCircle, X, Trophy, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { translateOutcome } from '../lib/marketTranslator';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = (commenceTime) => {
    if (!commenceTime) return { isLocked: false, isStartingSoon: false };
    const matchDate = new Date(commenceTime);
    const timeDiff = matchDate.getTime() - currentTime.getTime();
    return { 
      isLocked: timeDiff <= 0, 
      isStartingSoon: timeDiff > 0 && timeDiff <= 600000 
    };
  };

  const formatFixedTime = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const cleanName = (name) => name ? name.replace(/['"]+/g, '').trim() : 'TBD';

  const sportTabs = [
    { id: 'soccer', name: 'Soccer', icon: '⚽', sportId: 1 },
    { id: 'basketball', name: 'Basketball', icon: '🏀', sportId: 3 },
  ];

  const toggleBet = (selectionLabel, odds, match) => {
    const { isLocked } = getMatchStatus(match.commence_time);
    if (isLocked || !odds) return;

    const betId = `${match.match_id}-${selectionLabel}`;
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) return prev.filter(item => item.id !== betId);
      if (prev.length >= 20) return prev; 
      return [...prev.filter(item => item.matchId !== match.match_id), {
        id: betId,
        matchId: match.match_id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: selectionLabel,
        marketName: 'Full Time',
        odds: odds,
        startTime: match.commence_time 
      }];
    });
  };

  const displayMatches = useMemo(() => {
    let filtered = initialMatches;
    
    // Filter by Sport
    const currentSport = sportTabs.find(t => t.id === activeTab);
    filtered = filtered.filter(m => m.sport_id === currentSport?.sportId);

    if (selectedLeague) {
      filtered = filtered.filter(m => m.league_name === selectedLeague);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(q) || 
        m.away_team?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab]);

  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white flex flex-col overflow-hidden font-sans">
      <Navbar onSearch={setSearchQuery} />

      <div className="flex w-full flex-1 h-[calc(100vh-64px)] overflow-hidden">
        {/* SIDEBAR */}
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col shrink-0">
          <Sidebar 
            onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} 
            onClearFilter={() => setSelectedLeague(null)} 
          />
        </aside>

        {/* MAIN FEED */}
        <main className="flex-1 overflow-y-auto bg-[#0b0f1a] no-scrollbar flex flex-col relative">
          
          {/* SPORT SELECTOR */}
          <div className="sticky top-0 z-20 bg-[#0b0f1a]/95 backdrop-blur-xl border-b border-white/5 flex items-center px-4 py-3 gap-2 shrink-0">
            {sportTabs.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }} 
                className={`py-2 px-5 rounded-full text-[11px] font-bold capitalize italic tracking-wide transition-all border ${
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
                Upcoming {activeTab} Matches
              </h2>

              {displayMatches.length > 0 ? displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.match_id);
                const { isStartingSoon, isLocked } = getMatchStatus(match.commence_time);
                
                // Mapping the 1X2 odds from your DB columns
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
                    {/* TEAM INFO */}
                    <Link href={`/${match.match_id}`} className="col-span-7 flex flex-col justify-center overflow-hidden group">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px]">
                          {match.league_name}
                        </span>
                        <div className={`h-1 w-1 rounded-full ${isStartingSoon ? 'bg-[#10b981] animate-ping' : 'bg-white/10'}`} />
                        <span className={`text-[10px] font-bold flex items-center gap-1 ${isStartingSoon ? 'text-[#10b981]' : 'text-slate-400'}`}>
                          <Clock size={10} /> {formatFixedTime(match.commence_time)}
                        </span>
                      </div>
                      
                      <div className="space-y-0.5">
                        <p className="text-[16px] font-black italic capitalize leading-tight tracking-tight group-hover:text-[#10b981] transition-colors">
                          {cleanName(match.home_team)}
                        </p>
                        <p className="text-[16px] font-black italic capitalize leading-tight tracking-tight text-white/70">
                          {cleanName(match.away_team)}
                        </p>
                      </div>
                    </Link>

                    {/* ODDS BUTTONS */}
                    <div className="col-span-5 grid grid-cols-3 gap-2">
                      {oddsData.map((o) => (
                       <button
                          key={o.label}
                          disabled={isLocked}
                          onClick={() => toggleBet(translateOutcome(o.label), o.val, match)}
                          className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all border ${
                            currentSelection?.selection === translateOutcome(o.label)
                              ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] font-bold shadow-lg shadow-[#10b981]/40 scale-105' 
                              : 'bg-[#1c2636]/60 border-white/5 text-white hover:border-white/20 active:scale-95'
                          } ${isLocked ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                        >
                          <span className="text-[9px] font-black opacity-50 mb-0.5">{translateOutcome(o.label)}</span>
                          <span className="text-[13px] font-black tracking-tighter">
                            {o.val ? parseFloat(o.val).toFixed(2) : '—'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }) : (
                <div className="py-32 text-center opacity-20 flex flex-col items-center">
                  <AlertCircle size={48} className="mb-4 text-[#10b981]" />
                  <p className="text-sm font-bold italic tracking-widest uppercase">No Live Markets Found</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* DESKTOP BETSLIP */}
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

      {/* MOBILE OVERLAYS */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[120] flex lg:hidden">
          <div className="w-[280px] h-full bg-[#111926] shadow-2xl">
             <Sidebar 
                onSelectLeague={(l, s) => { if (s) setActiveTab(s); setSelectedLeague(l); setIsMobileSidebarOpen(false); }} 
                onClearFilter={() => { setSelectedLeague(null); setIsMobileSidebarOpen(false); }} 
              />
          </div>
          <div className="flex-1 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { data } = await supabase
      .from('xmatch_odds')
      .select('*')
      .gt('commence_time', new Date().toISOString())
      .order('commence_time', { ascending: true })
      .limit(200); 

    return { props: { initialMatches: data || [] } };
  } catch (err) { 
    return { props: { initialMatches: [] } }; 
  }
}
