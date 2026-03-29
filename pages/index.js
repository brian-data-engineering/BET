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
    if (isLocked) return;
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
    if (selectedLeague) filtered = filtered.filter(m => m.league_name === selectedLeague || m.display_league === selectedLeague);
    else filtered = filtered.filter(m => m.sport_key === activeTab);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => m.home_team?.toLowerCase().includes(q) || m.away_team?.toLowerCase().includes(q));
    }
    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab, currentTime]);

  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white font-sans flex flex-col overflow-hidden">
      <Navbar onSearch={setSearchQuery} />

      <div className="flex w-full flex-1 h-[calc(100vh-64px)] overflow-hidden">
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111926] flex-col overflow-y-auto shrink-0">
          <Sidebar onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} onClearFilter={() => setSelectedLeague(null)} />
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#0b0f1a] no-scrollbar">
          {/* SPORT TABS */}
          <div className="sticky top-0 z-20 bg-[#0b0f1a]/95 backdrop-blur-md border-b border-white/5 flex items-center px-4 py-3 overflow-x-auto no-scrollbar gap-2">
            {sportTabs.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }} 
                className={`py-2 px-4 rounded-full text-[11px] font-black uppercase italic border whitespace-nowrap transition-all ${
                  activeTab === tab.id ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a]' : 'bg-[#1c2636]/50 border-white/5 text-slate-400'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </div>

          <div className="p-3 sm:p-6 pb-32 max-w-5xl mx-auto space-y-4">
            {displayMatches.map((match) => {
              const currentSelection = slipItems.find(item => item.matchId === match.id);
              const odds = [
                { label: 'HOME', code: '1', val: match.home_odds },
                { label: 'DRAW', code: 'X', val: match.draw_odds },
                { label: 'AWAY', code: '2', val: match.away_odds }
              ];

              return (
                <div key={match.id} className="bg-[#111926]/40 border-b border-white/5 pb-4">
                  {/* League Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-[#10b981]/10 text-[#10b981] text-[10px] font-bold px-2 py-0.5 rounded italic">
                      {match.display_league || match.league_name}
                    </span>
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold">
                      <Clock size={10} /> {formatFixedTime(match.commence_time)}
                    </div>
                  </div>

                  {/* DESKTOP VIEW (Image 3 & 7) */}
                  <div className="hidden md:flex items-center justify-between">
                    <Link href={`/${match.id}`} className="flex-1">
                      <div className="text-sm font-black uppercase italic leading-tight">
                        <p>{cleanName(match.home_team)}</p>
                        <p>{cleanName(match.away_team)}</p>
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      {odds.map((o) => (
                        <button
                          key={o.code}
                          onClick={() => toggleBet(o.code, o.val, match)}
                          className={`w-24 h-10 rounded-2xl flex items-center justify-center font-black italic text-sm transition-all border-2 ${
                            currentSelection?.selection === o.code ? 'bg-[#10b981] border-[#10b981] text-black shadow-lg' : 'bg-[#1c2636] border-white/5'
                          }`}
                        >
                          {o.val ? parseFloat(o.val).toFixed(2) : '—'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MOBILE VIEW (Image 1, 2, 5) */}
                  <div className="md:hidden flex flex-col gap-3">
                    <Link href={`/${match.id}`}>
                      <h2 className="text-lg font-black uppercase italic leading-tight tracking-tighter">
                        {cleanName(match.home_team)} <br /> {cleanName(match.away_team)}
                      </h2>
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      {odds.map((o) => (
                        <button
                          key={o.code}
                          onClick={() => toggleBet(o.code, o.val, match)}
                          className={`h-20 rounded-xl flex flex-col items-center justify-center transition-all border-2 ${
                            currentSelection?.selection === o.code ? 'bg-[#10b981] border-[#10b981] text-black shadow-xl' : 'bg-[#1c2636]/60 border-white/5'
                          }`}
                        >
                          <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">{o.label}</span>
                          <span className="text-xl font-black italic">{o.val ? parseFloat(o.val).toFixed(2) : '—'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <aside className="hidden xl:flex w-96 border-l border-white/5 bg-[#111926] shrink-0 p-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      {/* MOBILE NAV (Image 1 bottom) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111926]/90 backdrop-blur-2xl border border-white/10 h-16 w-[92%] max-w-md rounded-2xl lg:hidden z-[100] flex items-center justify-around px-2">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-500">
          <List size={20} /> <span className="text-[8px] font-black uppercase italic">A-Z SPORTS</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#10b981]">
          <LayoutGrid size={20} /> <span className="text-[8px] font-black uppercase italic">HOME</span>
        </button>
        <div className="relative">
          <button onClick={() => setIsMobileSlipOpen(true)} className="bg-[#10b981] w-14 h-14 rounded-full -mt-10 flex items-center justify-center text-[#0b0f1a] shadow-xl border-4 border-[#0b0f1a]">
            <Trophy size={24} />
          </button>
          {slipItems.length > 0 && <div className="absolute -top-12 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center">{slipItems.length}</div>}
        </div>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <Clock size={20} /> <span className="text-[8px] font-black uppercase italic">IN-PLAY</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black border border-white/10 text-slate-400">ME</div>
      </nav>

      {/* MOBILE SLIP OVERLAY */}
      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[130] bg-[#0b0f1a] lg:hidden flex flex-col p-4">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-black italic text-[#10b981] uppercase tracking-tighter">BETSLIP</h3>
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
    const { data } = await supabase.from('api_events').select('*').gt('commence_time', new Date().toISOString()).order('commence_time', { ascending: true }).limit(1000); 
    return { props: { initialMatches: data || [] } };
  } catch (err) { return { props: { initialMatches: [] } }; }
}
