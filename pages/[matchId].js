import { useRouter } from 'next/router';
import { useBets } from '../context/BetContext'; 
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import MobileFooter from '../components/MobileFooter'; // Imported your new component
import { ChevronLeft, Clock, Shield, Lock, X, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MatchDetail({ match }) {
  const router = useRouter();
  const { slipItems, setSlipItems } = useBets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getMatchStatus = () => {
    const startTime = match?.commence_time;
    if (!startTime) return { isLocked: true, isStartingSoon: false };
    
    const cleanTime = startTime.replace('+00', '').replace('Z', '').replace(' ', 'T');
    const matchDate = new Date(cleanTime);
    const timeDiff = matchDate.getTime() - currentTime.getTime();
    
    return { 
      isLocked: timeDiff <= 60000, 
      isStartingSoon: timeDiff > 60000 && timeDiff <= 300000 
    };
  };

  const { isLocked, isStartingSoon } = getMatchStatus();
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  const formatFixedTime = (dateString) => {
    if (!dateString) return 'TBD';
    const timeMatch = dateString.match(/(\d{2}:\d{2})/);
    return timeMatch ? timeMatch[0] : 'TBD';
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
      if (prev.find(item => item.id === uniqueId)) {
        return prev.filter(item => item.id !== uniqueId);
      }
      const otherMatches = prev.filter(item => item.matchId !== match.id);
      return [...otherMatches, {
        id: uniqueId,
        matchId: match.id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        startTime: match.commence_time,
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
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans selection:bg-[#10b981]/30">
      <Navbar />

      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-0 lg:gap-8 p-0 lg:p-8">
        
        <main className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-0">
            <div className="flex items-center gap-4 pt-4 lg:pt-0">
              <button onClick={() => router.back()} className="p-2.5 bg-[#1c2636] border border-white/5 rounded-xl transition-all group">
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <h1 className="text-[10px] font-bold capitalize italic tracking-widest text-[#10b981] opacity-80">
                  {match.league_name}
                </h1>
                <p className="text-xs font-bold text-slate-500 capitalize">Match Center</p>
              </div>
            </div>
            {isLocked && (
              <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                <Lock size={14} className="text-red-500" />
                <span className="text-[10px] font-bold capitalize italic text-red-500">Markets Closed</span>
              </div>
            )}
          </div>

          {/* Hero Section */}
          <div className={`relative overflow-hidden bg-[#111926] lg:rounded-3xl border-y lg:border border-white/5 min-h-[250px] flex items-center ${isLocked ? 'saturate-50' : ''}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            
            <div className="w-full flex justify-around items-center px-4 relative z-10">
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 mb-4 shadow-2xl">
                  <Shield size={32} className="text-[#10b981]" />
                </div>
                <h2 className="text-lg md:text-3xl font-black capitalize italic tracking-tighter leading-none">
                  {cleanName(match.home_team)}
                </h2>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-orange-500 text-4xl font-black italic tracking-tighter">VS</span>
                <div className={`px-4 py-1 rounded-full text-[11px] font-bold capitalize italic border ${isStartingSoon ? 'bg-orange-500 border-orange-400 text-white animate-pulse' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                  {formatFixedTime(match.commence_time)}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 mb-4 shadow-2xl">
                  <Shield size={32} className="text-[#10b981]" />
                </div>
                <h2 className="text-lg md:text-3xl font-black capitalize italic tracking-tighter leading-none text-white/90">
                  {cleanName(match.away_team)}
                </h2>
              </div>
            </div>
          </div>

          {/* Odds Markets */}
          <div className={`px-4 lg:px-0 grid grid-cols-1 gap-6 pb-32 ${isLocked ? 'opacity-60 grayscale-[0.3]' : ''}`}>
            <section>
              <h3 className="text-[11px] font-bold capitalize italic text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                Match Winner
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {mainMarkets.map((odd, idx) => {
                  const uniqueId = `${match.id}-1x2-${idx}`;
                  const isSelected = slipItems.find(item => item.id === uniqueId);
                  return (
                    <button 
                      key={idx}
                      disabled={isLocked}
                      onClick={() => toggleBet('Winner', odd.display, odd.val, uniqueId)}
                      className={`flex items-center justify-between h-14 px-6 rounded-2xl transition-all border-2 ${
                        isSelected 
                        ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a] shadow-lg shadow-[#10b981]/20 scale-[1.02]' 
                        : 'bg-[#111926] border-white/5 text-slate-300 active:scale-95'
                      }`}
                    >
                      <span className="text-[11px] font-bold capitalize italic truncate">{odd.display}</span>
                      <span className="text-base font-black italic">{odd.val || '—'}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {match.deep_markets?.map((market, mIdx) => (
              <section key={mIdx}>
                <h3 className="text-[11px] font-bold capitalize italic text-slate-500 mb-3 tracking-widest px-1">
                  {market.name}
                </h3>
                <div className={`grid gap-2 ${market.odds?.length > 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {market.odds?.map((odd, oIdx) => {
                    const uniqueId = `${match.id}-${market.name}-${oIdx}`;
                    const isSelected = slipItems.find(item => item.id === uniqueId);
                    const oddValue = odd.value || odd.odd_value;
                    return (
                      <button 
                        key={oIdx}
                        disabled={isLocked}
                        onClick={() => toggleBet(market.name, odd.display, oddValue, uniqueId)}
                        className={`flex items-center justify-between h-12 px-5 rounded-xl transition-all border ${
                          isSelected 
                          ? 'bg-[#10b981] border-[#10b981] text-[#0b0f1a]' 
                          : 'bg-[#1c2636]/50 border-white/5 text-slate-400'
                        }`}
                      >
                        <span className="text-[10px] font-bold capitalize italic truncate">{odd.display}</span>
                        <span className="text-xs font-black italic">{oddValue || '—'}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>

        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
          <div className="sticky top-8 h-[calc(100vh-100px)] flex flex-col">
            <Betslip items={slipItems} setItems={setSlipItems} />
          </div>
        </aside>
      </div>

      {/* Replaced manual nav with your MobileFooter component */}
      <MobileFooter 
        itemCount={slipItems.length}
        onOpenSidebar={() => router.push('/')} // Redirect to home to see A-Z list
        onOpenSlip={() => setIsMobileSlipOpen(true)}
        onGoHome={() => router.push('/')}
      />

      {/* Mobile Slip Overlay */}
      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[130] bg-[#0b0f1a] lg:hidden flex flex-col p-4 animate-in slide-in-from-bottom">
          <div className="flex justify-between items-center mb-6 shrink-0">
             <h3 className="font-black italic text-[#10b981] flex items-center gap-2 capitalize text-xl"><Trophy size={22}/> Betslip</h3>
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
  try {
    const { data, error } = await supabase
      .from('api_events')
      .select(`*, api_event_details ( markets )`)
      .eq('id', matchId)
      .single();

    if (error || !data) return { notFound: true };

    const details = data.api_event_details;
    let rawMarkets = [];
    
    if (Array.isArray(details) && details.length > 0) {
      rawMarkets = details[0]?.markets?.data || details[0]?.markets || [];
    } else if (details) {
      rawMarkets = details.markets?.data || details.markets || [];
    }

    return {
      props: {
        match: JSON.parse(JSON.stringify({ ...data, deep_markets: rawMarkets }))
      }
    };
  } catch (err) {
    return { notFound: true };
  }
}
