import { useRouter } from 'next/router';
import { useBets } from '../context/BetContext'; 
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import Sidebar from '../components/Sidebar';
import MobileFooter from '../components/MobileFooter';
import { ChevronLeft, Shield, Lock, X, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MatchDetail({ match }) {
  const router = useRouter();
  const { slipItems, setSlipItems } = useBets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  const bgImageUrl = 'https://t3.ftcdn.net/jpg/06/07/07/80/360_F_607078002_yMGIjR7oCK8fvvR8qD8hZ5EsXK7V8M7I.jpg';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = () => {
    const startTime = match?.start_time;
    if (!startTime) return { isLocked: true, isStartingSoon: false };
    const matchDate = new Date(startTime);
    const timeDiff = matchDate.getTime() - currentTime.getTime();
    return { 
      isLocked: timeDiff <= 30000, 
      isStartingSoon: timeDiff > 30000 && timeDiff <= 300000 
    };
  };

  const { isLocked, isStartingSoon } = getMatchStatus();
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  const formatFixedTime = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (router.isFallback || !match) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center font-bold italic">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin" />
          Loading Match...
        </div>
      </div>
    );
  }

  const toggleBet = (marketName, selectionLabel, value, uniqueId) => {
    if (isLocked) return;
    setSlipItems(prev => {
      if (prev.find(item => item.id === uniqueId)) return prev.filter(item => item.id !== uniqueId);
      const otherMatches = prev.filter(item => item.matchId !== match.id);
      return [...otherMatches, {
        id: uniqueId,
        matchId: match.id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        startTime: match.start_time,
        marketName: marketName,
        selection: selectionLabel,
        odds: value
      }];
    });
  };

  const mainMarkets = [
    { label: '1', display: cleanName(match.home_team), val: match.home_odds },
    { label: 'X', display: 'Draw', val: match.draw_odds },
    { label: '2', display: cleanName(match.away_team), val: match.away_odds }
  ];

  return (
    <div className="h-screen bg-[#0b0f1a] text-white font-sans flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden lg:block w-64 border-r border-white/5 bg-[#111926] shrink-0 overflow-y-auto no-scrollbar">
          <Sidebar 
            onSelectLeague={(league) => router.push(`/?league=${league}`)} 
            onClearFilter={() => router.push('/')} 
          />
        </aside>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-0 lg:gap-8 p-0 lg:p-8">
            <main className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6 pb-32">
              <div className="flex items-center justify-between px-4 lg:px-0 pt-4 lg:pt-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => router.back()} className="p-2.5 bg-[#1c2636] border border-white/5 rounded-xl">
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h1 className="text-[10px] font-bold capitalize italic text-[#10b981] opacity-80">{match.league_name}</h1>
                    <p className="text-xs font-bold text-slate-500 capitalize">Match Center</p>
                  </div>
                </div>
                {isLocked && (
                  <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                    <Lock size={14} className="text-red-500" />
                    <span className="text-[10px] font-bold italic text-red-500">Locked</span>
                  </div>
                )}
              </div>

              <div 
                className={`relative overflow-hidden bg-[#111926] lg:rounded-3xl border-y lg:border border-white/5 min-h-[220px] flex items-center ${isLocked ? 'saturate-50' : ''}`}
                style={{
                  backgroundImage: `url('${bgImageUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f1a]/90 via-[#0b0f1a]/40 to-[#0b0f1a]/90 z-0" />
                <div className="w-full flex justify-around items-center px-4 relative z-10">
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-[#0b0f1a]/60 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 mb-3 shadow-2xl">
                      <Shield size={24} className="text-[#10b981]" />
                    </div>
                    <h2 className="text-sm md:text-2xl font-black italic tracking-tighter leading-none drop-shadow-lg">{cleanName(match.home_team)}</h2>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-orange-500 text-3xl font-black italic tracking-tighter drop-shadow-md">VS</span>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold italic border backdrop-blur-sm ${isStartingSoon ? 'bg-orange-500 border-orange-400 text-white animate-pulse' : 'bg-[#0b0f1a]/60 border-white/20 text-slate-200'}`}>
                      {formatFixedTime(match.start_time)}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-[#0b0f1a]/60 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 mb-3 shadow-2xl">
                      <Shield size={24} className="text-[#10b981]" />
                    </div>
                    <h2 className="text-sm md:text-2xl font-black italic tracking-tighter leading-none text-white drop-shadow-lg">{cleanName(match.away_team)}</h2>
                  </div>
                </div>
              </div>

              <div className={`px-4 lg:px-0 space-y-8 ${isLocked ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                <section>
                  <h3 className="text-[10px] font-bold italic text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">Match Winner</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {mainMarkets.map((odd, idx) => {
                      const uniqueId = `${match.id}-1x2-${idx}`;
                      const isSelected = slipItems.find(item => item.id === uniqueId);
                      return (
                        <button 
                          key={idx}
                          disabled={isLocked}
                          onClick={() => toggleBet('Match Winner', odd.display, odd.val, uniqueId)}
                          className={`h-11 px-3 rounded-full flex items-center justify-between transition-all border ${
                            isSelected 
                            ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/20' 
                            : 'bg-[#1c2636]/60 border-white/5 text-slate-300 active:scale-95'
                          }`}
                        >
                          <span className="text-[10px] font-bold opacity-60 lowercase">{odd.label}</span>
                          <span className="text-xs font-black italic">{odd.val?.toFixed(2) || '—'}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {match.deep_markets?.map((market, mIdx) => (
                  <section key={mIdx}>
                    <h3 className="text-[10px] font-bold italic text-slate-500 mb-3 px-1 capitalize tracking-wider">
                      {market.name?.toLowerCase()}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                      {market.odds?.map((odd, oIdx) => {
                        const uniqueId = `${match.id}-${market.name}-${odd.type}-${oIdx}`;
                        const isSelected = slipItems.find(item => item.id === uniqueId);
                        return (
                          <button 
                            key={oIdx}
                            disabled={isLocked}
                            onClick={() => toggleBet(market.name, odd.display, odd.value, uniqueId)}
                            className={`flex items-center justify-between h-10 px-3 rounded-full transition-all border ${
                              isSelected 
                              ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a]' 
                              : 'bg-[#1c2636]/40 border-white/5 text-slate-400 active:scale-95'
                            }`}
                          >
                            <span className="text-[9px] font-bold italic truncate pr-1 lowercase">{odd.display}</span>
                            <span className="text-[11px] font-black italic">{odd.value?.toFixed(2) || '—'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </main>

            <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
              <div className="sticky top-8 h-fit">
                <Betslip items={slipItems} setItems={setSlipItems} />
              </div>
            </aside>
          </div>
        </div>
      </div>

      <MobileFooter 
        itemCount={slipItems.length}
        onOpenSidebar={() => router.push('/')}
        onOpenSlip={() => setIsMobileSlipOpen(true)}
        onGoHome={() => router.push('/')}
      />

      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[130] bg-[#0b0f1a] lg:hidden flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-6 shrink-0">
             <h3 className="font-black italic text-[#10b981] flex items-center gap-2 text-xl"><Trophy size={22}/> Betslip</h3>
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

export async function getServerSideProps({ params }) {
  const { matchId } = params;

  const MARKET_NAMES = {
    2: "Handicap",
    8: "Double Chance",
    17: "Total Goals (Over/Under)",
    19: "Both Teams to Score"
  };

  const SELECTION_NAMES = {
    1: "Home", 2: "Away", 3: "Draw",
    4: "1X", 5: "12", 6: "X2",
    9: "Over", 10: "Under",
    7: "Home Handicap", 8: "Away Handicap",
    180: "Yes", 181: "No"
  };

  try {
    const { data, error } = await supabase
      .from('xmatch_flat')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (error || !data) return { notFound: true };

    const eventGroups = data.raw_json?.eventGroups || [];
    
    const normalizedMarkets = eventGroups
      .filter(group => MARKET_NAMES[group.groupId]) // Filter out "Full Time Result" (groupId 1)
      .map(group => {
        const flatOdds = [];
        const seenTypes = new Set(); // deduplicate selection types (fixes BTS extra market)
        
        if (Array.isArray(group.events)) {
          group.events.flat().forEach(outcome => {
            if (!seenTypes.has(outcome.type)) {
              seenTypes.add(outcome.type);
              const nameBase = SELECTION_NAMES[outcome.type] || `Type ${outcome.type}`;
              const param = outcome.eventParams?.params?.[0] || ""; 
              
              flatOdds.push({
                display: `${nameBase} ${param}`.trim(),
                value: parseFloat(outcome.cfView || outcome.cf),
                type: outcome.type
              });
            }
          });
        }

        return {
          name: MARKET_NAMES[group.groupId],
          odds: flatOdds
        };
      }).filter(m => m.odds.length > 0);

    return {
      props: {
        match: JSON.parse(JSON.stringify({ 
          ...data, 
          id: data.match_id, 
          start_time: data.start_time,
          deep_markets: normalizedMarkets 
        }))
      }
    };
  } catch (err) {
    console.error("Mapping Error:", err);
    return { notFound: true };
  }
}
