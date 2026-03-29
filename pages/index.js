import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Clock, Trophy, List, LayoutGrid, AlertCircle, X, Activity } from 'lucide-react';
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
    return { isLocked: currentTime.getTime() >= (matchDate.getTime() - 60000) };
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
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col shrink-0 overflow-hidden">
          <Sidebar 
            onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} 
            onClearFilter={() => setSelectedLeague(null)} 
          />
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#0b0f1a] no-scrollbar flex flex-col relative">
          {/* STICKY SPORT NAV */}
          <div className="sticky top-0 z-20 bg-[#0b0f1a]/95 backdrop-blur-xl border-b border-white/5 flex items-center px-4 py-3 overflow-x-auto no-scrollbar gap-2 shrink-0">
            {sportTabs.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }} 
                className={`py-2 px-5 rounded-full text-[10px] font-black uppercase italic tracking-wider transition-all border ${
                  activeTab === tab.id 
                    ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/20' 
                    : 'bg-[#1c2636]/40 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>{tab.name}
              </button>
            ))}
          </div>

          {/* MATCH LIST */}
          <div className="p-3 sm:p-6 pb-32 lg:pb-10 flex-1">
            <div className="max-w-4xl mx-auto space-y-6">
              {displayMatches.length > 0 ? displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);
                const oddsData = [
                  { label: '1', val: match.home_odds },
                  { label: 'X', val: match.draw_odds },
                  { label: '2', val: match.away_odds }
                ];

                return (
                  <div key={match.id} className="group border-b border-white/5 pb-6 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#10b981]/10 text-[#10b981] text-[9px] font-black px-2 py-0.5 rounded uppercase italic tracking-widest">
                          {match.display_league || match.league_name}
                        </span>
                        <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold italic">
                          <Clock size={10} /> {formatFixedTime(match.commence_time)}
                        </div>
                      </div>
                      <Link href={`/${match.id}`} className="text-[10px] font-black italic text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity">
                        + Markets
                      </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <Link href={`/${match.id}`} className="flex-1">
                        <div className="space-y-1">
                          <h2 className="text-[16px] md:text-lg font-black italic uppercase tracking-tight">
                            {cleanName(match.home_team)}
                          </h2>
                          <h2 className="text-[16px] md:text-lg font-black italic uppercase tracking-tight text-white/90">
                            {cleanName(match.away_team)}
                          </h2>
                        </div>
                      </Link>

                      <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
                        {oddsData.map((o) => (
                          <button
                            key={o.label}
                            onClick={() => toggleBet(o.label, o.val, match)}
                            className={`h-14 md:w-24 md:h-12 rounded-xl flex flex-col items-center justify-center transition-all border-2 ${
                              currentSelection?.selection === o.label 
                                ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] shadow-xl scale-[1.03]' 
                                : 'bg-[#1c2636]/60 border-white/5 text-white active:scale-95'
                            }`}
                          >
                            <span className="text-[8px] font-black opacity-30 uppercase">{o.label}</span>
                            <span className="text-[14px] font-black italic">
                              {o.val ? parseFloat(o.val).toFixed(2) : '—'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-32 text-center opacity-20 flex flex-col items-center">
                  <AlertCircle size={48} className="mb-4 text-[#10b981]" />
                  <p className="text-xs font-black italic uppercase tracking-[0.3em]">No Events Available</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* DESKTOP BETSLIP */}
        <aside className="hidden xl:flex w-[400px] border-l border-white/5 bg-[#111926] shrink-0 p-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      {/* MOBILE NAV PILL */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111926]/95 backdrop-blur-2xl border border-white/10 h-16 w-[92%] max-w-md rounded-2xl lg:hidden z-[100] flex items-center justify-around px-2 shadow-2xl">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-500">
          <List size={20} /> <span className="text-[8px] font-black uppercase italic">A-Z List</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <Activity size={20} /> <span className="text-[8px] font-black italic uppercase">Live</span>
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setIsMobileSlipOpen(true)} 
            className="bg-[#10b981] w-14 h-14 rounded-2xl -mt-10 flex items-center justify-center text-[#0b0f1a] shadow-xl border-4 border-[#0b0f1a] active:scale-90 transition-all"
          >
            <Trophy size={24} />
          </button>
          {slipItems.length > 0 && (
            <div className="absolute -top-12 -right-1 bg-white text-black w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#10b981] animate-bounce">
              {slipItems.length}
            </div>
          )}
        </div>

        <button onClick={() => {setSelectedLeague(null); window.scrollTo({top:0, behavior:'smooth'})}} className="flex flex-col items-center gap-1 text-[#10b981]">
          <LayoutGrid size={20} /> <span className="text-[8px] font-black italic uppercase">Home</span>
        </button>
        <div className="w-9 h-9 rounded-xl bg-[#1c2636] flex items-center justify-center text-[10px] font-black border border-white/10 text-slate-400 italic">ME</div>
      </nav>

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
             <h3 className="font-black italic text-[#10b981] flex items-center gap-2 uppercase tracking-tighter text-xl"><Trophy size={22}/> BETSLIP</h3>
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
