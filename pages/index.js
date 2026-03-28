import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Clock, Trophy, List, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Mobile UI States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const getMatchDate = (dateString) => {
    if (!dateString) return null;
    try {
      const localString = dateString.replace('Z', '').replace(/\+\d{2}(:?\d{2})?/, '').replace(' ', 'T');
      const d = new Date(localString);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  };

  const isMatchStarted = (commenceTime) => {
    const matchDate = getMatchDate(commenceTime);
    return matchDate ? currentTime >= matchDate : false;
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
    if (isMatchStarted(match.commence_time)) return;
    const matchId = match.id; 
    const betId = `${matchId}-${selection}`;
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) return prev.filter(item => item.id !== betId);
      const otherMatches = prev.filter(item => item.matchId !== matchId);
      return [...otherMatches, {
        id: betId,
        matchId: matchId,
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
      if (isMatchStarted(m.commence_time)) return false;
      const league = (m.league_name || '').toLowerCase();
      return !/(ebasketball|esoccer|srl|electronic|cyber)/i.test(league);
    });

    // AUTO-SWITCH LOGIC
    if (selectedLeague) {
        // If we picked a league, find its sport first
        const sampleMatch = initialMatches.find(m => m.league_name === selectedLeague || m.display_league === selectedLeague);
        if (sampleMatch && sampleMatch.sport_key !== activeTab) {
            setActiveTab(sampleMatch.sport_key);
        }
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
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans pb-20 lg:pb-0">
      <Navbar onSearch={setSearchQuery} />

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 lg:hidden">
            <div className="w-[80%] h-full bg-[#111926] relative">
                <button onClick={() => setIsMobileSidebarOpen(false)} className="absolute top-4 right-[-40px] text-white"><X /></button>
                <Sidebar 
                    onSelectLeague={(league, sport) => {
                        if (sport) setActiveTab(sport);
                        setSelectedLeague(league);
                        setIsMobileSidebarOpen(false);
                    }} 
                    onClearFilter={() => setSelectedLeague(null)} 
                />
            </div>
        </div>
      )}

      {/* Mobile Slip Overlay */}
      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[60] bg-[#0b0f1a] lg:hidden p-4 overflow-y-auto">
            <button onClick={() => setIsMobileSlipOpen(false)} className="mb-4 flex items-center gap-2 text-[#10b981] font-bold"><X size={18}/> Close Slip</button>
            <Betslip items={slipItems} setItems={setSlipItems} />
        </div>
      )}

      <div className="max-w-[1440px] mx-auto grid grid-cols-12">
        <aside className="hidden lg:col-span-2 lg:block border-r border-white/5">
          <Sidebar onSelectLeague={(l, s) => { if(s) setActiveTab(s); setSelectedLeague(l); }} onClearFilter={() => setSelectedLeague(null)} />
        </aside>

        <main className="col-span-12 lg:col-span-7 bg-[#111926] min-h-screen border-r border-white/5">
          {/* Sport Tabs */}
          <div className="bg-[#111926] border-b border-white/5 flex items-center px-2 overflow-x-auto no-scrollbar sticky top-0 z-20">
            {sportTabs.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedLeague(null); }} className={`py-4 px-5 text-[11px] font-black uppercase tracking-tight transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-white'}`}>
                <span className={activeTab === tab.id ? 'grayscale-0' : 'grayscale'}>{tab.icon}</span>
                {tab.name}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]" />}
              </button>
            ))}
          </div>

          {/* Match List rendering logic remains same as your provided code... */}
          <div className="divide-y divide-white/5">
            {displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);
                return (
                    <div key={match.id} className="grid grid-cols-12 p-3 items-center hover:bg-[#161f2e] transition-colors border-b border-white/5">
                        <div className="col-span-7 pr-4">
                            <Link href={`/${match.id}`}>
                                <div className="text-[10px] text-[#10b981] font-black uppercase italic mb-1">{match.display_league || match.league_name}</div>
                                <div className="text-sm font-black text-slate-200 uppercase truncate">{cleanName(match.home_team)}</div>
                                <div className="text-sm font-black text-slate-200 uppercase truncate">{cleanName(match.away_team)}</div>
                            </Link>
                        </div>
                        <div className="col-span-5 grid grid-cols-3 gap-1.5 h-10">
                            {[match.home_odds, match.draw_odds, match.away_odds].map((val, idx) => {
                                const labels = ['1', 'X', '2'];
                                return (
                                    <button key={idx} onClick={() => toggleBet(labels[idx], val, match)} className={`rounded text-[10px] font-black border ${currentSelection?.selection === labels[idx] ? 'bg-[#10b981] text-white border-[#10b981]' : 'bg-[#1c2636] border-white/5 text-slate-300'}`}>
                                        {val ? parseFloat(val).toFixed(2) : '—'}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block p-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0b0f1a] border-t border-white/10 h-16 flex lg:hidden z-50 items-center justify-around px-4">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-400">
          <List size={20} />
          <span className="text-[9px] uppercase font-bold">Leagues</span>
        </button>
        
        {/* Floating Slip Button */}
        <button onClick={() => setIsMobileSlipOpen(true)} className="relative bg-[#10b981] w-14 h-14 rounded-full -mt-10 border-4 border-[#0b0f1a] flex items-center justify-center text-white shadow-xl shadow-[#10b981]/20">
            <Trophy size={24} />
            {slipItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-[#10b981] w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center">
                    {slipItems.length}
                </span>
            )}
        </button>

        <button onClick={() => {setSelectedLeague(null); setSearchQuery(''); window.scrollTo(0,0);}} className="flex flex-col items-center gap-1 text-slate-400">
          <Clock size={20} />
          <span className="text-[9px] uppercase font-bold">Today</span>
        </button>
      </div>
    </div>
  );
}
