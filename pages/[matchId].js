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
        league_id: match.league_id, // <--- ADD THIS LINE
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

  // Soccer has draw, tennis/table-tennis do not
  const hasDraw = !['tennis', 'table-tennis', 'basketball'].includes(match.sport_key);

  const mainMarkets = hasDraw
    ? [
        { label: '1', display: cleanName(match.home_team), val: match.home_odds },
        { label: 'X', display: 'Draw', val: match.draw_odds },
        { label: '2', display: cleanName(match.away_team), val: match.away_odds }
      ]
    : [
        { label: '1', display: cleanName(match.home_team), val: match.home_odds },
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

                {/* Main Winner market */}
                <section>
                  <h3 className="text-[10px] font-bold italic text-slate-500 mb-4 uppercase tracking-widest">Match Winner</h3>
                  <div className={`grid grid-cols-${hasDraw ? '3' : '2'} gap-2`}>
                    {mainMarkets.map((odd, idx) => {
                      const uniqueId = `${match.id}-main-${idx}`;
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

// ─── Server-side sport-aware decoder ─────────────────────────────────

// ── SOCCER ───────────────────────────────────────────────────────────
const SOCCER_MARKET_NAMES = {
  2:   'European Handicap',
  8:   'Double Chance',
  15:  'Home Team Total Goals',
  17:  'Total Goals (O/U)',
  19:  'Both Teams To Score',
  62:  'Away Team Total Goals',
  136: 'Correct Score',
  275: 'Victory Margin',
};

const SOCCER_TYPE_LABELS = {
  4: '1X', 5: '12', 6: '2X',          // Double Chance
  7: 'Home', 8: 'Away',                // Handicap
  9: 'Over', 10: 'Under',              // Totals
  11: 'Over', 12: 'Under',             // Home Total
  13: 'Over', 14: 'Under',             // Away Total
  180: 'Yes', 181: 'No',              // BTTS basic
  11273: 'Both Score 2+ Yes',
  11274: 'Both Score 2+ No',
  4850: 'Win by', 4851: 'Not win by',  // Victory Margin
  4918: 'Win by 3+', 4919: 'Not win by 3+',
  731: 'SCORE', 3786: 'Other scores',  // Correct Score
};

const SOCCER_HALF_LINE_GROUPS = new Set([17, 15, 62]);
const SOCCER_SKIP_G1 = true; // G=1 handled by mainMarkets

// ── BASKETBALL ───────────────────────────────────────────────────────
const BASKETBALL_MARKET_NAMES = {
  101:  'Team Wins',
  2766: '1X2 Regular Time',
  2768: 'Double Chance',
  17:   'Total Points (O/U)',
};

const BASKETBALL_TYPE_LABELS = {
  401: 'Home Win', 402: 'Away Win',       // Team Wins G=101
  3653: 'Home Win', 3654: 'Draw', 3655: 'Away Win', // 1X2 RT G=2766
  3656: '1X', 3657: '12', 3658: '2X',    // Double Chance G=2768
  9: 'Over', 10: 'Under',                // Totals G=17
};

const BASKETBALL_HALF_LINE_GROUPS = new Set([17]); // .5 lines only for totals

// ── TENNIS ───────────────────────────────────────────────────────────
const TENNIS_MARKET_NAMES = {
  1:  'Match Winner',  // T:1 Player1, T:3 Player2 (no draw)
  17: 'Total Games (O/U)',
  2:  'Game Handicap',
};

const TENNIS_TYPE_LABELS = {
  1: 'Player 1', 3: 'Player 2',   // Match Winner G=1
  9: 'Over', 10: 'Under',         // Totals G=17
  7: 'Player 1', 8: 'Player 2',   // Handicap G=2
};

const TENNIS_HALF_LINE_GROUPS = new Set([17, 2]); // .5 lines for totals & handicap

// ── TABLE TENNIS ─────────────────────────────────────────────────────
// Same structure as tennis
const TABLE_TENNIS_MARKET_NAMES = {
  1:  'Match Winner',
  17: 'Total Points (O/U)',
  2:  'Handicap',
  8:  'Double Chance',
};

const TABLE_TENNIS_TYPE_LABELS = {
  1: 'Player 1', 3: 'Player 2',   // Winner
  9: 'Over', 10: 'Under',         // Totals
  7: 'Player 1', 8: 'Player 2',   // Handicap
  4: '1X', 5: '12', 6: '2X',      // Double Chance
};

const TABLE_TENNIS_HALF_LINE_GROUPS = new Set([17, 2]);

// ── ICE HOCKEY ───────────────────────────────────────────────────────
const ICE_HOCKEY_MARKET_NAMES = {
  1:   '1X2 Regular Time',
  8:   'Double Chance',
  101: 'Team Wins (incl. OT)',
  19:  'Both Teams To Score',
};

const ICE_HOCKEY_TYPE_LABELS = {
  1: 'Home', 2: 'Draw', 3: 'Away',    // 1X2 G=1
  4: '1X', 5: '12', 6: '2X',          // Double Chance G=8
  401: 'Home Win', 402: 'Away Win',    // Team Wins G=101
  180: 'Yes', 181: 'No',              // BTTS G=19
};

// ── Helpers ───────────────────────────────────────────────────────────

const isHalfLine = (p) => {
  if (p === null || p === undefined) return true;
  const n = parseFloat(p);
  return !isNaN(n) && Math.abs(n % 1) === 0.5;
};

function decodeCorrectScore(p) {
  if (p === null || p === undefined) return '0-0';
  const home = Math.floor(p);
  const away = Math.round((p - home) * 1000);
  return `${home}-${away}`;
}

function buildVictoryMarginDisplay(T, P) {
  const margin = P !== null ? P : '?';
  if (T === 4850) return `Win by ${margin}`;
  if (T === 4851) return `Not win by ${margin}`;
  if (T === 4918) return `Win by ${margin}+`;
  if (T === 4919) return `Not win by ${margin}+`;
  return null;
}

// ── Main decode function ──────────────────────────────────────────────

function decodeGroups(groups, sportKey) {
  // Pick the right config per sport
  let MARKET_NAMES, TYPE_LABELS, HALF_LINE_GROUPS, skipG1;

  switch (sportKey) {
    case 'basketball':
      MARKET_NAMES = BASKETBALL_MARKET_NAMES;
      TYPE_LABELS = BASKETBALL_TYPE_LABELS;
      HALF_LINE_GROUPS = BASKETBALL_HALF_LINE_GROUPS;
      skipG1 = false; // basketball uses G=101 for winner, not G=1
      break;
    case 'tennis':
      MARKET_NAMES = TENNIS_MARKET_NAMES;
      TYPE_LABELS = TENNIS_TYPE_LABELS;
      HALF_LINE_GROUPS = TENNIS_HALF_LINE_GROUPS;
      skipG1 = false; // tennis uses G=1 for winner but T:1 and T:3 only
      break;
    case 'table-tennis':
      MARKET_NAMES = TABLE_TENNIS_MARKET_NAMES;
      TYPE_LABELS = TABLE_TENNIS_TYPE_LABELS;
      HALF_LINE_GROUPS = TABLE_TENNIS_HALF_LINE_GROUPS;
      skipG1 = false;
      break;
    case 'ice-hockey':
      MARKET_NAMES = ICE_HOCKEY_MARKET_NAMES;
      TYPE_LABELS = ICE_HOCKEY_TYPE_LABELS;
      HALF_LINE_GROUPS = new Set([]);
      skipG1 = false; // ice hockey uses G=1 for 1X2
      break;
    default: // soccer
      MARKET_NAMES = SOCCER_MARKET_NAMES;
      TYPE_LABELS = SOCCER_TYPE_LABELS;
      HALF_LINE_GROUPS = SOCCER_HALF_LINE_GROUPS;
      skipG1 = true; // soccer G=1 handled by mainMarkets
      break;
  }

  const normalizedMarkets = [];

  for (const group of groups) {
    const G = group.G;

    // Soccer skips G=1 (handled by mainMarkets)
    // Tennis/table-tennis: G=1 is the winner market, include it
    if (skipG1 && G === 1) continue;

    const marketName = MARKET_NAMES[G];
    if (!marketName) continue;

    const isTotal = HALF_LINE_GROUPS.has(G);
    const isScore = G === 136;     // soccer only
    const isVictory = G === 275;   // soccer only
    const isBTTS = G === 19;       // soccer + ice hockey

    const seenDisplays = new Set();
    const flatOdds = [];

    for (const outcomeList of (group.E || [])) {
      for (const e of outcomeList) {
        const T = e.T;
        const C = parseFloat(e.C);
        const P = e.P ?? null;

        if (!C || C <= 1.0) continue;
        if (isTotal && !isHalfLine(P)) continue;

        let display = '';

        if (isScore) {
          if (T === 3786) display = 'Other scores';
          else if (T === 731) display = decodeCorrectScore(P);
          else continue;
        } else if (isVictory) {
          const label = buildVictoryMarginDisplay(T, P);
          if (!label) continue;
          display = label;
        } else if (isBTTS) {
          if (!TYPE_LABELS[T]) continue;
          display = TYPE_LABELS[T];
        } else if (P !== null && TYPE_LABELS[T]) {
          display = `${TYPE_LABELS[T]} ${P}`;
        } else if (TYPE_LABELS[T]) {
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

    if (flatOdds.length > 0) {
      normalizedMarkets.push({ name: marketName, odds: flatOdds });
    }
  }

  return normalizedMarkets;
}

// ── getServerSideProps ────────────────────────────────────────────────

export async function getServerSideProps({ params }) {
  const { matchId } = params;

  try {
    const { data, error } = await supabase
      .from('xmatch_flat')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (error || !data) return { notFound: true };

    const groups = data.raw_json?.groups || [];
    const sportKey = data.sport_key || 'soccer';

    const deep_markets = decodeGroups(groups, sportKey);

    return {
      props: {
        match: JSON.parse(JSON.stringify({
          ...data,
          id: data.match_id,
          deep_markets,
        }))
      }
    };

  } catch (err) {
    console.error('Match detail error:', err);
    return { notFound: true };
  }
}
