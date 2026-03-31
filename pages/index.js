import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import MobileFooter from '../components/MobileFooter';
import { useBets } from '../context/BetContext'; 
import { Clock, AlertCircle, X, Trophy } from 'lucide-react';
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
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = (commenceTime) => {
    if (!commenceTime) return { isLocked: true, isStartingSoon: false };
    const cleanTime = commenceTime.split('+')[0].replace(' ', 'T');
    const matchDate = new Date(cleanTime);
    const timeDiff = matchDate.getTime() - currentTime.getTime();
    
    return { 
      isLocked: timeDiff <= 60000, 
      isStartingSoon: timeDiff > 60000 && timeDiff <= 300000 
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
    if (isLocked || !value) return;

    const betId = `${match.id}-${selection}`;
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) return prev.filter(item => item.id !== betId);
      if (prev.length >= 20) return prev; 
      return [...prev.filter(item => item.matchId !== match.id), {
        id: betId,
        matchId: match.id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection,
        marketName: '1X2',
        odds: value,
        startTime: match.commence_time 
      }];
    });
  };

  const displayMatches = useMemo(() => {
    let filtered = initialMatches.filter(m => !getMatchStatus(m.commence_time).isLocked);
    if (selectedLeague) {
      filtered = filtered.filter(m => m.league_name === selectedLeague || m.display_league === selectedLeague);
    } else {
      filtered = filtered.filter(m => m.sport_key === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(q) || 
        m.away_team?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab, currentTime]);

  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white flex flex-col overflow-hidden">
      <Navbar onSearch={setSearchQuery} />

      <div className="flex w-full flex-1 h-[calc(100vh-64px)] overflow-hidden">
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col shrink-0 overflow-hidden">
          <Sidebar 
            onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} 
            onClearFilter={() => setSelectedLeague(null)} 
          />
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#0b0f1a] no-scrollbar flex flex-col relative">
          
          <div className="sticky top-0 z-20 bg-[#0b0f1a]/95 backdrop-blur-xl border-b border-white/5 flex items-center px-4 py-3 overflow-x-auto no-scrollbar gap-2 shrink-0">
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

          <div className="p-3 pb-32 lg:pb-10 flex-1">
            <div className="max-w-4xl mx-auto">
              {displayMatches.length > 0 ? displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);
                const { isStartingSoon } = getMatchStatus(match.commence_time);
                const oddsData = [
                  { label: '1', val: match.home_odds },
                  { label: 'X', val: match.draw_odds },
                  { label: '2', val: match.away_odds }
                ];

                return (
                  <div 
                    key={match.id} 
                    className={`grid grid-cols-12 gap-2 py-4 border-b border-white/5 items-center transition-colors px-1 ${isStartingSoon ? 'bg-orange-500/5' : 'hover:bg-white/[0.02]'}`}
                  >
                    <Link href={`/${match.id}`} className="col-span-7 flex flex-col justify-center overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 capitalize tracking-tight truncate">
                          {match.display_league || match.league_name}
                        </span>
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 whitespace-nowrap ${isStartingSoon ? 'text-orange-500 animate-pulse' : 'text-slate-500'}`}>
                          <Clock size={10} /> {formatFixedTime(match.commence_time)}
                          {isStartingSoon && <span className="ml-1 text-[8px] italic">Starts Soon!</span>}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[15px] font-black italic capitalize leading-tight truncate tracking-tight">
                          {cleanName(match.home_team)}
                        </p>
                        <p className="text-[15px] font-black italic capitalize leading-tight truncate tracking-tight text-white/90">
                          {cleanName(match.away_team)}
                        </p>
                      </div>
                    </Link>

                    <div className="col-span-5 grid grid-cols-3 gap-1.5">
                      {oddsData.map((o) => (
                       <button
                          key={o.label}
                          onClick={() => toggleBet(o.label, o.val, match)}
                          className={`h-9 px-4 rounded-full flex items-center justify-center transition-all ${
                            currentSelection?.selection === o.label 
                              ? 'bg-[#10b981] text-[#0b0f1a] font-bold shadow-lg shadow-[#10b981]/20' 
                              : 'bg-[#1c2636]/60 border border-white/5 text-white active:scale-95'
                          }`}
                        >
                          <span className="text-[13px] font-black tracking-tight">
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
                  <p className="text-sm font-bold italic capitalize tracking-widest">No events available</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden xl:flex w-[400px] border-l border-white/5 bg-[#111926] shrink-0 p-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      <MobileFooter 
        itemCount={slipItems.length}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenSlip={() => setIsMobileSlipOpen(true)}
        onGoHome={() => {
          setSelectedLeague(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* OVERLAYS */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[120] flex lg:hidden">
          <div className="w-[280px] h-full bg-[#111926] animate-in slide-in-from-left duration-300">
             <Sidebar 
                onSelectLeague={(l, s) => { if (s) setActiveTab(s); setSelectedLeague(l); setIsMobileSidebarOpen(false); }} 
                onClearFilter={() => { setSelectedLeague(null); setIsMobileSidebarOpen(false); }} 
              />
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
        </div>
      )}

      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[130] bg-[#0b0f1a] lg:hidden flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-6 shrink-0">
             <h3 className="font-black italic text-[#10b981] flex items-center gap-2 capitalize tracking-tighter text-xl"><Trophy size={22}/> Betslip</h3>
             <button onClick={() => setIsMobileSlipOpen(false)} className="bg-white/5 p-2 rounded-xl text-slate-400"><X size={24}/></button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
            <Betslip items={slipItems} setItems={setSlipItems} />
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const { data } = await supabase
      .from('api_events')
      .select('*')
      .gt('commence_time', new Date().toISOString())
      .order('commence_time', { ascending: true })
      .limit(1000); 

    return { props: { initialMatches: data || [] } };
  } catch (err) { 
    return { props: { initialMatches: [] } }; 
  }
}
