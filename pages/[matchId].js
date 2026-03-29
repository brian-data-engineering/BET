import { useRouter } from 'next/router';
import { useBets } from '../context/BetContext'; 
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import { ChevronLeft, Clock, Shield, Lock, X, Trophy, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MatchDetail({ match }) {
  const router = useRouter();
  const { slipItems, setSlipItems } = useBets();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isStarted = () => {
    const startTime = match?.commence_time;
    if (!startTime) return false;
    const cleanTime = startTime.replace('+00', '').replace('Z', '').replace(' ', 'T');
    const matchDate = new Date(cleanTime);
    return currentTime >= matchDate;
  };

  const locked = isStarted();
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

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
    if (locked) return;
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
    { label: '1', display: 'Home', val: match.home_odds },
    { label: 'X', display: 'Draw', val: match.draw_odds },
    { label: '2', display: 'Away', val: match.away_odds }
  ];

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans pb-20 lg:pb-0">
      <Navbar />

      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[110] bg-[#0b0f1a] lg:hidden animate-in slide-in-from-bottom duration-300">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#111926]">
            <h3 className="font-black uppercase italic text-[#10b981] flex items-center gap-2">
              <Trophy size={18}/> Your Betslip
            </h3>
            <button onClick={() => setIsMobileSlipOpen(false)} className="bg-white/5 p-2 rounded-full">
              <X size={20}/>
            </button>
          </div>
          <div className="p-4 h-[calc(100vh-80px)] overflow-y-auto">
            <Betslip items={slipItems} setItems={setSlipItems} />
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-0 lg:gap-6 p-0 lg:p-6">
        <main className="col-span-12 lg:col-span-9 space-y-4">
          
          <div className="flex items-center gap-4 px-4 py-2 lg:px-0">
            <button onClick={() => router.back()} className="p-2 bg-[#1c2636] border border-white/5 hover:bg-[#253247] rounded-md transition">
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-sm font-black uppercase italic tracking-tighter text-[#10b981]">
              {match.league_name} <span className="text-slate-500 ml-2">/ Match Details</span>
            </h1>
          </div>

          {locked && (
            <div className="mx-4 lg:mx-0 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="text-red-500" size={18} />
                <div>
                  <p className="text-xs font-black uppercase italic text-red-500">Betting Locked</p>
                  <p className="text-[10px] uppercase font-bold text-red-400/60">In Progress</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-red-500 text-white text-[10px] font-black italic rounded-md">LIVE</div>
            </div>
          )}

          <div className={`bg-[#111926] border-y lg:border border-white/5 lg:rounded-2xl overflow-hidden relative min-h-[220px] md:min-h-[280px] flex items-center ${locked ? 'grayscale-[0.5] opacity-80' : ''}`}>
            <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000')` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111926] to-transparent" />
            
            <div className="w-full flex justify-between items-center p-8 md:p-12 relative z-10">
              <div className="flex-1 flex flex-col items-center text-center">
                <Shield size={48} className="text-[#10b981] mb-2" />
                <h2 className="text-lg md:text-3xl font-black uppercase italic tracking-tighter">{cleanName(match.home_team)}</h2>
              </div>

              <div className="px-4 flex flex-col items-center">
                <div className="text-[#f59e0b] text-4xl font-black italic tracking-tighter">VS</div>
                <div className={`${locked ? 'bg-red-500' : 'bg-[#10b981]'} px-4 py-1.5 rounded-full text-[11px] font-black uppercase italic text-white flex items-center gap-2 mt-2`}>
                   <Clock size={12} /> {locked ? 'LIVE' : formatFixedTime(match.commence_time)}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center text-center">
                <Shield size={48} className="text-[#10b981] mb-2" />
                <h2 className="text-lg md:text-3xl font-black uppercase italic tracking-tighter">{cleanName(match.away_team)}</h2>
              </div>
            </div>
          </div>

          <div className={`px-4 lg:px-0 space-y-4 pb-10 ${locked ? 'pointer-events-none' : ''}`}>
            {/* 1X2 Market - REWRITTEN FOR PILLS */}
            <div className="bg-[#1c2636] border border-white/5 rounded-xl p-5">
              <h4 className="text-[10px] font-black uppercase italic text-slate-500 mb-4 tracking-tighter flex items-center gap-2">
                Match Result (1X2) {locked && <Lock size={10} />}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {mainMarkets.map((odd, idx) => {
                  const uniqueId = `${match.id}-main-1x2-${odd.label}`;
                  const isSelected = slipItems.find(item => item.id === uniqueId);
                  return (
                    <button 
                      key={idx}
                      disabled={locked}
                      onClick={() => toggleBet('1X2', odd.display, odd.val, uniqueId)}
                      className={`flex flex-col items-center justify-center h-10 sm:h-14 rounded-full border-none transition-all duration-200 px-1 ${
                        isSelected ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20' : 'bg-[#111926] text-slate-300'
                      }`}
                    >
                      <span className="text-[7px] sm:text-[9px] font-black uppercase mb-0.5 opacity-60 leading-none">{odd.display}</span>
                      <span className="font-black text-[11px] sm:text-sm italic tracking-tight">{odd.val ? parseFloat(odd.val).toFixed(2) : '—'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deep Markets - REWRITTEN FOR PILLS */}
            {match.deep_markets?.map((market, mIdx) => (
              <div key={mIdx} className="bg-[#1c2636] border border-white/5 rounded-xl p-5">
                <h4 className="text-[10px] font-black uppercase italic text-slate-500 mb-4 flex items-center gap-2">
                  {cleanName(market.name)} {locked && <Lock size={10} />}
                </h4>
                <div className={`grid gap-2 ${market.odds?.length > 3 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {market.odds?.map((odd, oIdx) => {
                    const uniqueId = `${match.id}-${market.name}-${odd.display}-${oIdx}`;
                    const isSelected = slipItems.find(item => item.id === uniqueId);
                    const val = odd.odd_value || odd.value;
                    return (
                      <button 
                        key={oIdx}
                        disabled={locked}
                        onClick={() => toggleBet(market.name, odd.display, val, uniqueId)}
                        className={`flex flex-col items-center justify-center h-10 sm:h-12 rounded-full border-none transition-all duration-200 px-1 ${
                          isSelected ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20' : 'bg-[#111926] text-slate-300'
                        }`}
                      >
                        <span className="text-[7px] sm:text-[8px] font-black uppercase mb-0.5 leading-none opacity-60 truncate w-full px-2">{odd.display}</span>
                        <span className="font-black text-[11px] sm:text-xs italic tracking-tight">{val ? parseFloat(val).toFixed(2) : '—'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block sticky top-6 h-fit">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#0b0f1a] border-t border-white/10 h-16 flex lg:hidden z-[90] items-center justify-around px-2">
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-400">
          <List size={20} />
          <span className="text-[8px] uppercase font-black italic">Leagues</span>
        </Link>
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-400">
          <LayoutGrid size={20} />
          <span className="text-[8px] uppercase font-black italic">Home</span>
        </Link>
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
