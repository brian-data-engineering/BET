import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Clock, Trophy, List, X, LayoutGrid, AlertCircle, Zap, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  // Update clock every 10 seconds for the "1-minute disappear" logic
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = (commenceTime) => {
    if (!commenceTime) return { isLocked: true };
    // Handle potential date format variations from scraped data
    const cleanTime = commenceTime.split('+')[0].replace(' ', 'T');
    const matchDate = new Date(cleanTime);
    
    // Disappear if match starts in less than 60 seconds
    const isLocked = currentTime.getTime() >= (matchDate.getTime() - 60000);
    return { isLocked };
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
      const isExisting = prev.find(item => item.id === betId);
      if (isExisting) return prev.filter(item => item.id !== betId);

      // MAXIMUM 20 GAMES CHECK
      if (prev.length >= 20) {
        return prev; 
      }

      // Allow only one market per match (Standard Betting Rule)
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
      // Apply disappearance logic
      const { isLocked } = getMatchStatus(m.commence_time);
      if (isLocked) return false;

      // Filter out Virtuals/eSports
      const league = (m.league_name || '').toLowerCase();
      return !/(ebasketball|esoccer|srl|electronic|cyber|simulated)/i.test(league);
    });

    // Handle Sidebar filters
    if (selectedLeague) {
      filtered = filtered.filter(m => m.league_name === selectedLeague || m.display_league === selectedLeague);
    } else {
      filtered = filtered.filter(m => m.sport_key === activeTab);
    }

    // Handle Navbar Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(q) || m.away_team?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab, currentTime]);

  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white font-sans flex flex-col overflow-hidden selection:bg-[#10b981]/30">
      <Navbar onSearch={setSearchQuery} />

      <div className="flex w-full flex-1 h-[calc(100vh-64px)] overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col overflow-y-auto shrink-0 no-scrollbar">
          <Sidebar onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} onClearFilter={() => setSelectedLeague(null)} />
        </aside>

        {/* MAIN FEED */}
        <main className="flex-1 overflow-y-auto bg-[#0b0f1a] relative no-scrollbar flex flex-col">
          
          {/* TOP NAV PILLS */}
          <div className="sticky top-0 z-20 bg-[#0b0f1a]/90 backdrop-blur-md border-b border-white/5 flex items-center px-4 py-3 overflow-x-auto no-scrollbar gap-2 shrink-0">
            {sportTabs.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }} 
                className={`py-2 px-4 rounded-full text-[11px] font-black uppercase italic tracking-wider transition-all flex items-center gap-2 border whitespace-nowrap ${
                  activeTab === tab.id 
                  ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a]' 
                  : 'bg-[#1c2636]/50 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <span>{tab.icon}</span> {tab.name}
              </button>
            ))}
          </div>

          {/* MATCH LIST */}
          <div className="p-2 sm:p-4 pb-32 lg:pb-8 flex-1">
            <div className="max-w-4xl mx-auto space-y-2">
              {displayMatches.length > 0 ? displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);
                return (
                  <div key={match.id} className="bg-[#111926]/60 border border-white/5 rounded-2xl p-4 hover:bg-[#1c2636]/40 transition-all group">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse" />
                         <span className="text-[9px] uppercase font-black italic text-slate-500 tracking-widest truncate max-w-[150px]">
                            {match.display_league || match.league_name}
                         </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={10} />
                        <span className="text-[10px] font-black italic">{formatFixedTime(match.commence_time)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <Link href={`/${match.id}`} className="flex-1 min-w-0">
                        <div className="space-y-0.5">
                          <h2 className="text-[15px] font-black uppercase italic text-white group-hover:text-[#10b981] truncate transition-colors leading-tight">
                            {cleanName(match.home_team)}
                          </h2>
                          <h2 className="text-[15px] font-black uppercase italic text-white group-hover:text-[#10b981] truncate transition-colors leading-tight">
                            {cleanName(match.away_team)}
                          </h2>
                        </div>
                      </Link>

                      {/* ODDS PILLS */}
                      <div className="flex items-center gap-2 shrink-0">
                        {[
                          { l: '1', v: match.home_odds },
                          { l: 'X', v: match.draw_odds },
                          { l: '2', v: match.away_odds }
                        ].map((odd) => (
                          <button
                            key={odd.l}
                            onClick={() => toggleBet(odd.l, odd.v, match)}
                            className={`w-[62px] h-[44px] rounded-xl flex flex-col items-center justify-center transition-all border-2 ${
                              currentSelection?.selection === odd.l
                                ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/20 scale-[1.05]'
                                : 'bg-[#1c2636] border-white/5 text-white hover:border-white/20 active:scale-95'
                            }`}
                          >
                            <span className="text-[8px] font-black opacity-50 leading-none mb-0.5">{odd.l}</span>
                            <span className="text-xs font-black italic tabular-nums">{odd.v ? parseFloat(odd.v).toFixed(2) : '—'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-32 text-center flex flex-col items-center gap-4 opacity-40">
                  <AlertCircle size={40} />
                  <p className="text-[10px] font-black uppercase italic tracking-widest">No Events Found</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* DESKTOP BETSLIP */}
        <aside className="hidden xl:flex w-96 border-l border-white/5 bg-[#111926] shrink-0 p-4">
            <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      {/* FLOATING MOBILE NAV PILL */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111926]/90 backdrop-blur-2xl border border-white/10 h-16 w-[92%] max-w-md rounded-2xl lg:hidden z-[100] flex items-center justify-around px-2 shadow-2xl shadow-black/50">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-500">
          <List size={20} /> <span className="text-[8px] font-black uppercase italic tracking-tighter">A-Z Menu</span>
        </button>
        <button onClick={() => {setSelectedLeague(null); window.scrollTo({top: 0, behavior: 'smooth'});}} className="flex flex-col items-center gap-1 text-[#10b981]">
          <LayoutGrid size={20} /> <span className="text-[8px] font-black uppercase italic tracking-tighter">Home</span>
        </button>
        <div className="relative">
          <button onClick={() => setIsMobileSlipOpen(true)} className="bg-[#10b981] w-14 h-14 rounded-2xl -mt-10 rotate-3 flex items-center justify-center text-[#0b0f1a] shadow-xl border-4 border-[#0b0f1a] active:scale-90 transition-transform">
            <Trophy size={24} className="-rotate-3" />
          </button>
          {slipItems.length > 0 && (
            <div className="absolute -top-12 -right-2 bg-white text-black w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#10b981] animate-bounce">
              {slipItems.length}
            </div>
          )}
        </div>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <Clock size={20} /> <span className="text-[8px] font-black uppercase italic tracking-tighter">In-Play</span>
        </button>
        <div className="flex flex-col items-center gap-1 text-slate-500 opacity-50">
          <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black border border-white/10">ME</div>
          <span className="text-[8px] font-black uppercase italic tracking-tighter">Account</span>
        </div>
      </nav>

      {/* MOBILE OVERLAYS */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[120] flex lg:hidden animate-in fade-in duration-300">
          <div className="w-[280px] h-full bg-[#111926] shadow-2xl relative animate-in slide-in-from-left duration-300">
             <Sidebar onSelectLeague={(l, s) => { if (s) setActiveTab(s); setSelectedLeague(l); setIsMobileSidebarOpen(false); }} onClearFilter={() => { setSelectedLeague(null); setIsMobileSidebarOpen(false); }} />
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
        </div>
      )}

      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[130] bg-[#0b0f1a] lg:hidden flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-black italic text-[#10b981] flex items-center gap-2 uppercase"><Trophy size={20}/> Your Betslip</h3>
             <button onClick={() => setIsMobileSlipOpen(false)} className="bg-white/5 p-2 rounded-xl text-white"><X size={22}/></button>
          </div>
          <div className="flex-1 overflow-y-auto"><Betslip items={slipItems} setItems={setSlipItems} /></div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  try {
    // Basic buffer: only fetch matches starting in the future
    const nowUTC = new Date().toISOString();
    const { data } = await supabase
      .from('api_events')
      .select('*')
      .in('sport_key', ['soccer', 'basketball', 'ice-hockey', 'tennis', 'table-tennis'])
      .gt('commence_time', nowUTC)
      .order('commence_time', { ascending: true })
      .limit(500); 

    return { props: { initialMatches: data || [] } };
  } catch (err) { 
    return { props: { initialMatches: [] } }; 
  }
}
