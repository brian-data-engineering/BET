import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Clock, Trophy, List, X, LayoutGrid, AlertCircle } from 'lucide-react';
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
    if (!commenceTime) return { isLocked: true };
    const cleanTime = commenceTime.split('+')[0].replace(' ', 'T');
    const matchDate = new Date(cleanTime);
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
      if (prev.find(item => item.id === betId)) return prev.filter(item => item.id !== betId);
      if (prev.length >= 20) return prev; 

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
      return !/(ebasketball|esoccer|srl|electronic|cyber|simulated)/i.test(league);
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
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white font-sans flex flex-col overflow-hidden selection:bg-[#10b981]/30">
      <Navbar onSearch={setSearchQuery} />

      <div className="flex w-full flex-1 h-[calc(100vh-64px)] overflow-hidden">
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col overflow-y-auto shrink-0 no-scrollbar">
          <Sidebar onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} onClearFilter={() => setSelectedLeague(null)} />
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#0b0f1a] relative no-scrollbar flex flex-col">
          {/* SPORT TABS */}
          <div className="sticky top-0 z-20 bg-[#0b0f1a]/95 backdrop-blur-md border-b border-white/5 flex items-center px-4 py-3 overflow-x-auto no-scrollbar gap-2 shrink-0">
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
          <div className="p-3 sm:p-4 pb-32 lg:pb-8 flex-1">
            <div className="max-w-4xl mx-auto space-y-3">
              {displayMatches.length > 0 ? displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);
                return (
                  <div key={match.id} className="bg-[#111926]/70 border border-white/5 rounded-2xl p-4 transition-all">
                    {/* Header: League & Time */}
                    <div className="flex items-center justify-between mb-3 opacity-60">
                       <span className="text-[9px] uppercase font-black italic tracking-widest truncate max-w-[70%]">
                          {match.display_league || match.league_name}
                       </span>
                       <span className="text-[10px] font-black italic tabular-nums">{formatFixedTime(match.commence_time)}</span>
                    </div>

                    {/* Team Names (Linked) */}
                    <Link href={`/${match.id}`} className="block mb-4 group">
                      <div className="flex flex-col gap-1">
                        <h2 className="text-base font-black uppercase italic text-white group-hover:text-[#10b981] truncate transition-colors">
                          {cleanName(match.home_team)}
                        </h2>
                        <h2 className="text-base font-black uppercase italic text-white group-hover:text-[#10b981] truncate transition-colors">
                          {cleanName(match.away_team)}
                        </h2>
                      </div>
                    </Link>

                    {/* Odds Grid (3 Columns ensure 1, X, 2 all show) */}
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {[
                        { label: '1', val: match.home_odds },
                        { label: 'X', val: match.draw_odds },
                        { label: '2', val: match.away_odds }
                      ].map((odd, i) => (
                        <button
                          key={i}
                          onClick={() => toggleBet(odd.label, odd.val, match)}
                          className={`h-[50px] rounded-xl flex flex-col items-center justify-center transition-all border-2 ${
                            currentSelection?.selection === odd.label
                              ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/20 scale-[1.02]'
                              : 'bg-[#1c2636] border-white/5 text-white active:scale-95'
                          }`}
                        >
                          <span className="text-[8px] font-black opacity-50 uppercase mb-0.5">{odd.label}</span>
                          <span className="text-sm font-black italic tabular-nums">
                            {odd.val ? parseFloat(odd.val).toFixed(2) : '—'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }) : (
                <div className="py-24 text-center opacity-20 flex flex-col items-center">
                  <AlertCircle size={48} className="mb-2" />
                  <p className="text-xs font-black uppercase italic tracking-widest">No Events Found</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* DESKTOP SIDEBARS */}
        <aside className="hidden xl:flex w-96 border-l border-white/5 bg-[#111926] shrink-0 p-4">
            <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      {/* MOBILE NAV PILL */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111926]/90 backdrop-blur-2xl border border-white/10 h-16 w-[92%] max-w-md rounded-2xl lg:hidden z-[100] flex items-center justify-around px-2 shadow-2xl">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-500">
          <List size={20} /> <span className="text-[8px] font-black uppercase italic">Menu</span>
        </button>
        <button onClick={() => {setSelectedLeague(null); window.scrollTo({top: 0, behavior: 'smooth'});}} className="flex flex-col items-center gap-1 text-[#10b981]">
          <LayoutGrid size={20} /> <span className="text-[8px] font-black uppercase italic">Home</span>
        </button>
        <div className="relative">
          <button onClick={() => setIsMobileSlipOpen(true)} className="bg-[#10b981] w-14 h-14 rounded-2xl -mt-10 flex items-center justify-center text-[#0b0f1a] shadow-xl border-4 border-[#0b0f1a] active:scale-90 transition-transform">
            <Trophy size={24} />
          </button>
          {slipItems.length > 0 && <div className="absolute -top-12 -right-1 bg-white text-black w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#10b981]">{slipItems.length}</div>}
        </div>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <Clock size={20} /> <span className="text-[8px] font-black uppercase italic">Live</span>
        </button>
        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black border border-white/10 text-slate-600">ME</div>
      </nav>

      {/* OVERLAYS */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[120] flex lg:hidden">
          <div className="w-[280px] h-full bg-[#111926] animate-in slide-in-from-left duration-300">
             <Sidebar onSelectLeague={(l, s) => { if (s) setActiveTab(s); setSelectedLeague(l); setIsMobileSidebarOpen(false); }} onClearFilter={() => { setSelectedLeague(null); setIsMobileSidebarOpen(false); }} />
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
        </div>
      )}

      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[130] bg-[#0b0f1a] lg:hidden flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-black italic text-[#10b981] flex items-center gap-2 uppercase"><Trophy size={20}/> SLIP</h3>
             <button onClick={() => setIsMobileSlipOpen(false)} className="bg-white/5 p-2 rounded-xl"><X size={22}/></button>
          </div>
          <div className="flex-1 overflow-y-auto"><Betslip items={slipItems} setItems={setSlipItems} /></div>
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
      .in('sport_key', ['soccer', 'basketball', 'ice-hockey', 'tennis', 'table-tennis'])
      .gt('commence_time', new Date().toISOString())
      .order('commence_time', { ascending: true })
      .limit(1000); 

    return { props: { initialMatches: data || [] } };
  } catch (err) { 
    return { props: { initialMatches: [] } }; 
  }
}
