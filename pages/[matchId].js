import { useRouter } from 'next/router';
import { useBets } from '../context/BetContext'; 
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import { ChevronLeft, Clock, Shield } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function MatchDetail({ match }) {
  const router = useRouter();
  const { slipItems, setSlipItems } = useBets();

  // CLEANING HELPERS
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  /**
   * ZERO-CONVERSION TIME HELPER
   * Extracts HH:mm directly from the string to ignore browser timezone offsets.
   */
  const formatFixedTime = (dateString) => {
    if (!dateString) return 'TBD';
    const timeMatch = dateString.match(/(\d{2}:\d{2})/);
    return timeMatch ? timeMatch[0] : 'TBD';
  };

  if (router.isFallback || !match) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center font-black uppercase italic tracking-tighter">
        Loading Match...
      </div>
    );
  }

  const toggleBet = (marketName, selectionLabel, value, uniqueId) => {
    setSlipItems(prev => {
      if (prev.find(item => item.id === uniqueId)) {
        return prev.filter(item => item.id !== uniqueId);
      }
      const otherMatches = prev.filter(item => item.matchId !== match.id);
      return [...otherMatches, {
        id: uniqueId,
        matchId: match.id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        marketName: marketName,
        selection: selectionLabel,
        odds: value
      }];
    });
  };

  const mainMarkets = [
    { label: '1', display: 'Home', val: match.home_odds },
    { label: 'X', display: 'Draw', val: match.draw_odds },
    { label: '2', display: 'Away', val: match.away_odds }
  ];

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans">
      <Navbar />

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-0 lg:gap-6 p-0 lg:p-6">
        <main className="col-span-12 lg:col-span-9 space-y-4">
          
          <div className="flex items-center gap-4 px-4 py-2 lg:px-0">
            <Link href="/" className="p-2 bg-[#1c2636] border border-white/5 hover:bg-[#253247] rounded-md transition">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="text-sm font-black uppercase italic tracking-tighter text-[#10b981]">
              {match.league_name} <span className="text-slate-500 ml-2">/ Match Details</span>
            </h1>
          </div>

          {/* VS HEADER WITH CUSTOM BACKGROUND */}
          <div className="bg-[#111926] border-y lg:border border-white/5 lg:rounded-2xl overflow-hidden relative min-h-[220px] md:min-h-[280px] flex items-center">
            {/* Background Image Container */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
                style={{ backgroundImage: `url('/c7bf5e222eda7591bd59189676d3e7e7.webp')` }}
            />
            {/* Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111926] via-[#111926]/40 to-transparent pointer-events-none" />
            
            <div className="w-full flex justify-between items-center p-8 md:p-12 relative z-10">
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-[#1c2636]/80 backdrop-blur-sm rounded-full mb-4 flex items-center justify-center border border-white/10 shadow-2xl">
                  <Shield size={40} className="text-[#10b981] opacity-80" />
                </div>
                <h2 className="text-lg md:text-3xl font-black uppercase italic leading-tight tracking-tighter drop-shadow-md">
                    {cleanName(match.home_team)}
                </h2>
              </div>

              <div className="px-4 flex flex-col items-center">
                <div className="text-[#f59e0b] text-4xl md:text-6xl font-black italic mb-3 tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">VS</div>
                <div className="bg-[#10b981] px-4 py-1.5 rounded-full text-[11px] font-black uppercase italic text-white flex items-center gap-2 shadow-lg">
                   <Clock size={12} />
                   {formatFixedTime(match.commence_time)}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-[#1c2636]/80 backdrop-blur-sm rounded-full mb-4 flex items-center justify-center border border-white/10 shadow-2xl">
                  <Shield size={40} className="text-[#10b981] opacity-80" />
                </div>
                <h2 className="text-lg md:text-3xl font-black uppercase italic leading-tight tracking-tighter drop-shadow-md">
                    {cleanName(match.away_team)}
                </h2>
              </div>
            </div>
          </div>

          <div className="px-4 lg:px-0 space-y-4 pb-20">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black uppercase italic flex items-center gap-2 text-slate-400 tracking-widest">
                  Match Markets
                </h3>
            </div>

            {/* 1. Main 1X2 Market */}
            <div className="bg-[#1c2636] border border-white/5 rounded-xl p-5">
              <h4 className="text-[10px] font-black uppercase italic text-slate-500 mb-4 tracking-tighter">Match Result (1X2)</h4>
              <div className="grid grid-cols-3 gap-3">
                {mainMarkets.map((odd, idx) => {
                  const uniqueId = `${match.id}-main-1x2-${odd.label}`;
                  const isSelected = slipItems.find(item => item.id === uniqueId);
                  return (
                    <button 
                      key={idx}
                      onClick={() => toggleBet('1X2', odd.display, odd.val, uniqueId)}
                      className={`flex flex-col items-center justify-center p-4 h-16 rounded-md border transition-all duration-150 ${
                        isSelected ? 'bg-[#10b981] border-[#10b981] text-white' : 'bg-[#111926] border-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <span className={`text-[9px] font-black uppercase mb-1 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                        {odd.display}
                      </span>
                      <span className="font-black text-sm italic">
                        {odd.val ? parseFloat(odd.val).toFixed(2) : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Deep Markets */}
            {match.deep_markets && match.deep_markets.length > 0 ? (
              match.deep_markets.map((market, mIdx) => {
                const gridClass = market.odds?.length > 6 ? 'grid-cols-3 md:grid-cols-4' : 
                                 market.odds?.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

                return (
                  <div key={mIdx} className="bg-[#1c2636] border border-white/5 rounded-xl p-5">
                    <h4 className="text-[10px] font-black uppercase italic text-slate-500 mb-4 tracking-tighter">
                      {cleanName(market.name)}
                    </h4>
                    <div className={`grid gap-2 ${gridClass}`}>
                      {market.odds?.map((odd, oIdx) => {
                        const uniqueId = `${match.id}-${market.name}-${odd.display}-${oIdx}`;
                        const isSelected = slipItems.find(item => item.id === uniqueId);
                        const val = odd.odd_value || odd.value;

                        return (
                          <button 
                            key={oIdx}
                            onClick={() => toggleBet(market.name, odd.display, val, uniqueId)}
                            className={`flex flex-col items-center justify-center p-2 min-h-[50px] rounded-md border transition-all ${
                              isSelected ? 'bg-[#10b981] border-[#10b981] text-white shadow-lg' : 'bg-[#111926] border-white/5 text-slate-300 hover:border-white/20'
                            }`}
                          >
                            <span className={`text-[8px] font-black uppercase mb-1 leading-none ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                              {odd.display}
                            </span>
                            <span className="font-black text-xs italic">
                              {val ? parseFloat(val).toFixed(2) : '—'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl text-slate-700 font-black uppercase text-[10px] italic tracking-widest">
                Deep markets will be available shortly
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { matchId } = params;

  try {
    const { data, error } = await supabase
      .from('api_events')
      .select(`
        *,
        api_event_details (
          markets
        )
      `)
      .eq('id', matchId)
      .single();

    if (error || !data) return { notFound: true };

    const details = Array.isArray(data.api_event_details) 
      ? data.api_event_details[0] 
      : data.api_event_details;

    const rawMarkets = details?.markets?.data || details?.markets || [];

    const matchData = {
      ...data,
      deep_markets: rawMarkets
    };

    return {
      props: {
        match: JSON.parse(JSON.stringify(matchData))
      }
    };
  } catch (err) {
    return { notFound: true };
  }
}
