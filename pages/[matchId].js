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
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
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
    if (isLocked || !value) return;
    setSlipItems(prev => {
      if (prev.find(item => item.id === uniqueId)) return prev.filter(item => item.id !== uniqueId);
      const otherMatches = prev.filter(item => item.matchId !== match.id);
      return [...otherMatches, {
        id: uniqueId,
        matchId: match.id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        startTime: match.start_time,
        sport_key: match.sport_key,
        display_league: match.league_name,
        country: match.league_name?.split('.')?.[0]?.trim() || 'International',
        marketName,
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
          <Sidebar onSelectLeague={() => router.push('/')} onClearFilter={() => router.push('/')} />
        </aside>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-0 lg:gap-8 p-0 lg:p-8">
            <main className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6 pb-32">

              {/* Header */}
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

              {/* Hero */}
              <div
                className={`relative overflow-hidden bg-[#111926] lg:rounded-3xl border-y lg:border border-white/5 min-h-[220px] flex items-center ${isLocked ? 'saturate-50' : ''}`}
                style={{ backgroundImage: `url('${bgImageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
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

              {/* Markets */}
              <div className={`px-4 lg:px-0 space-y-8 ${isLocked ? 'opacity-60 grayscale-[0.3]' : ''}`}>

                {/* 1X2 always first */}
                <section>
                  <h3 className="text-[10px] font-bold italic text-slate-500 mb-4 uppercase tracking-widest">Match Winner</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {mainMarkets.map((odd, idx) => {
                      const uniqueId = `${match.id}-1x2-${idx}`;
                      const isSelected = slipItems.find(item => item.id === uniqueId);
                      return (
                        <button
                          key={idx}
                          disabled={isLocked || !odd.val}
                          onClick={() => toggleBet('Match Winner', odd.display, odd.val, uniqueId)}
                          className={`h-11 px-3 rounded-full flex items-center justify-between transition-all border ${
                            isSelected
                              ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/20'
                              : 'bg-[#1c2636]/60 border-white/5 text-slate-300 active:scale-95'
                          } ${!odd.val ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <span className="text-[10px] font-bold opacity-60 lowercase">{odd.label}</span>
                          <span className="text-xs font-black italic">{odd.val ? Number(odd.val).toFixed(2) : '—'}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Deep markets */}
                {match.deep_markets?.map((market, mIdx) => (
                  <section key={mIdx}>
                    <h3 className="text-[10px] font-bold italic text-slate-500 mb-3 px-1 uppercase tracking-widest">
                      {market.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                      {market.odds?.map((odd, oIdx) => {
                        const uniqueId = `${match.id}-${mIdx}-${oIdx}`;
                        const isSelected = slipItems.find(item => item.id === uniqueId);
                        return (
                          <button
                            key={oIdx}
                            disabled={isLocked || !odd.value}
                            onClick={() => toggleBet(market.name, odd.display, odd.value, uniqueId)}
                            className={`flex items-center justify-between h-10 px-3 rounded-full transition-all border ${
                              isSelected
                                ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a]'
                                : 'bg-[#1c2636]/40 border-white/5 text-slate-400 active:scale-95'
                            }`}
                          >
                            <span className="text-[9px] font-bold italic truncate pr-1 lowercase">{odd.display}</span>
                            <span className="text-[11px] font-black italic">{odd.value ? Number(odd.value).toFixed(2) : '—'}</span>
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
            <h3 className="font-black italic text-[#10b981] flex items-center gap-2 text-xl"><Trophy size={22} /> Betslip</h3>
            <button onClick={() => setIsMobileSlipOpen(false)} className="bg-white/5 p-2 rounded-xl text-slate-400"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
            <Betslip items={slipItems} setItems={setSlipItems} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Server-side helpers ──────────────────────────────────────────────

// Only .5 lines for total markets
const HALF_LINE_GROUPS = new Set([17, 15, 62]);
const isHalfLine = (p) => {
  if (p === null || p === undefined) return true;
  const n = parseFloat(p);
  return !isNaN(n) && Math.abs(n % 1) === 0.5;
};

// Market names — exactly from notes
const MARKET_NAMES = {
  2:   'European Handicap',
  8:   'Double Chance',
  15:  'Home Team Total Goals',
  17:  'Total Goals (O/U)',
  19:  'Both Teams To Score',
  62:  'Away Team Total Goals',
  136: 'Correct Score',
  275: 'Victory Margin',
};

// Type labels — exactly from notes
const TYPE_LABELS = {
  // Double Chance (G=8)
  4: '1X', 5: '12', 6: '2X',

  // European Handicap (G=2)
  7: 'Home', 8: 'Away',

  // Total Goals O/U (G=17)
  9: 'Over', 10: 'Under',

  // Home Team Total Goals (G=15)
  11: 'Over', 12: 'Under',

  // Away Team Total Goals (G=62)
  13: 'Over', 14: 'Under',

  // Both Teams To Score (G=19)
  180:   'Yes',
  181:   'No',
  11273: 'Both Score 2+ Yes',
  11274: 'Both Score 2+ No',

  // Victory Margin (G=275)
  4850: 'Yes',   // Any team wins by P goals
  4851: 'No',    // Any team wins by P goals
  4918: '3+ Yes',
  4919: '3+ No',

  // Correct Score (G=136)
  731:  'SCORE',
  3786: 'Other scores',
};

/**
 * Decode 1xbet correct score P value encoding from notes:
 * Integer = home goals, decimal .00X = away goals
 * P=null   → "0-0"
 * P=2.001  → "2-1"
 * P=0.003  → "0-3"
 * P=1.001  → "1-1"
 */
function decodeCorrectScore(p) {
  if (p === null || p === undefined) return '0-0';
  const home = Math.floor(p);
  const away = Math.round((p - home) * 1000);
  return `${home}-${away}`;
}

/**
 * Build Victory Margin display label from T and P:
 * T=4850 + P=1 → "Win by 1"
 * T=4850 + P=2 → "Win by 2"
 * T=4918 + P=3 → "Win by 3+"
 * T=4851 → "Not win by P"
 */
function buildVictoryMarginDisplay(T, P) {
  const margin = P !== null ? P : '?';
  if (T === 4850) return `Win by ${margin}`;
  if (T === 4851) return `Not win by ${margin}`;
  if (T === 4918) return `Win by ${margin}+`;
  if (T === 4919) return `Not win by ${margin}+`;
  return null;
}

function buildOdds(group) {
  const G = group.G;
  const isTotal = HALF_LINE_GROUPS.has(G);
  const isScore = G === 136;
  const isVictory = G === 275;
  const isBTTS = G === 19;
  const seenDisplays = new Set();
  const flatOdds = [];

  for (const outcomeList of (group.E || [])) {
    for (const e of outcomeList) {
      const T = e.T;
      const C = parseFloat(e.C);
      const P = e.P ?? null;

      if (!C || C <= 1.0) continue;

      // Only .5 lines for total markets
      if (isTotal && !isHalfLine(P)) continue;

      let display = '';

      if (isScore) {
        // Correct Score: decode P value per notes
        if (T === 3786) {
          display = 'Other scores';
        } else if (T === 731) {
          display = decodeCorrectScore(P);
        } else {
          continue;
        }
      } else if (isVictory) {
        // Victory Margin: build label from T + P
        const label = buildVictoryMarginDisplay(T, P);
        if (!label) continue;
        display = label;
      } else if (isBTTS) {
        // BTTS: T=180/181 simple Yes/No, T=11273/11274 with 2+ threshold
        if (TYPE_LABELS[T]) {
          display = TYPE_LABELS[T];
        } else {
          continue;
        }
      } else if (P !== null && TYPE_LABELS[T]) {
        // Markets with line: "Over 2.5", "Home -1"
        display = `${TYPE_LABELS[T]} ${P}`;
      } else if (TYPE_LABELS[T]) {
        // Simple markets: "1X", "12", "2X"
        display = TYPE_LABELS[T];
      } else {
        continue;
      }

      display = display.trim();
      if (seenDisplays.has(display)) continue;
      seenDisplays.add(display);

      flatOdds.push({ display, value: C, type: T });
    }
  }

  return flatOdds;
}

export async function getServerSideProps({ params }) {
  const { matchId } = params;

  try {
    const { data, error } = await supabase
      .from('xmatch_flat')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (error || !data) return { notFound: true };

    // Read compact format: raw_json.groups with G/GS/E structure
    const groups = data.raw_json?.groups || [];

    const normalizedMarkets = groups
      .filter(g => g.G !== 1) // skip 1X2 — handled by mainMarkets
      .map(g => {
        const marketName = MARKET_NAMES[g.G];
        if (!marketName) return null;

        const odds = buildOdds(g);
        if (odds.length === 0) return null;

        return { name: marketName, odds };
      })
      .filter(Boolean);

    return {
      props: {
        match: JSON.parse(JSON.stringify({
          ...data,
          id: data.match_id,
          deep_markets: normalizedMarkets,
        }))
      }
    };

  } catch (err) {
    console.error('Match detail error:', err);
    return { notFound: true };
  }
}
