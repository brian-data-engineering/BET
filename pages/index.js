import { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import { useBets } from '../context/BetContext'; 
import { Clock, BarChart2, Zap } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('highlights');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 

  // Clean names to prevent formatting issues in the UI
  const cleanName = (name) => name ? name.replace(/['"]+/g, '').trim() : 'TBD';

  const toggleBet = (selection, value, match) => {
    const matchId = match.id; 
    const betId = `${matchId}-${selection}`;
    
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }
      const otherMatches = prev.filter(item => item.matchId !== matchId);
      return [...otherMatches, {
        id: betId,
        matchId: matchId,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: selection,
        odds: value
      }];
    });
  };

  // --- REWRITTEN FILTERING LOGIC ---
  const displayMatches = useMemo(() => {
    // 1. Strict removal of Virtuals/eSports/SRL leagues
    let filtered = initialMatches.filter(m => {
      const league = (m.league_name || '').toLowerCase();
      const sport = (m.sport_key || '').toLowerCase();
      
      const isVirtual = 
        league.includes('ebasketball') || 
        league.includes('esoccer') || 
        league.includes('srl') || 
        league.includes('electronic') ||
        league.includes('cyber') ||
        sport.startsWith('esport');

      return !isVirtual;
    });

    // 2. Tab filtering (Highlights vs Upcoming)
    if (activeTab === 'highlights') {
      // Logic: Only show matches with odds > 1.2 or specific 'High Volume' leagues
      filtered = filtered.filter(m => (m.home_odds > 1.2 || m.away_odds > 1.2));
    }

    // 3. League selection from Sidebar
    if (selectedLeague) {
      filtered = filtered.filter(m => m.league_name === selectedLeague);
    }

    // 4. Search Query logic
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(q) || 
        m.away_team?.toLowerCase().includes(q) ||
        m.display_league?.toLowerCase().includes(q) ||
        m.league_name?.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab]);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans">
      <Navbar onSearch={setSearchQuery} />
      
      {/* Promo Banner */}
      <div className="w-full bg-[#004d3d] overflow-hidden hidden md:block border-b border-white/5">
        <div className="max-w-[1440px] mx-auto h-[160px] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#004d3d] via-[#004d3d]/80 to-transparent flex items-center px-12 z-10">
                <div className="max-w-md">
                    <h2 className="text-4xl font-black italic uppercase leading-none text-white tracking-tighter">
                        Get <span className="text-[#f59e0b]">5% Cashback</span>
                    </h2>
                    <p className="text-sm font-bold text-white/80 mt-2 italic uppercase tracking-wider">On all weekly losses</p>
                </div>
            </div>
            <img src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1000" alt="Promo" className="w-full h-full object-cover opacity-30 object-center" />
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-0">
        <aside className="hidden lg:col-span-2 lg:block border-r border-white/5">
          <Sidebar 
            onSelectLeague={setSelectedLeague} 
            onClearFilter={() => setSelectedLeague(null)} 
          />
        </aside>

        <main className="col-span-12 lg:col-span-7 bg-[#111926] min-h-screen border-r border-white/5">
          <div className="bg-[#111926] border-b border-white/5 flex items-center px-4 overflow-x-auto no-scrollbar sticky top-0 z-20">
            {['Highlights', 'Upcoming', 'Leagues'].map((tab) => (
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

          <div className="grid grid-cols-12 px-4 py-3 text-[10px] font-black text-slate-500 uppercase italic bg-[#0b0f1a]/30">
            <div className="col-span-7 flex items-center gap-2">
              Event Details 
              {selectedLeague && (
                <span className="bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded border border-[#10b981]/20 ml-2">
                  • {selectedLeague}
                </span>
              )}
            </div>
            <div className="col-span-5 grid grid-cols-3 text-center">
              <span>1</span><span>X</span><span>2</span>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => {
                const currentSelection = slipItems.find(item => item.matchId === match.id);
                
                return (
                  <div key={match.id} className="grid grid-cols-12 bg-[#111926] hover:bg-[#161f2e] p-3 items-center transition-colors">
                    <div className="col-span-7 pr-4 group">
                      <Link href={`/${match.id}`}>
                        <div className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-[#10b981] font-black uppercase italic tracking-tighter">
                              {match.display_league || match.league_name}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1 italic">
                              <Clock size={10} /> {new Date(match.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-200 uppercase truncate group-hover:text-[#10b981] transition-colors">{cleanName(match.home_team)}</span>
                            <span className="text-sm font-black text-slate-200 uppercase truncate group-hover:text-[#10b981] transition-colors">{cleanName(match.away_team)}</span>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-slate-500">
                         <span className="flex items-center gap-1 cursor-pointer hover:text-[#10b981] italic">
                            <BarChart2 size={12} /> Stats
                         </span>
                         <span className="text-slate-800">|</span>
                         <span className="cursor-pointer hover:text-white italic">+ 45 Markets</span>
                      </div>
                    </div>

                    <div className="col-span-5 grid grid-cols-3 gap-1.5 h-11">
                      {[
                          { label: '1', val: match.home_odds },
                          { label: 'X', val: match.draw_odds },
                          { label: '2', val: match.away_odds }
                      ].map((odd) => (
                        <button
                          key={odd.label}
                          onClick={() => toggleBet(odd.label, odd.val, match)}
                          className={`rounded-md flex items-center justify-center font-black text-xs italic transition-all border ${
                            currentSelection?.selection === odd.label
                              ? 'bg-[#10b981] border-[#10b981] text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                              : 'bg-[#1c2636] border-white/5 text-slate-300 hover:bg-[#253247]'
                          }`}
                        >
                          {odd.val ? parseFloat(odd.val).toFixed(2) : '—'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center opacity-20 flex flex-col items-center">
                <Zap size={48} className="mb-4" />
                <p className="font-black uppercase italic tracking-widest text-sm">No matches found for this selection</p>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block p-4 space-y-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
          <div className="bg-[#1c2636] rounded-2xl p-4 border border-white/5 shadow-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3 italic tracking-widest">Load Booking Code</p>
              <input 
                type="text" 
                placeholder="E.g. B7X9LP" 
                className="w-full bg-[#0b0f1a] border border-white/10 rounded-xl p-3 text-xs text-white mb-2 focus:border-[#10b981] outline-none transition-all font-bold uppercase" 
              />
              <button className="w-full bg-[#10b981]/10 text-[#10b981] py-3 rounded-xl text-[10px] font-black uppercase italic hover:bg-[#10b981] hover:text-white transition-all border border-[#10b981]/20">
                Retrieve Bet
              </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// --- SERVER SIDE FETCH WITH SPORT WHITELIST ---
export async function getServerSideProps() {
  try {
    // Whitelist only the sports you want to appear
    const allowedSports = ['soccer', 'basketball', 'hockey', 'tennis', 'tabletennis'];

    const { data } = await supabase
      .from('api_events')
      .select('*')
      .in('sport_key', allowedSports) // This blocks Aussie Rules, Boxing, Cricket, etc.
      .order('commence_time', { ascending: true })
      .limit(1000); 

    return { 
      props: { 
        initialMatches: JSON.parse(JSON.stringify(data || [])) 
      } 
    };
  } catch (err) {
    console.error("Fetch error:", err);
    return { props: { initialMatches: [] } };
  }
}
