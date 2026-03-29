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
      const sample = initialMatches.find(m => m.league_name === selectedLeague || m.display_league === selectedLeague);
      if (sample && sample.sport_key !== activeTab) setActiveTab(sample.sport_key);
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
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white font-sans flex flex-col">
      <Navbar onSearch={setSearchQuery} />

      {/* MOBILE SIDEBAR OVERLAY */}
      <div className={`fixed inset-0 z-[100] transition-transform duration-300 lg:hidden ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="w-[85%] h-full bg-[#111926] shadow-2xl relative overflow-y-auto">
          <button onClick={() => setIsMobileSidebarOpen(false)} className="absolute top-4 right-4 text-slate-400 p-2"><X size={24}/></button>
          <Sidebar 
            onSelectLeague={(league, sport) => {
              if (sport) setActiveTab(sport);
              setSelectedLeague(league);
              setIsMobileSidebarOpen(false);
            }} 
            onClearFilter={() => { setSelectedLeague(null); setIsMobileSidebarOpen(false); }} 
          />
        </div>
        <div className="flex-1 bg-black/60" onClick={() => setIsMobileSidebarOpen(false)} />
      </div>

      {/* MOBILE SLIP OVERLAY */}
      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[110] bg-[#0b0f1a] lg:hidden animate-in slide-in-from-bottom duration-300">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#111926]">
            <h3 className="font-black uppercase italic text-[#10b981] flex items-center gap-2"><Trophy size={18}/> Your Betslip</h3>
            <button onClick={() => setIsMobileSlipOpen(false)} className="bg-white/5 p-2 rounded-full"><X size={20}/></button>
          </div>
          <div className="p-4 h-[calc(100vh-80px)] overflow-y-auto">
            <Betslip items={slipItems} setItems={setSlipItems} />
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex w-full flex-1 overflow-x-auto h-[calc(100vh-64px)]">
        
        {/* LEFT ANCHOR: Sidebar */}
        <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-white/5 bg-[#111926] flex-col overflow-hidden">
          <Sidebar 
            onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} 
            onClearFilter={() => setSelectedLeague(null)} 
          />
        </aside>

        {/* CENTER COLUMN: Match List */}
        <main className="flex-1 min-w-[600px] overflow-y-auto custom-scrollbar bg-[#0b0f1a] flex flex-col">
          {/* Sticky Sport Tabs */}
          <div className="bg-[#111926] border-b border-white/5 flex items-center px-4 overflow-x-auto no-scrollbar sticky top-0 z-20">
            {sportTabs.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }} className={`py-4 px-6 text-[11px] font-black tracking-tight transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-white'}`}>
                <span>{tab.icon}</span> {tab.name}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]" />}
              </button>
            ))}
          </div>

          <div className="p-4 lg:p-6 w-full max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between px-4 py-3 text-[10px] font-black text-slate-500 italic bg-[#111926]/50 rounded-t-xl border border-white/5 border-b-0">
               <div>Event {selectedLeague && <span className="text-[#10b981] ml-2">/ {selectedLeague}</span>}</div>
               <div className="flex gap-2 w-[280px] text-center">
                 <span className="flex-1">HOME</span>
                 <span className="flex-1">DRAW</span>
                 <span className="flex-1">AWAY</span>
               </div>
            </div>

            <div className="bg-[#111926]/20 border border-white/5 divide-y divide-white/5 rounded-b-xl overflow-hidden">
              {displayMatches.length > 0 ? displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);
                const { secondsLeft } = getMatchStatus(match.commence_time);
                const closingSoon = secondsLeft < 300; 

                return (
                  <div key={match.id} className="flex flex-col md:flex-row p-4 items-center justify-between hover:bg-[#161f2e] transition-colors relative group">
                    {closingSoon && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />}
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <Link href={`/${match.id}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[10px] font-black italic px-2 py-0.5 rounded bg-white/5 ${closingSoon ? 'text-orange-500' : 'text-[#10b981]'}`}>
                            {match.display_league || match.league_name}
                          </span>
                          <span className={`text-[9px] font-bold flex items-center gap-1 italic ${closingSoon ? 'text-orange-400' : 'text-slate-500'}`}>
                            <Clock size={10} /> {formatFixedTime(match.commence_time)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-black text-white truncate tracking-tight uppercase italic">{cleanName(match.home_team)}</span>
                          <span className="text-sm font-black text-white truncate tracking-tight uppercase italic">{cleanName(match.away_team)}</span>
                        </div>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-[280px] mt-4 md:mt-0">
                      {[
                        {l:'1', lab:'HOME', v:match.home_odds}, 
                        {l:'X', lab:'DRAW', v:match.draw_odds}, 
                        {l:'2', lab:'AWAY', v:match.away_odds}
                      ].map((odd) => (
                        <button 
                          key={odd.l} 
                          onClick={() => toggleBet(odd.l, odd.v, match)} 
                          className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 border border-white/5 ${currentSelection?.selection === odd.l ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20 border-[#10b981]' : 'bg-[#0b0f1a] hover:bg-[#1c2636] text-slate-200'}`}
                        >
                          <span className={`text-[8px] font-black mb-0.5 opacity-50 ${currentSelection?.selection === odd.l ? 'text-white' : 'text-[#10b981]'}`}>{odd.lab}</span>
                          <span className="text-[13px] font-black italic tracking-tighter leading-none">{odd.v ? parseFloat(odd.v).toFixed(2) : '—'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }) : (
                  <div className="py-32 text-center text-slate-600 text-[10px] font-black uppercase italic tracking-widest flex flex-col items-center gap-2">
                    <AlertCircle size={24} className="opacity-10 mb-2" />
                    No Active Markets Found
                  </div>
              )}
            </div>
          </div>
        </main>

        {/* RIGHT ANCHOR: Betslip Sidebar (FIXED ZOOM ISSUE) */}
        <aside className="hidden xl:block w-80 flex-shrink-0 bg-[#0b0f1a] p-4 relative border-l border-white/5">
          <div className="sticky top-6 min-w-[320px]">
            <Betslip items={slipItems} setItems={setSlipItems} />
          </div>
        </aside>

      </div>

      {/* MOBILE NAV BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0b0f1a] border-t border-white/10 h-16 flex lg:hidden z-[90] items-center justify-around px-2">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-400 active:text-[#10b981]">
          <List size={20} />
          <span className="text-[8px] uppercase font-black italic">A-Z Sports</span>
        </button>
        <button onClick={() => {setSelectedLeague(null); window.scrollTo({top: 0, behavior: 'smooth'});}} className="flex flex-col items-center gap-1 text-slate-400 active:text-[#10b981]">
          <LayoutGrid size={20} />
          <span className="text-[8px] uppercase font-black italic">Home</span>
        </button>
        <div className="relative">
            <button onClick={() => setIsMobileSlipOpen(true)} className="bg-[#10b981] w-14 h-14 rounded-full -mt-10 border-4 border-[#0b0f1a] flex items-center justify-center text-white shadow-xl shadow-[#10b981]/20 transform active:scale-95 transition-transform">
                <Trophy size={24} />
            </button>
            {slipItems.length > 0 && (
                <div className="absolute -top-11 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#0b0f1a]">
                    {slipItems.length}
                </div>
            )}
        </div>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <Clock size={20} />
          <span className="text-[8px] uppercase font-black italic">In-Play</span>
        </button>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400">
          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold">ME</div>
          <span className="text-[8px] uppercase font-black italic">Account</span>
        </Link>
      </div>
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
      .limit(500); 
    return { props: { initialMatches: data || [] } };
  } catch (err) { return { props: { initialMatches: [] } }; }
}
