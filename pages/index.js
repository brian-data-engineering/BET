import { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Search, Activity, ChevronRight, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Redis } from '@upstash/redis';

export default function Home({ initialMatches = [], initialLiveMatches = [] }) {
  const [activeTab, setActiveTab] = useState('highlights'); // Matches screenshot tabs
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [matches, setMatches] = useState(initialMatches);
  const [liveMatches, setLiveMatches] = useState(initialLiveMatches);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 

  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  // Toggle Bet Logic standardized for Row Layout
  const toggleBet = (selection, value, match, isLive = false) => {
    const matchId = isLive ? match.id : match.match_id;
    const betId = `${matchId}-${selection}`;
    
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }
      const otherMatches = prev.filter(item => item.matchId !== matchId);
      return [...otherMatches, {
        id: betId,
        matchId: matchId,
        matchName: isLive ? `${match.home} vs ${match.away}` : `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: selection,
        odds: value
      }];
    });
  };

  const displayMatches = useMemo(() => {
    let base = activeTab === 'live' ? liveMatches : matches;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return base.filter(m => 
        (m.home_team || m.home)?.toLowerCase().includes(q) || 
        (m.away_team || m.away)?.toLowerCase().includes(q)
      );
    }
    return base;
  }, [matches, liveMatches, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans">
      <Navbar onSearch={setSearchQuery} />
      
      {/* Banner Section (Image 4) */}
      <div className="w-full bg-[#004d3d] overflow-hidden hidden md:block">
        <div className="max-w-[1440px] mx-auto h-[180px] relative">
            <img src="/banner_placeholder.png" alt="Promo" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#004d3d] to-transparent flex items-center px-12">
                <div className="max-w-md">
                    <h2 className="text-3xl font-black italic uppercase leading-none text-white">Get <span className="text-[#f59e0b]">5% Cashback</span></h2>
                    <p className="text-sm font-bold text-white/80 mt-2 italic">on your Weekly Losses</p>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-0">
        
        {/* Left Sidebar */}
        <aside className="hidden lg:col-span-2 lg:block border-r border-white/5">
          <Sidebar onSelectLeague={setSelectedLeague} onClearFilter={() => setSelectedLeague(null)} />
        </aside>

        {/* Main Feed */}
        <main className="col-span-12 lg:col-span-7 bg-[#111926] min-h-screen">
          
          {/* Sub-Tabs (Image 1 top) */}
          <div className="bg-[#111926] border-b border-white/5 flex items-center px-4 overflow-x-auto no-scrollbar">
            {['Highlights', 'Top Leagues', 'Upcoming', 'Countries'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`py-4 px-4 text-xs font-black uppercase tracking-tight transition-all relative whitespace-nowrap ${
                  activeTab === tab.toLowerCase() ? 'text-white border-b-2 border-[#10b981]' : 'text-slate-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Market Selectors (Image 1) */}
          <div className="p-3 flex gap-2 overflow-x-auto no-scrollbar bg-[#0b0f1a]/50">
            {['1x2/Winner', 'Double Chance', 'Both Teams to Score', 'UN/OV 2.5'].map((m) => (
              <button key={m} className={`px-4 py-1.5 rounded-full text-[10px] font-bold border transition-all whitespace-nowrap ${
                m === '1x2/Winner' ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]' : 'bg-[#1e293b] border-white/5 text-slate-400'
              }`}>
                {m}
              </button>
            ))}
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-black text-slate-500 uppercase italic">
            <div className="col-span-7">Teams</div>
            <div className="col-span-5 grid grid-cols-3 text-center">
              <span>1</span><span>X</span><span>2</span>
            </div>
          </div>

          {/* Match Rows (Image 1 style) */}
          <div className="divide-y divide-white/5">
            {displayMatches.map((match) => {
              const mId = match.id || match.match_id;
              const currentSelection = slipItems.find(item => item.matchId === mId);
              
              return (
                <div key={mId} className="grid grid-cols-12 bg-[#111926] hover:bg-[#161f2e] p-3 items-center transition-colors">
                  {/* Left: Info */}
                  <div className="col-span-7 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase truncate">
                        ⚽ {match.competition_name || "Premier League"}
                      </span>
                      <span className="text-[9px] text-[#f59e0b] font-black italic">
                        Starts {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-black text-slate-200 uppercase truncate">{cleanName(match.home_team || match.home)}</span>
                      <span className="text-sm font-black text-slate-200 uppercase truncate">{cleanName(match.away_team || match.away)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-[#10b981]">
                       <span className="flex items-center gap-1 cursor-pointer hover:underline italic">
                          <BarChart2 size={12} /> Stats
                       </span>
                       <span className="text-slate-600">|</span>
                       <span className="cursor-pointer hover:underline italic">+ 93 Markets</span>
                    </div>
                  </div>

                  {/* Right: Odds Buttons */}
                  <div className="col-span-5 grid grid-cols-3 gap-2 h-12">
                    {[
                        { label: '1', val: match.odds?.[0]?.odd_value || 1.00 },
                        { label: 'X', val: match.odds?.[1]?.odd_value || 1.00 },
                        { label: '2', val: match.odds?.[2]?.odd_value || 1.00 }
                    ].map((odd) => (
                      <button
                        key={odd.label}
                        onClick={() => toggleBet(odd.label, odd.val, match)}
                        className={`rounded-md flex flex-col items-center justify-center transition-all ${
                          currentSelection?.selection === odd.label
                            ? 'bg-[#10b981] text-white shadow-lg'
                            : 'bg-[#1c2636] text-slate-300 hover:bg-[#253247]'
                        }`}
                      >
                        <span className="text-xs font-black">{odd.val.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Right Sidebar: Betslip & Contacts (Image 1 Right) */}
        <aside className="hidden lg:col-span-3 lg:block p-4 space-y-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
          
          {/* Shared Code Section */}
          <div className="bg-[#1c2636] rounded-xl p-4 border border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Do you have a shared betslip code?</p>
              <input type="text" placeholder="Enter Code Here" className="w-full bg-[#0b0f1a] border border-white/10 rounded-lg p-3 text-xs text-white mb-2" />
              <button className="w-full bg-[#334155] py-2.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-600">Load Betslip</button>
          </div>

          {/* Contacts Section */}
          <div className="bg-[#1c2636] rounded-xl p-4 border border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Our Contacts</p>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-[#0b0f1a] flex items-center justify-center">📧</div>
                  <span>info@bonusbet.co.ke</span>
              </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
